import { useRef, useState, useEffect } from "react";

const VideoCapture = () => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("A aguardar permissão da câmara...");
  const [active, setActive] = useState(false);
  const [connected, setConnected] = useState(false);
  const wsSignalRef = useRef(null);
  const pcRef = useRef(null);

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

  const startWebRTC = async (stream) => {
    const wsSignal = new WebSocket(
      (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws-signal"
    );
    wsSignalRef.current = wsSignal;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    const sendChannel = pc.createDataChannel("alertas");
    sendChannel.onmessage = (e) => {
      if (e.data === "DETETADO" && navigator.vibrate)
        navigator.vibrate([200, 100, 200]);
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes scan-line {
          0% { top: 0%; } 100% { top: 100%; }
        }
        .scan-line { animation: scan-line 3s linear infinite; }

        .vc-video-box { aspect-ratio: 9/16; max-width: 520px; width: 100%; }
        .vc-cards { grid-template-columns: 1fr 1fr; max-width: 520px; width: 100%; }

        @media (max-width: 480px) {
          .vc-header { padding: 12px 14px !important; }
          .vc-main { padding: 16px !important; }
          .vc-video-box { aspect-ratio: 9/16; }
        }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ background: "#060810", fontFamily: "'Syne', sans-serif" }}>

        {/* Header */}
        <header className="vc-header flex items-center justify-between px-8 py-5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm text-white"
              style={{ background: "linear-gradient(135deg, #e63946, #c1121f)", boxShadow: "0 0 16px rgba(230,57,70,0.4)" }}>
              ◎
            </div>
            <span className="font-bold text-base tracking-wide" style={{ color: "#f0eee8" }}>
              LiveEye <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>/ Câmara</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-2 h-2">
              <div className="w-2 h-2 rounded-full"
                style={{ background: connected ? "#22c55e" : active ? "#f59e0b" : "#e63946" }} />
              {connected && (
                <div className="absolute inset-0 rounded-full"
                  style={{ background: "#22c55e", animation: "pulse-ring 1.5s ease-out infinite" }} />
              )}
            </div>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
              {status}
            </span>
          </div>
        </header>

        {/* Main */}
        <main className="vc-main flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center gap-6 w-full" style={{ maxWidth: "520px" }}>

            {/* Video box */}
            <div className="vc-video-box relative rounded-xl overflow-hidden"
              style={{ background: "#000", border: "1px solid rgba(255,255,255,0.08)" }}>

              {active && (
                <div className="scan-line absolute left-0 w-full h-px pointer-events-none z-10"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(230,57,70,0.4), transparent)" }} />
              )}

              {/* Corner decorations */}
              {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-6 h-6 z-20`} style={{
                  borderTop: i < 2 ? "2px solid rgba(230,57,70,0.5)" : "none",
                  borderBottom: i >= 2 ? "2px solid rgba(230,57,70,0.5)" : "none",
                  borderLeft: i % 2 === 0 ? "2px solid rgba(230,57,70,0.5)" : "none",
                  borderRight: i % 2 === 1 ? "2px solid rgba(230,57,70,0.5)" : "none",
                  margin: "6px",
                }} />
              ))}

              {!active && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                  <div className="text-5xl" style={{ color: "rgba(255,255,255,0.08)" }}>◎</div>
                  <p style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
                    Câmara inativa
                  </p>
                </div>
              )}

              <video ref={videoRef} autoPlay playsInline muted
                className="w-full h-full object-cover"
                style={{ display: active ? "block" : "none" }} />
            </div>

            {/* Button / active status */}
            {!active ? (
              <button onClick={startCamera} style={{
                background: "#e63946", border: "none", borderRadius: "10px",
                color: "#fff", padding: "14px 36px", fontSize: "14px",
                fontWeight: 700, fontFamily: "'Syne', sans-serif",
                cursor: "pointer", letterSpacing: "0.04em",
                boxShadow: "0 0 24px rgba(230,57,70,0.35)",
                width: "100%", maxWidth: "320px",
              }}>
                Ligar Sistema de Alerta
              </button>
            ) : (
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl w-full"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                  background: connected ? "#22c55e" : "#f59e0b",
                  boxShadow: `0 0 8px ${connected ? "rgba(34,197,94,0.6)" : "rgba(245,158,11,0.6)"}`,
                }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                  {connected ? "A transmitir para o receiver" : "A estabelecer ligação..."}
                </span>
              </div>
            )}

            {/* Info cards */}
            <div className="vc-cards grid gap-3">
              {[
                ["WebRTC", connected ? "Ligado" : active ? "A ligar..." : "Inativo", connected],
                ["Câmara", active ? "Ativa" : "Inativa", active],
              ].map(([label, val, ok]) => (
                <div key={label} className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                    {label}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 600,
                    color: ok ? "#22c55e" : "rgba(255,255,255,0.2)" }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default VideoCapture;