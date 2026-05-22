import { useRef, useState, useEffect } from "react";

import { WS_PROTO, WS_HOST, API } from "../api.js";
import { toast } from "../toast.js";

// Detecta se está a ser usado standalone (Home.jsx) ou dentro do Dashboard
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
};

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (a) => (a * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const VideoCapture = ({ standalone = false }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("A aguardar permissão da câmara...");
  const [active, setActive] = useState(false);
  const [connected, setConnected] = useState(false);
  const wsSignalRef = useRef(null);
  const pcRef = useRef(null);
  const sendChannelRef = useRef(null);
  const ultimasLocaisRef = useRef({}); // { [personId]: { lat, lon } }
  const isMobile = useIsMobile();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      setStatus("Câmara ativa. A ligar...");
      setActive(true);
      startWebRTC(stream);
    } catch (err) {
      setStatus("Erro ao aceder à câmara: " + err.message);
    }
  };

  // Faz um sinal de luz com a lanterna: liga/desliga N vezes
  const flashTorch = async (flashes = 3, onMs = 200, offMs = 150) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const track = stream.getVideoTracks()[0];
      if (!track || typeof track.applyConstraints !== "function") return;

      const capabilities = track.getCapabilities?.() ?? {};
      if (!capabilities.torch) { track.stop(); return; }

      for (let i = 0; i < flashes; i++) {
        await track.applyConstraints({ advanced: [{ torch: true }] });
        await new Promise((r) => setTimeout(r, onMs));
        await track.applyConstraints({ advanced: [{ torch: false }] });
        if (i < flashes - 1) await new Promise((r) => setTimeout(r, offMs));
      }
      track.stop();
    } catch {
      // Lanterna não disponível ou permissão negada — silencioso
    }
  };

  const startWebRTC = async (stream) => {
    const wsSignal = new WebSocket(WS_PROTO + WS_HOST + "/ws-signal");
    wsSignalRef.current = wsSignal;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;

    const sendChannel = pc.createDataChannel("alertas");
    sendChannelRef.current = sendChannel;
    sendChannel.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.type === "detetado" && Array.isArray(parsed.pessoas)) {
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
          flashTorch(3, 200, 150);
          const agora = new Date();
          const data = `${String(agora.getDate()).padStart(2, "0")}/${String(agora.getMonth() + 1).padStart(2, "0")}/${agora.getFullYear()}`;
          const hora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lon = pos.coords.longitude;
              parsed.pessoas.forEach((pessoa) => {
                if (pessoa.id == null) return;
                const ultima = ultimasLocaisRef.current[pessoa.id];
                if (ultima && haversineMeters(ultima.lat, ultima.lon, lat, lon) <= 300) return;
                fetch(`${API}/pessoas/${pessoa.id}/localizacao?lat=${lat}&lon=${lon}&data=${encodeURIComponent(data)}&hora=${encodeURIComponent(hora)}`, { method: "POST" })
                  .then((r) => {
                    if (r.ok) {
                      ultimasLocaisRef.current[pessoa.id] = { lat, lon };
                      toast.success(`📍 ${pessoa.name} — localização registada`);
                    }
                  })
                  .catch(() => {});
              });
            },
            () => {},
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          );
          return;
        }
      } catch {}
      if (e.data === "DETETADO") {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        flashTorch(3, 200, 150);
      }
    };

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate)
        wsSignal.send(JSON.stringify({ type: "ice", candidate: event.candidate }));
    };

    const sendOffer = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      wsSignal.send(JSON.stringify({ type: "offer", offer }));
      setStatus("À espera do receiver...");
    };

    if (wsSignal.readyState === WebSocket.OPEN) sendOffer();
    else wsSignal.onopen = sendOffer;

    wsSignal.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      if (data.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        setStatus("Ligado ao receiver!");
        setConnected(true);
      }
      if (data.type === "ice")
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    };
  };

  useEffect(() => {
    return () => {
      wsSignalRef.current?.close();
      pcRef.current?.close();
    };
  }, []);

  const InfoCard = ({ children, title }) => (
    <div style={{
      borderRadius: "10px", padding: "14px 16px",
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      boxShadow: "var(--shadow-sm)", marginBottom: "10px",
    }}>
      {title && (
        <p style={{
          fontSize: "10px", fontWeight: 500, marginBottom: "10px",
          letterSpacing: "0.09em", textTransform: "uppercase",
          color: "var(--text-muted)", fontFamily: "var(--font-mono)",
        }}>{title}</p>
      )}
      {children}
    </div>
  );

  const statusCard = (
    <InfoCard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>WebRTC</span>
          <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "var(--font-mono)", color: connected ? "var(--success)" : "var(--text-muted)" }}>
            {connected ? "Ligado" : "—"}
          </span>
        </div>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>Câmara</span>
          <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "var(--font-mono)", color: active ? "var(--success)" : "var(--text-muted)" }}>
            {active ? "Ativa" : "—"}
          </span>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ position: "relative", width: "8px", height: "8px", margin: "0 auto 4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: connected ? "var(--success)" : active ? "var(--warning)" : "var(--accent)" }} />
            {(active || connected) && (
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: connected ? "var(--success)" : "var(--warning)", animation: "pulse-ring 1.5s ease-out infinite" }} />
            )}
          </div>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
            {connected ? "Ligado" : active ? "A ligar..." : "Inativo"}
          </span>
        </div>
      </div>
    </InfoCard>
  );

  const systemInfo = (
    <InfoCard title="Sistema">
      {[
        ["WebRTC",  connected ? "Ligado"  : "Desligado", connected],
        ["Câmara",  active    ? "Ativa"   : "Inativa",   active],
        ["Stream",  connected ? "A enviar": "Parado",    connected],
      ].map(([label, val, ok]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{label}</span>
          <span style={{ fontSize: "11px", fontWeight: 500, fontFamily: "var(--font-mono)", color: ok ? "var(--success)" : "var(--text-muted)" }}>{val}</span>
        </div>
      ))}
    </InfoCard>
  );

  const actionCard = (
    <InfoCard title="Controlo">
      {!active ? (
        <button onClick={startCamera} style={{
          background: "var(--accent)", border: "none", borderRadius: "7px",
          color: "#fff", padding: "10px 16px", fontSize: "12px",
          fontWeight: 500, fontFamily: "var(--font-mono)",
          cursor: "pointer", letterSpacing: "0.04em",
          width: "100%",
        }}>
          Ligar Sistema
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0, background: connected ? "var(--success)" : "var(--warning)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-secondary)" }}>
            {connected ? "A transmitir para o receiver" : "A estabelecer ligação..."}
          </span>
        </div>
      )}
    </InfoCard>
  );

  // Altura do vídeo adapta-se ao contexto:
  // - standalone (Home.jsx): ocupa o ecrã todo (sem header/bottom nav)
  // - dentro do Dashboard mobile: desconta header (56px) + bottom nav (64px)
  const mobileVideoHeight = standalone
    ? "100svh"
    : "calc(100svh - 130px)";

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes scan-line {
          0%   { top: 0%; }
          100% { top: 100%; }
        }
        .scan-line { animation: scan-line 3s linear infinite; }

        /* Desktop layout */
        .vc-layout {
          display: flex; gap: 20px; padding: 20px; flex: 1;
        }
        .vc-video-area {
          display: flex; flex-direction: column; align-items: center; gap: 12px; flex: 0 0 auto;
        }
        .vc-video-box {
          position: relative; border-radius: 12px; overflow: hidden;
          background: var(--bg-raised); border: 1px solid var(--border);
          box-shadow: var(--shadow-md); aspect-ratio: 9/16;
          height: calc(100svh - 140px); width: auto;
        }
        .vc-side-panel {
          width: 240px; display: flex; flex-direction: column; gap: 0; flex-shrink: 0;
        }

        /* Mobile layout */
        @media (max-width: 768px) {
          .vc-layout {
            flex-direction: column; padding: 0; gap: 0;
          }
          .vc-video-area {
            width: 100%; flex: none; gap: 0;
          }
          .vc-side-panel { display: none; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", background: "var(--bg)", fontFamily: "var(--font-sans)", height: "100%" }}>

        <main className="vc-layout">

          {/* Video area */}
          <div className="vc-video-area">
            <div
              className="vc-video-box"
              style={isMobile ? {
                height: mobileVideoHeight,
                width: "100%",
                borderRadius: 0,
                aspectRatio: "unset",
              } : {}}
            >

              {/* Scan line */}
              {active && (
                <div className="scan-line" style={{
                  position: "absolute", left: 0, width: "100%", height: "1px",
                  background: "linear-gradient(90deg, transparent, rgba(192,57,43,0.3), transparent)",
                  pointerEvents: "none", zIndex: 10,
                }} />
              )}

              {/* Corner decorations */}
              {[
                { top: 0,    left: 0,    borderTop: true,    borderLeft: true  },
                { top: 0,    right: 0,   borderTop: true,    borderRight: true },
                { bottom: 0, left: 0,    borderBottom: true, borderLeft: true  },
                { bottom: 0, right: 0,   borderBottom: true, borderRight: true },
              ].map((pos, i) => (
                <div key={i} style={{
                  position: "absolute", width: "18px", height: "18px", zIndex: 20, margin: "7px",
                  ...pos,
                  borderTop:    pos.borderTop    ? "1.5px solid var(--accent-border)" : "none",
                  borderBottom: pos.borderBottom ? "1.5px solid var(--accent-border)" : "none",
                  borderLeft:   pos.borderLeft   ? "1.5px solid var(--accent-border)" : "none",
                  borderRight:  pos.borderRight  ? "1.5px solid var(--accent-border)" : "none",
                }} />
              ))}

              {/* Waiting state */}
              {!active && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "10px", zIndex: 10,
                }}>
                  <div style={{ fontSize: "32px", color: "var(--border-strong)" }}>◎</div>
                  <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                    Câmara inativa
                  </p>
                </div>
              )}

              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: "100%", height: "100%", objectFit: "cover", display: active ? "block" : "none" }} />

              {/* Mobile status overlay (quando ativo) */}
              {isMobile && active && (
                <div style={{
                  position: "absolute", bottom: "10px", left: "10px",
                  display: "flex", gap: "6px", zIndex: 20,
                }}>
                  <div style={{
                    background: "rgba(247,246,243,0.9)", backdropFilter: "blur(8px)",
                    border: "1px solid var(--border)", borderRadius: "99px",
                    padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: "11px",
                    color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "5px",
                  }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: connected ? "var(--success)" : "var(--warning)" }} />
                    <span>{connected ? "A transmitir" : "A ligar..."}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop side panel */}
          <div className="vc-side-panel">
            {statusCard}
            {actionCard}
            {systemInfo}
          </div>

        </main>

        {/* Botão mobile — renderizado via React state, não via CSS display */}
        {isMobile && !active && (
          <button
            onClick={startCamera}
            style={{
              position: "fixed",
              bottom: standalone ? "24px" : "80px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 120,
              whiteSpace: "nowrap",
              background: "var(--accent)",
              border: "none",
              borderRadius: "99px",
              color: "#fff",
              padding: "12px 28px",
              fontSize: "13px",
              fontWeight: 500,
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(192,57,43,0.35)",
            }}
          >
            Ligar Sistema
          </button>
        )}
      </div>
    </>
  );
};

export default VideoCapture;