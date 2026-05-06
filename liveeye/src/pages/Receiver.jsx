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

    // Signal WebSocket
    // CORRETO - liga ao Node na porta 3000
    const wsSignal = new WebSocket(
    (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws-signal"
    );
    wsSignalRef.current = wsSignal;

    // YOLO WebSocket
    const wsYolo = new WebSocket("ws://localhost:8000/ws");
    wsYoloRef.current = wsYolo;

    // WebRTC
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
      if (event.candidate) {
        wsSignal.send(JSON.stringify({ type: "ice", candidate: event.candidate }));
      }
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

    // Resize canvas to match video
    const resizeCanvas = () => {
      const rect = video.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    };
    video.addEventListener("loadeddata", resizeCanvas);
    window.addEventListener("resize", resizeCanvas);

    // Send frame to YOLO
    const sendFrame = () => {
      if (
        video.videoWidth === 0 ||
        wsYolo.readyState !== WebSocket.OPEN ||
        isWaitingRef.current
      ) return;

      isWaitingRef.current = true;
      capture.width = video.videoWidth;
      capture.height = video.videoHeight;
      captureCtx.drawImage(video, 0, 0);
      const dataURL = capture.toDataURL("image/jpeg", 0.5);
      wsYolo.send(dataURL);
    };

    wsYolo.onopen = () => console.log("YOLO WebSocket ligado");
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
        if (dataChannelRef.current?.readyState === "open") {
          dataChannelRef.current.send("DETETADO");
        }
      }

      setDetections(dets);

      // Draw on canvas
      const rect = video.getBoundingClientRect();
      const scaleX = rect.width / video.videoWidth;
      const scaleY = rect.height / video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      dets.forEach((det) => {
        const x = det.x * scaleX;
        const y = det.y * scaleY;
        const w = det.w * scaleX;
        const h = det.h * scaleY;
        const isKnown = !!det.name;

        // Box
        ctx.strokeStyle = isKnown ? "#22c55e" : "#e63946";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Corner accents
        const cs = 12;
        ctx.lineWidth = 3;
        [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy], i) => {
          ctx.beginPath();
          ctx.moveTo(cx + (i % 2 === 0 ? cs : -cs), cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy + (i < 2 ? cs : -cs));
          ctx.stroke();
        });

        // Label
        if (det.name) {
          ctx.fillStyle = isKnown ? "rgba(34,197,94,0.85)" : "rgba(230,57,70,0.85)";
          const label = det.name;
          ctx.font = "bold 13px 'JetBrains Mono', monospace";
          const tw = ctx.measureText(label).width;
          ctx.fillRect(x, y - 22, tw + 12, 22);
          ctx.fillStyle = "#fff";
          ctx.fillText(label, x + 6, y - 6);
        }
      });

      setTimeout(sendFrame, 50);
    };

    video.addEventListener("play", () => {
      sendFrame();
    });

    return () => {
      wsSignal.close();
      wsYolo.close();
      pc.close();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes alert-flash {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes scan-line {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .scan-line {
          animation: scan-line 3s linear infinite;
        }
        .alert-flash {
          animation: alert-flash 0.4s ease-in-out 3;
        }
      `}</style>

      <div
        className="min-h-screen flex flex-col"
        style={{
          background: "#060810",
          fontFamily: "'Syne', sans-serif",
        }}
      >
        {/* Alert overlay */}
        {alert && (
          <div
            className="alert-flash fixed inset-0 pointer-events-none z-50"
            style={{ background: "rgba(230,57,70,0.15)", border: "3px solid #e63946" }}
          />
        )}

        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm"
              style={{ background: "linear-gradient(135deg, #e63946, #c1121f)", boxShadow: "0 0 16px rgba(230,57,70,0.4)" }}>
              ◎
            </div>
            <span className="font-bold text-base tracking-wide" style={{ color: "#f0eee8" }}>
              LiveEye <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>/ Receiver</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* FPS */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>FPS</span>
              <span className="text-sm font-bold" style={{ color: "#f0eee8", fontFamily: "'JetBrains Mono', monospace" }}>{fps}</span>
            </div>

            {/* Detections */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>DETEÇÕES</span>
              <span className="text-sm font-bold" style={{ color: detections.length > 0 ? "#e63946" : "#f0eee8", fontFamily: "'JetBrains Mono', monospace" }}>
                {detections.length}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <div className="relative w-2 h-2">
                <div className="w-2 h-2 rounded-full" style={{ background: connected ? "#22c55e" : "#e63946" }} />
                {connected && (
                  <div className="absolute inset-0 rounded-full"
                    style={{ background: "#22c55e", animation: "pulse-ring 1.5s ease-out infinite" }} />
                )}
              </div>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
                {status}
              </span>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex flex-1 gap-6 p-6">

          {/* Video area */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="relative rounded-xl overflow-hidden"
              style={{ background: "#000", border: "1px solid rgba(255,255,255,0.08)", aspectRatio: "16/9" }}>

              {/* Scan line effect when connected */}
              {connected && (
                <div className="scan-line absolute left-0 w-full h-px pointer-events-none z-10"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(230,57,70,0.4), transparent)" }} />
              )}

              {/* Corner decorations */}
              {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-6 h-6 z-20`}
                  style={{
                    borderTop: i < 2 ? "2px solid rgba(230,57,70,0.5)" : "none",
                    borderBottom: i >= 2 ? "2px solid rgba(230,57,70,0.5)" : "none",
                    borderLeft: i % 2 === 0 ? "2px solid rgba(230,57,70,0.5)" : "none",
                    borderRight: i % 2 === 1 ? "2px solid rgba(230,57,70,0.5)" : "none",
                    margin: "6px",
                  }} />
              ))}

              {/* Waiting state */}
              {!connected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                  <div className="text-4xl" style={{ color: "rgba(255,255,255,0.1)" }}>◎</div>
                  <p style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
                    A aguardar stream...
                  </p>
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: connected ? "block" : "none" }}
              />
              <canvas
                ref={overlayRef}
                className="absolute top-0 left-0 pointer-events-none"
              />

              {/* Alert banner */}
              {alert && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-5 py-2 rounded-full"
                  style={{ background: "rgba(230,57,70,0.9)", boxShadow: "0 0 24px rgba(230,57,70,0.6)" }}>
                  <span className="text-white font-bold text-sm tracking-widest">⚠ FACE RECONHECIDA</span>
                </div>
              )}
            </div>

            {/* Hidden capture canvas */}
            <canvas ref={captureRef} className="hidden" />
          </div>

          {/* Side panel */}
          <div className="w-64 flex flex-col gap-4 flex-shrink-0">

            {/* Live detections */}
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xs font-semibold mb-3 tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
                Deteções ativas
              </p>
              {detections.length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>
                  Nenhuma deteção
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {detections.map((det, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ background: det.name ? "rgba(34,197,94,0.08)" : "rgba(230,57,70,0.08)", border: `1px solid ${det.name ? "rgba(34,197,94,0.2)" : "rgba(230,57,70,0.2)"}` }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: det.name ? "#22c55e" : "#e63946" }} />
                      <span className="text-xs truncate" style={{ color: det.name ? "#22c55e" : "#e63946", fontFamily: "'JetBrains Mono', monospace" }}>
                        {det.name || `Pessoa #${i + 1}`}
                      </span>
                      <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {Math.round(det.conf * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System info */}
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xs font-semibold mb-3 tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
                Sistema
              </p>
              {[
                ["WebRTC", connected ? "Ligado" : "Desligado", connected],
                ["YOLO", fps > 0 ? "Ativo" : "Inativo", fps > 0],
                ["Alertas", alert ? "ATIVO" : "Normal", alert],
              ].map(([label, val, ok]) => (
                <div key={label} className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
                  <span className="text-xs font-semibold" style={{ color: ok ? "#22c55e" : "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xs font-semibold mb-3 tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
                Legenda
              </p>
              {[["#e63946", "Pessoa não identificada"], ["#22c55e", "Pessoa reconhecida"]].map(([color, label]) => (
                <div key={label} className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Receiver;