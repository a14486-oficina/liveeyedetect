import { useEffect, useRef, useState } from "react";

const Receiver = () => {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const captureRef = useRef(null);
  const wsSignalRef = useRef(null);
  const wsYoloRef = useRef(null);
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const isWaitingRef = useRef(false);

  const [status, setStatus] = useState("A aguardar ligação...");
  const [connected, setConnected] = useState(false);
  const [alert, setAlert] = useState(false);
  const [detections, setDetections] = useState([]);
  const [fps, setFps] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const fpsCountRef = useRef(0);

  // FPS counter
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Alert flash
  useEffect(() => {
    if (alert) {
      const t = setTimeout(() => setAlert(false), 2000);
      return () => clearTimeout(t);
    }
  }, [alert]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    const capture = captureRef.current;
    const ctx = canvas.getContext("2d");
    const captureCtx = capture.getContext("2d");

    const wsSignal = new WebSocket(
      (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws-signal"
    );
    wsSignalRef.current = wsSignal;

    const wsYolo = new WebSocket("ws://localhost:8000/ws");
    wsYoloRef.current = wsYolo;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    pc.ondatachannel = (event) => {
      dataChannelRef.current = event.channel;
      dataChannelRef.current.onopen = () => console.log("Data channel aberto");
    };

    pc.ontrack = (event) => {
      video.srcObject = event.streams[0];
      video.onloadedmetadata = () => {
        video.play();
        setConnected(true);
        setStatus("Vídeo recebido");
        setTimeout(sendFrame, 1000);
      };
    };

    pc.onicecandidate = (event) => {
      if (event.candidate)
        wsSignal.send(JSON.stringify({ type: "ice", candidate: event.candidate }));
    };

    wsSignal.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      if (data.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        wsSignal.send(JSON.stringify({ type: "answer", answer }));
        setStatus("Ligação estabelecida");
      } else if (data.type === "ice") {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    const resizeCanvas = () => {
      const rect = video.getBoundingClientRect();
      const containerW = rect.width;
      const containerH = rect.height;
      const videoW = video.videoWidth || 1;
      const videoH = video.videoHeight || 1;
      const videoAspect = videoW / videoH;
      const containerAspect = containerW / containerH;

      let renderW, renderH, offsetX, offsetY;
      if (videoAspect < containerAspect) {
        renderH = containerH;
        renderW = containerH * videoAspect;
        offsetX = (containerW - renderW) / 2;
        offsetY = 0;
      } else {
        renderW = containerW;
        renderH = containerW / videoAspect;
        offsetX = 0;
        offsetY = (containerH - renderH) / 2;
      }

      canvas.width = containerW;
      canvas.height = containerH;
      canvas.style.width = containerW + "px";
      canvas.style.height = containerH + "px";
      canvas._offsetX = offsetX;
      canvas._offsetY = offsetY;
      canvas._scaleX = renderW / videoW;
      canvas._scaleY = renderH / videoH;
    };

    video.addEventListener("loadeddata", resizeCanvas);
    video.addEventListener("loadedmetadata", resizeCanvas);
    window.addEventListener("resize", resizeCanvas);

    const sendFrame = () => {
      if (video.videoWidth === 0 || wsYolo.readyState !== WebSocket.OPEN || isWaitingRef.current) return;
      isWaitingRef.current = true;
      capture.width = video.videoWidth;
      capture.height = video.videoHeight;
      captureCtx.drawImage(video, 0, 0);
      const dataURL = capture.toDataURL("image/jpeg", 0.5);
      wsYolo.send(dataURL);
    };

    wsYolo.onopen  = () => console.log("YOLO WebSocket ligado");
    wsYolo.onclose = () => console.log("YOLO WebSocket fechado");
    wsYolo.onerror = () => setStatus("Erro WebSocket YOLO");

    wsYolo.onmessage = (event) => {
      isWaitingRef.current = false;
      fpsCountRef.current += 1;

      const resposta = JSON.parse(event.data);
      const dets = resposta.detections || [];
      const alertaConfirmado = resposta.dispararAlerta;

      if (alertaConfirmado) {
        setAlert(true);
        if (dataChannelRef.current?.readyState === "open")
          dataChannelRef.current.send("DETETADO");
      }

      setDetections(dets);

      const scaleX = canvas._scaleX ?? (canvas.width / (video.videoWidth || 1));
      const scaleY = canvas._scaleY ?? (canvas.height / (video.videoHeight || 1));
      const offX   = canvas._offsetX ?? 0;
      const offY   = canvas._offsetY ?? 0;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      dets.forEach((det) => {
        const x = det.x * scaleX + offX;
        const y = det.y * scaleY + offY;
        const w = det.w * scaleX;
        const h = det.h * scaleY;
        const isKnown = !!det.name;

        ctx.strokeStyle = isKnown ? "#2d7a4f" : "#c0392b";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        const cs = 12;
        ctx.lineWidth = 3;
        [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy], i) => {
          ctx.beginPath();
          ctx.moveTo(cx + (i % 2 === 0 ? cs : -cs), cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy + (i < 2 ? cs : -cs));
          ctx.stroke();
        });

        if (det.name) {
          ctx.fillStyle = isKnown ? "rgba(45,122,79,0.9)" : "rgba(192,57,43,0.9)";
          const label = det.name;
          ctx.font = "500 12px 'DM Mono', monospace";
          const tw = ctx.measureText(label).width;
          ctx.fillRect(x, y - 22, tw + 12, 22);
          ctx.fillStyle = "#fff";
          ctx.fillText(label, x + 6, y - 6);
        }
      });

      setTimeout(sendFrame, 50);
    };

    video.addEventListener("play", () => { sendFrame(); });

    return () => {
      wsSignal.close();
      wsYolo.close();
      pc.close();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const InfoCard = ({ children, title }) => (
    <div style={{
      borderRadius: "10px", padding: "14px 16px",
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      boxShadow: "var(--shadow-sm)", marginBottom: "10px",
    }}>
      {title && <p style={{
        fontSize: "10px", fontWeight: 500, marginBottom: "10px",
        letterSpacing: "0.09em", textTransform: "uppercase",
        color: "var(--text-muted)", fontFamily: "var(--font-mono)",
      }}>{title}</p>}
      {children}
    </div>
  );

  const statsBar = (
    <InfoCard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>FPS</span>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{fps}</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>Deteções</span>
          <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "var(--font-mono)", color: detections.length > 0 ? "var(--accent)" : "var(--text-primary)" }}>{detections.length}</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ position: "relative", width: "8px", height: "8px", margin: "0 auto 4px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: connected ? "var(--success)" : "var(--accent)" }} />
            {connected && <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--success)", animation: "pulse-ring 1.5s ease-out infinite" }} />}
          </div>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{connected ? "Ligado" : status}</span>
        </div>
      </div>
    </InfoCard>
  );

  const detectionsList = (
    <InfoCard title="Deteções ativas">
      {detections.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>Nenhuma deteção</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {detections.map((det, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "8px",
              borderRadius: "7px", padding: "7px 10px",
              background: det.name ? "var(--success-light)" : "var(--accent-light)",
              border: `1px solid ${det.name ? "var(--success-border)" : "var(--accent-border)"}`,
            }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0, background: det.name ? "var(--success)" : "var(--accent)" }} />
              <span style={{ fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: det.name ? "var(--success)" : "var(--accent)", fontFamily: "var(--font-mono)" }}>
                {det.name || `Pessoa #${i + 1}`}
              </span>
              <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {Math.round(det.conf * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </InfoCard>
  );

  const systemInfo = (
    <InfoCard title="Sistema">
      {[
        ["WebRTC",  connected ? "Ligado" : "Desligado", connected],
        ["YOLO",    fps > 0   ? "Ativo"  : "Inativo",  fps > 0],
        ["Alertas", alert     ? "ATIVO"  : "Normal",   alert],
      ].map(([label, val, ok]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{label}</span>
          <span style={{ fontSize: "11px", fontWeight: 500, fontFamily: "var(--font-mono)", color: ok ? "var(--success)" : "var(--text-muted)" }}>{val}</span>
        </div>
      ))}
    </InfoCard>
  );

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes alert-flash {
          0%, 100% { opacity: 0; }
          50%       { opacity: 1; }
        }
        @keyframes scan-line {
          0%   { top: 0%; }
          100% { top: 100%; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .scan-line   { animation: scan-line 3s linear infinite; }
        .alert-flash { animation: alert-flash 0.4s ease-in-out 3; }

        /* Desktop layout */
        .receiver-layout {
          display: flex; gap: 20px; padding: 20px; flex: 1;
        }
        .receiver-video-area {
          display: flex; flex-direction: column; align-items: center; gap: 12px; flex: 0 0 auto;
        }
        .receiver-video-box {
          position: relative; border-radius: 12px; overflow: hidden;
          background: var(--bg-raised); border: 1px solid var(--border);
          box-shadow: var(--shadow-md); aspect-ratio: 9/16;
          height: calc(100svh - 140px); width: auto;
        }
        .receiver-side-panel {
          width: 240px; display: flex; flex-direction: column; gap: 0px; flex-shrink: 0;
        }
        .receiver-fab { display: none; }
        .receiver-bottom-sheet { display: none; }
        .receiver-mobile-stats { display: none; }

        /* Mobile layout */
        @media (max-width: 768px) {
          .receiver-layout {
            flex-direction: column; padding: 0; gap: 0;
          }
          .receiver-video-area {
            width: 100%; flex: none; gap: 0;
          }
          .receiver-video-box {
            height: calc(100svh - 130px) !important;
            width: 100% !important; border-radius: 0;
            aspect-ratio: unset !important;
          }
          .receiver-side-panel { display: none; }
          .receiver-fab {
            display: flex; position: fixed; bottom: 80px; right: 16px;
            width: 52px; height: 52px; border-radius: 50%;
            background: var(--accent); border: none;
            box-shadow: 0 4px 16px rgba(192,57,43,0.35);
            align-items: center; justify-content: center;
            font-size: 18px; color: #fff; cursor: pointer; z-index: 120;
          }
          .receiver-fab.has-detections {
            animation: pulse-ring 1s ease-out infinite;
          }
          .receiver-bottom-sheet {
            display: block; position: fixed; bottom: 64px; left: 0; right: 0;
            background: var(--bg-surface); border-top: 1px solid var(--border);
            border-radius: 16px 16px 0 0; max-height: 70vh; overflow-y: auto;
            z-index: 110; padding: 12px 16px 16px;
            animation: slideUp 0.25s cubic-bezier(0.2,0,0.2,1);
            box-shadow: 0 -4px 24px rgba(26,25,22,0.12);
          }
          .receiver-mobile-stats {
            display: flex; position: absolute; bottom: 10px; left: 10px;
            gap: 6px; z-index: 20;
          }
          .stat-pill {
            background: rgba(247,246,243,0.9); backdrop-filter: blur(8px);
            border: 1px solid var(--border); border-radius: 99px;
            padding: 4px 10px; font-family: var(--font-mono); font-size: 11px;
            color: var(--text-secondary); display: flex; align-items: center; gap: 5px;
          }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", background: "var(--bg)", fontFamily: "var(--font-sans)", height: "100%" }}>

        {/* Alert overlay */}
        {alert && (
          <div className="alert-flash" style={{
            position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50,
            background: "rgba(192,57,43,0.1)", border: "3px solid var(--accent)",
          }} />
        )}

        <main className="receiver-layout">

          {/* Video area */}
          <div className="receiver-video-area">
            <div className="receiver-video-box">

              {/* Scan line */}
              {connected && (
                <div className="scan-line" style={{
                  position: "absolute", left: 0, width: "100%", height: "1px",
                  background: "linear-gradient(90deg, transparent, rgba(192,57,43,0.25), transparent)",
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
              {!connected && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "10px", zIndex: 10,
                }}>
                  <div style={{ fontSize: "32px", color: "var(--border-strong)" }}>◎</div>
                  <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                    A aguardar stream...
                  </p>
                </div>
              )}

              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: "100%", height: "100%", objectFit: "contain", display: connected ? "block" : "none" }} />
              <canvas ref={overlayRef} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }} />

              {/* Alert banner */}
              {alert && (
                <div style={{
                  position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)",
                  zIndex: 30, display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 20px", borderRadius: "99px",
                  background: "var(--accent)", boxShadow: "0 4px 16px rgba(192,57,43,0.3)",
                }}>
                  <span style={{ color: "#fff", fontWeight: 600, fontSize: "13px", letterSpacing: "0.06em" }}>
                    ⚠ FACE RECONHECIDA
                  </span>
                </div>
              )}

              {/* Mobile stats overlay */}
              <div className="receiver-mobile-stats">
                <div className="stat-pill">
                  <span>{fps} FPS</span>
                </div>
                <div className="stat-pill" style={{ color: detections.length > 0 ? "var(--accent)" : undefined }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: connected ? "var(--success)" : "var(--accent)" }} />
                  <span>{detections.length} det.</span>
                </div>
              </div>
            </div>

            <canvas ref={captureRef} style={{ display: "none" }} />
          </div>

          {/* Desktop side panel */}
          <div className="receiver-side-panel">
            {statsBar}
            {detectionsList}
            {systemInfo}
          </div>
        </main>

        {/* Mobile FAB to toggle bottom sheet */}
        <button
          className={`receiver-fab${detections.length > 0 ? " has-detections" : ""}`}
          onClick={() => setPanelOpen((o) => !o)}
          style={{ background: detections.length > 0 ? "var(--accent)" : "var(--bg-surface)", color: detections.length > 0 ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          {panelOpen ? "✕" : "≡"}
        </button>

        {/* Mobile bottom sheet */}
        {panelOpen && (
          <>
            <div onClick={() => setPanelOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 109 }} />
            <div className="receiver-bottom-sheet">
              <div style={{ width: "36px", height: "4px", background: "var(--border-strong)", borderRadius: "99px", margin: "0 auto 14px" }} />
              {statsBar}
              {detectionsList}
              {systemInfo}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Receiver;