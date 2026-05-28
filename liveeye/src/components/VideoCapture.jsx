import { useRef, useState, useEffect } from "react";

import { WS_PROTO, WS_HOST, API, getToken } from "../api.js";
import { toast } from "../toast.js";
import { addDetection } from "../detectionStore.js";

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

const genStreamId = () => {
  const user = (() => { try { return JSON.parse(sessionStorage.getItem("liveeye_user")); } catch { return null; } })();
  const name = user?.nome || "anon";
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${name}-${rand}`;
};

const VideoCapture = ({ standalone = false }) => {
  const videoRef = useRef(null);
  const streamIdRef = useRef(genStreamId());
  const [streamId] = useState(streamIdRef.current);
  const [status, setStatus] = useState("A aguardar permissão da câmara...");
  const [active, setActive] = useState(false);
  const [connected, setConnected] = useState(false);
  const [detectReady, setDetectReady] = useState(false);
  const wsSignalRef = useRef(null);
  const pcRef = useRef(null);
  const sendChannelRef = useRef(null);
  const streamRef = useRef(null);
  const ultimasLocaisRef = useRef({}); // { [personId]: { lat, lon } }
  const wsDetectRef = useRef(null);
  const detectCanvasRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const activeRef = useRef(false);
  const audioCtxRef = useRef(null);
  const isMobile = useIsMobile();
  const [detectedList, setDetectedList] = useState([]); // { id, name, hora, count }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      setStatus("Câmara ativa. A ligar...");
      setActive(true);
      activeRef.current = true;
      // Desbloquear vibração e AudioContext dentro do gesto do utilizador
      try { navigator.vibrate(1); } catch {}
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const buf = audioCtxRef.current.createBuffer(1, 1, 22050);
        const src = audioCtxRef.current.createBufferSource();
        src.buffer = buf;
        src.connect(audioCtxRef.current.destination);
        src.start(0);
      } catch {}
      streamRef.current = stream;
      startWebRTC(stream);
      startDetection();
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

  const sendDetectionFrame = () => {
    const video = videoRef.current;
    const ws = wsDetectRef.current;
    if (!video || !ws || ws.readyState !== WebSocket.OPEN || !activeRef.current) return;
    if (video.videoWidth === 0) {
      setTimeout(sendDetectionFrame, 500);
      return;
    }
    const canvas = detectCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    ws.send(canvas.toDataURL("image/jpeg", 0.5));
  };

  const handleDetectAlert = (detections) => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }
      try {
        const ctx = audioCtxRef.current;
        if (ctx) {
          if (ctx.state === "suspended") ctx.resume();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        }
      } catch {}
      flashTorch(3, 200, 150);
      toast.success("⚠️ Pessoa desaparecida detetada!");

      const pessoas = detections
        .filter((det) => det.name && det.person_id)
        .map((det) => ({ id: det.person_id, name: det.name }));

      pessoas.forEach((p) => addDetection(p.id, p.name));

      if (pessoas.length === 0) return;

      // Notificar o Receiver via data channel
      try {
        const ch = sendChannelRef.current;
        if (ch && ch.readyState === "open") {
          ch.send(JSON.stringify({ type: "detetado", pessoas }));
        }
      } catch {}

      // Actualizar lista de deteções do emissor
      const agora2 = new Date();
      const horaStr = `${String(agora2.getHours()).padStart(2, "0")}:${String(agora2.getMinutes()).padStart(2, "0")}:${String(agora2.getSeconds()).padStart(2, "0")}`;
      setDetectedList((prev) => {
        const next = [...prev];
        pessoas.forEach((p) => {
          const idx = next.findIndex((x) => x.id === p.id);
          if (idx >= 0) {
            next[idx] = { ...next[idx], count: next[idx].count + 1, hora: horaStr };
          } else {
            next.unshift({ id: p.id, name: p.name, hora: horaStr, count: 1 });
          }
        });
        return next;
      });

      const agora = new Date();
      const data = `${String(agora.getDate()).padStart(2, "0")}/${String(agora.getMonth() + 1).padStart(2, "0")}/${agora.getFullYear()}`;
      const hora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          pessoas.forEach((pessoa) => {
            if (pessoa.id == null) return;
            const ultima = ultimasLocaisRef.current[pessoa.id];
            if (ultima && haversineMeters(ultima.lat, ultima.lon, lat, lon) <= 150) return;
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
    } catch (e) {
      console.error("[handleDetectAlert] Erro:", e);
    }
  };

  const startDetection = () => {
    const token = getToken();
    const ws = new WebSocket(`${WS_PROTO}${WS_HOST}/ws`, [token]);
    wsDetectRef.current = ws;

    ws.onopen = () => {
      console.log("[detect-ws] Ligado");
      setDetectReady(true);
      toast.success("Detecção automática ativa");
      sendDetectionFrame();
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.dispararAlerta) {
        handleDetectAlert(data.detections || []);
      }
      if (wsDetectRef.current?.readyState === WebSocket.OPEN && activeRef.current) {
        setTimeout(sendDetectionFrame, 1000);
      }
    };

    ws.onclose = () => {
      console.log("[detect-ws] Fechado");
      setDetectReady(false);
      if (activeRef.current) {
        setTimeout(startDetection, 3000);
      }
    };

    ws.onerror = () => {};
  };

  const startWebRTC = (stream) => {
    const cleanup = () => {
      setConnected(false);
      if (wsSignalRef.current) {
        wsSignalRef.current.onopen = null;
        wsSignalRef.current.onmessage = null;
        wsSignalRef.current.onclose = null;
        wsSignalRef.current.onerror = null;
        wsSignalRef.current.close();
        wsSignalRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.onicecandidate = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
        pcRef.current = null;
      }
      sendChannelRef.current = null;
    };

    const scheduleReconnect = () => {
      if (!activeRef.current) return;
      clearTimeout(reconnectTimerRef.current);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current += 1;
      console.log(`VideoCapture a religar em ${delay}ms (tentativa ${reconnectAttemptsRef.current})`);
      reconnectTimerRef.current = setTimeout(() => startWebRTC(stream), delay);
    };

    cleanup();

    const token = getToken();
    const wsSignal = new WebSocket(WS_PROTO + WS_HOST + "/ws-signal", [token]);
    wsSignalRef.current = wsSignal;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;

    const onDataChannelMessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.type === "detetado" && Array.isArray(parsed.pessoas)) {
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
          flashTorch(3, 200, 150);
          toast.success("⚠️ Pessoa detetada (data channel)");
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
                if (ultima && haversineMeters(ultima.lat, ultima.lon, lat, lon) <= 150) return;
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

    const sendChannel = pc.createDataChannel("alertas");
    sendChannelRef.current = sendChannel;
    sendChannel.onmessage = onDataChannelMessage;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate && wsSignal.readyState === WebSocket.OPEN) {
        const sid = streamIdRef.current;
        wsSignal.send(JSON.stringify({ type: "ice", streamId: sid, candidate: event.candidate }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        console.log("VideoCapture WebRTC estado:", pc.connectionState, "- a religar...");
        scheduleReconnect();
      }
    };

    const sendOffer = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sid = streamIdRef.current;
      wsSignal.send(JSON.stringify({ type: "offer", streamId: sid, offer }));
      setStatus("À espera do receiver...");
    };

    wsSignal.onopen = () => {
      reconnectAttemptsRef.current = 0;
      const sid = streamIdRef.current;
      wsSignal.send(JSON.stringify({ type: "register", role: "emitter", streamId: sid }));
      sendOffer();
    };

    wsSignal.onclose = () => {
      console.log("VideoCapture Signal WS fechado, a religar...");
      scheduleReconnect();
    };
    wsSignal.onerror = () => {};

    wsSignal.onmessage = async (message) => {
      const data = JSON.parse(message.data);

      if (data.type === "receiver_joined") {
        // Receiver entrou depois de a offer já ter sido enviada — reenviar offer
        console.log("VideoCapture: receiver_joined — a reenviar offer");
        if (pcRef.current) {
          pcRef.current.onicecandidate = null;
          pcRef.current.onconnectionstatechange = null;
          pcRef.current.close();
        }
        const newPc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        pcRef.current = newPc;
        const newSendChannel = newPc.createDataChannel("alertas");
        sendChannelRef.current = newSendChannel;
        // Reutilizar o mesmo handler de mensagens do canal de dados
        newSendChannel.onmessage = onDataChannelMessage;
        stream.getTracks().forEach((track) => newPc.addTrack(track, stream));
        newPc.onicecandidate = (event) => {
          if (event.candidate && wsSignal.readyState === WebSocket.OPEN) {
            wsSignal.send(JSON.stringify({ type: "ice", streamId: streamIdRef.current, candidate: event.candidate }));
          }
        };
        newPc.onconnectionstatechange = () => {
          if (newPc.connectionState === "failed" || newPc.connectionState === "disconnected") {
            scheduleReconnect();
          }
        };
        const offer = await newPc.createOffer();
        await newPc.setLocalDescription(offer);
        wsSignal.send(JSON.stringify({ type: "offer", streamId: streamIdRef.current, offer }));
        return;
      }

      if (data.type === "answer") {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setStatus("Ligado ao receiver!");
        setConnected(true);
      }
      if (data.type === "ice")
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    };
  };

  useEffect(() => {
    return () => {
      activeRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      if (wsSignalRef.current) {
        wsSignalRef.current.onopen = null;
        wsSignalRef.current.onmessage = null;
        wsSignalRef.current.onclose = null;
        wsSignalRef.current.onerror = null;
        wsSignalRef.current.close();
        wsSignalRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.onicecandidate = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
        pcRef.current = null;
      }
      sendChannelRef.current = null;
      streamRef.current = null;
      setDetectedList([]);
      if (wsDetectRef.current) {
        wsDetectRef.current.onopen = null;
        wsDetectRef.current.onmessage = null;
        wsDetectRef.current.onclose = null;
        wsDetectRef.current.onerror = null;
        wsDetectRef.current.close();
        wsDetectRef.current = null;
      }
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
        ["Detecção", detectReady ? "Ativa" : "Inativa",  detectReady],
        ["Stream",  connected ? "A enviar": "Parado",    connected],
        ["Código",  streamId,  true],
      ].map(([label, val, ok]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{label}</span>
          <span style={{ fontSize: "11px", fontWeight: 500, fontFamily: "var(--font-mono)", color: ok ? "var(--success)" : "var(--text-muted)" }}>{val}</span>
        </div>
      ))}
    </InfoCard>
  );

  const detectionListCard = (
    <InfoCard title={`Deteções esta sessão${detectedList.length > 0 ? ` (${detectedList.length})` : ""}`}>
      {detectedList.length === 0 ? (
        <div style={{ textAlign: "center", padding: "14px 0" }}>
          <div style={{ fontSize: "20px", marginBottom: "6px", opacity: 0.4 }}>◎</div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
            Nenhuma pessoa detetada
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", maxHeight: "260px", overflowY: "auto" }}>
          {detectedList.map((p) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "var(--bg-raised)", borderRadius: "7px",
              padding: "8px 10px", border: "1px solid var(--border)",
              animation: "fadeInRow 0.2s ease",
            }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: "var(--accent-light)", border: "1px solid var(--accent-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent)", fontFamily: "var(--font-sans)" }}>
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: "12px", fontWeight: 500,
                  color: "var(--text-primary)", fontFamily: "var(--font-sans)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{p.name}</p>
                <p style={{ margin: 0, fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {p.hora}
                </p>
              </div>
              {p.count > 1 && (
                <span style={{
                  fontSize: "10px", fontFamily: "var(--font-mono)",
                  background: "var(--accent-mid)", color: "var(--accent)",
                  padding: "2px 7px", borderRadius: "99px", flexShrink: 0,
                }}>×{p.count}</span>
              )}
            </div>
          ))}
        </div>
      )}
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
        @keyframes fadeInRow {
          from { opacity: 0; transform: translateX(6px); }
          to   { opacity: 1; transform: translateX(0); }
        }

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
          width: 260px; display: flex; flex-direction: column; gap: 0; flex-shrink: 0;
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
              <canvas ref={detectCanvasRef} style={{ display: "none" }} />

              {/* Mobile detection list overlay */}
              {isMobile && active && detectedList.length > 0 && (
                <div style={{
                  position: "absolute", top: "10px", right: "10px", zIndex: 20,
                  width: "170px", maxHeight: "220px",
                  background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
                  borderRadius: "10px", overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}>
                  <div style={{
                    padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", gap: "6px",
                  }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#e74c3c", boxShadow: "0 0 6px rgba(231,76,60,0.7)" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Detetadas ({detectedList.length})
                    </span>
                  </div>
                  <div style={{ overflowY: "auto", maxHeight: "170px", padding: "4px 0" }}>
                    {detectedList.map((p) => (
                      <div key={p.id} style={{
                        display: "flex", alignItems: "center", gap: "7px",
                        padding: "5px 10px",
                      }}>
                        <div style={{
                          width: "22px", height: "22px", borderRadius: "50%",
                          background: "rgba(79,110,247,0.3)", border: "1px solid rgba(79,110,247,0.5)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <span style={{ fontSize: "9px", fontWeight: 600, color: "#7fa8ff", fontFamily: "var(--font-sans)" }}>
                            {p.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "11px", fontWeight: 500, color: "#fff", fontFamily: "var(--font-sans)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.name}
                          </p>
                          <p style={{ margin: 0, fontSize: "9px", color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-mono)" }}>
                            {p.hora}
                          </p>
                        </div>
                        {p.count > 1 && (
                          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "rgba(79,110,247,0.9)", background: "rgba(79,110,247,0.15)", padding: "1px 5px", borderRadius: "99px", flexShrink: 0 }}>
                            ×{p.count}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stream code badge (sempre visível quando ativo) */}
              {active && (
                <div style={{
                  position: "absolute", top: "10px", left: "10px", zIndex: 20,
                  background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
                  borderRadius: "7px", padding: "6px 10px",
                  display: "flex", alignItems: "center", gap: "6px",
                }}>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>📡</span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#fff", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>{streamId}</span>
                </div>
              )}

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
                  <div style={{
                    background: "rgba(247,246,243,0.9)", backdropFilter: "blur(8px)",
                    border: "1px solid var(--border)", borderRadius: "99px",
                    padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: "11px",
                    color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "5px",
                  }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: detectReady ? "var(--success)" : "var(--warning)" }} />
                    <span>{detectReady ? "Detecção ativa" : "Detecção inativa"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop side panel */}
          <div className="vc-side-panel">
            {statusCard}
            {actionCard}
            {detectionListCard}
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