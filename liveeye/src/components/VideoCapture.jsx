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

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;

    const sendChannel = pc.createDataChannel("alertas");
    sendChannel.onmessage = (e) => {
      if (e.data === "DETETADO" && navigator.vibrate) navigator.vibrate([200, 100, 200]);
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
    return () => { wsSignalRef.current?.close(); pcRef.current?.close(); };
  }, []);

  const dotColor = connected ? "var(--success)" : active ? "var(--warning)" : "var(--accent)";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes scan-line {
          0%   { top: 0%; }
          100% { top: 100%; }
        }
        .scan-line { animation: scan-line 3s linear infinite; }
        .vc-video-box { aspect-ratio: 9/16; max-width: 480px; width: 100%; }
        .vc-cards    { grid-template-columns: 1fr 1fr; max-width: 480px; width: 100%; }
        @media (max-width: 480px) {
          .vc-header { padding: 12px 16px !important; }
          .vc-main   { padding: 16px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", background: "var(--bg)", fontFamily: "var(--font-sans)" }}>

        {/* Header */}
        <header className="vc-header" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 28px",
          background: "var(--bg-surface)", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "26px", height: "26px", borderRadius: "6px",
              background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", color: "#fff",
            }}>◎</div>
            <span style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-primary)" }}>
              LiveEye{" "}
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>/ Câmara</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ position: "relative", width: "8px", height: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor }} />
              {connected && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: dotColor, animation: "pulse-ring 1.5s ease-out infinite",
                }} />
              )}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
              {status}
            </span>
          </div>
        </header>

        {/* Main */}
        <main className="vc-main" style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px", width: "100%", maxWidth: "480px" }}>

            {/* Video box */}
            <div className="vc-video-box" style={{
              position: "relative", borderRadius: "12px", overflow: "hidden",
              background: "var(--bg-raised)", border: "1px solid var(--border)",
              boxShadow: "var(--shadow-md)",
            }}>
              {active && (
                <div className="scan-line" style={{
                  position: "absolute", left: 0, width: "100%", height: "1px",
                  background: "linear-gradient(90deg, transparent, rgba(192,57,43,0.3), transparent)",
                  pointerEvents: "none", zIndex: 10,
                }} />
              )}

              {/* Corner decorations */}
              {[
                { top: 0, left: 0,    borderTop: true,    borderLeft: true  },
                { top: 0, right: 0,   borderTop: true,    borderRight: true },
                { bottom: 0, left: 0,  borderBottom: true, borderLeft: true  },
                { bottom: 0, right: 0, borderBottom: true, borderRight: true },
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

              {!active && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "8px", zIndex: 10,
                }}>
                  <div style={{ fontSize: "36px", color: "var(--border-strong)" }}>◎</div>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                    Câmara inativa
                  </p>
                </div>
              )}

              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: "100%", height: "100%", objectFit: "cover", display: active ? "block" : "none" }} />
            </div>

            {/* Button / status */}
            {!active ? (
              <button onClick={startCamera} style={{
                background: "var(--accent)", border: "none", borderRadius: "8px",
                color: "#fff", padding: "13px 32px", fontSize: "14px",
                fontWeight: 500, fontFamily: "var(--font-sans)",
                cursor: "pointer", letterSpacing: "0.01em",
                width: "100%", maxWidth: "300px",
              }}>
                Ligar Sistema de Alerta
              </button>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "12px 16px", borderRadius: "9px", width: "100%",
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
              }}>
                <div style={{
                  width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
                  background: connected ? "var(--success)" : "var(--warning)",
                }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-secondary)" }}>
                  {connected ? "A transmitir para o receiver" : "A estabelecer ligação..."}
                </span>
              </div>
            )}

            {/* Info cards */}
            <div className="vc-cards" style={{ display: "grid", gap: "8px" }}>
              {[
                ["WebRTC", connected ? "Ligado" : active ? "A ligar..." : "Inativo", connected],
                ["Câmara", active ? "Ativa" : "Inativa", active],
              ].map(([label, val, ok]) => (
                <div key={label} style={{
                  borderRadius: "8px", padding: "11px 14px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                    {label}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 500,
                    color: ok ? "var(--success)" : "var(--text-muted)",
                  }}>
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