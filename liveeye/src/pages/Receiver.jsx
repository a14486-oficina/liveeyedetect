import { useEffect, useRef, useState, useCallback } from "react";

import { WS_PROTO, WS_HOST, API, getToken } from "../api.js";
import { addDetection } from "../detectionStore.js";

const MODE_SELECT = "select";
const MODE_WATCHING = "watching";

const Receiver = () => {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const wsSignalRef = useRef(null);
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const streamIdRef = useRef(null);

  const [mode, setMode] = useState(MODE_SELECT);
  const [streams, setStreams] = useState([]);
  const [selectedStream, setSelectedStream] = useState(null);
  const [status, setStatus] = useState("A aguardar ligação...");
  const [connected, setConnected] = useState(false);
  const [alert, setAlert] = useState(false);
  // detections: lista de { id, name, hora, count } enviadas pelo emissor via data channel
  const [detections, setDetections] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);

  // Alert flash
  useEffect(() => {
    if (alert) {
      const t = setTimeout(() => setAlert(false), 2000);
      return () => clearTimeout(t);
    }
  }, [alert]);

  // ── Signal WebSocket (persistente, não depende do mode) ──
  const registeredRoomRef = useRef(null);

  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;
    let reconnectAttempts = 0;
    let active = true;

    const connect = () => {
      if (!active) return;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }

      const token = getToken();
      ws = new WebSocket(WS_PROTO + WS_HOST + "/ws-signal", [token]);
      wsSignalRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts = 0;
        const room = registeredRoomRef.current;
        if (room) {
          ws.send(JSON.stringify({ type: "register", role: "receiver", streamId: room }));
        } else {
          ws.send(JSON.stringify({ type: "list" }));
        }
      };

      ws.onmessage = (message) => {
        const data = JSON.parse(message.data);
        if (data.type === "streams") {
          setStreams(data.streams || []);
        }
      };

      ws.onclose = () => {
        if (!active) return;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => {};
    };

    connect();

    return () => {
      active = false;
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, []);

  // ── Polling da lista de streams (só em modo select) ──
  useEffect(() => {
    if (mode !== MODE_SELECT) return;
    const interval = setInterval(() => {
      const ws = wsSignalRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "list" }));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [mode]);

  // ── Ligar a uma stream específica ──
  const connectToStream = useCallback((streamId) => {
    setSelectedStream(streamId);
    streamIdRef.current = streamId;
    registeredRoomRef.current = streamId;
    setMode(MODE_WATCHING);
    setConnected(false);
    setDetections([]);
    setAlert(false);
    setStatus("A ligar à stream...");

    const ws = wsSignalRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "register", role: "receiver", streamId }));
    }
  }, []);

  // ── Voltar à lista ──
  const backToList = useCallback(() => {
    setMode(MODE_SELECT);
    setSelectedStream(null);
    streamIdRef.current = null;
    registeredRoomRef.current = null;
    setConnected(false);
    setDetections([]);
    setAlert(false);

    const ws = wsSignalRef.current;
    if (ws) {
      ws.onmessage = (message) => {
        const data = JSON.parse(message.data);
        if (data.type === "streams") {
          setStreams(data.streams || []);
        }
      };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "list" }));
      }
    }
  }, []);

  // ── WebRTC — só recebe vídeo e escuta o data channel do emissor ──
  useEffect(() => {
    if (mode !== MODE_WATCHING) return;

    let reconnectTimer = null;
    let reconnectAttempts = 0;
    let active = true;

    const cleanup = () => {
      if (pcRef.current) {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.ondatachannel = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
        pcRef.current = null;
      }
      dataChannelRef.current = null;
    };

    const scheduleReconnect = () => {
      if (!active) return;
      clearTimeout(reconnectTimer);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(setup, delay);
    };

    const setup = () => {
      if (!active) return;
      cleanup();

      const video = videoRef.current;
      const canvas = overlayRef.current;
      if (!video || !canvas) return;

      const wsSignal = wsSignalRef.current;
      const sid = streamIdRef.current;
      if (!sid) return;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      // Data channel: recebe alertas do emissor
      pc.ondatachannel = (event) => {
        dataChannelRef.current = event.channel;
        dataChannelRef.current.onopen = () => {
          console.log("[Receiver] Data channel aberto");
          if (wsSignal?.readyState === WebSocket.OPEN) {
            wsSignal.send(JSON.stringify({ type: "data_channel_ready", streamId: sid }));
          }
        };
        dataChannelRef.current.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed.type === "detetado" && Array.isArray(parsed.pessoas)) {
              setAlert(true);
              if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);

              const agora = new Date();
              const horaStr = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}:${String(agora.getSeconds()).padStart(2, "0")}`;

              parsed.pessoas.forEach((p) => {
                if (p.id != null) addDetection(p.id, p.name);
              });

              setDetections((prev) => {
                const next = [...prev];
                parsed.pessoas.forEach((p) => {
                  const idx = next.findIndex((x) => x.id === p.id);
                  if (idx >= 0) {
                    next[idx] = { ...next[idx], count: next[idx].count + 1, hora: horaStr };
                  } else {
                    next.unshift({ id: p.id, name: p.name, hora: horaStr, count: 1 });
                  }
                });
                return next;
              });
            }
          } catch {}
          // mensagem legada "DETETADO" (string)
          if (e.data === "DETETADO") {
            setAlert(true);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
          }
        };
      };

      pc.ontrack = (event) => {
        video.srcObject = event.streams[0];
        video.onloadedmetadata = () => {
          video.play();
          setConnected(true);
          setStatus("Vídeo recebido");
        };
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && wsSignal?.readyState === WebSocket.OPEN) {
          wsSignal.send(JSON.stringify({ type: "ice", streamId: sid, candidate: event.candidate }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          scheduleReconnect();
        }
      };

      const onSignalMessage = (message) => {
        const data = JSON.parse(message.data);
        if (data.streamId !== sid) return;
        if (data.type === "offer") {
          pc.setRemoteDescription(new RTCSessionDescription(data.offer))
            .then(() => pc.createAnswer())
            .then((answer) => pc.setLocalDescription(answer))
            .then(() => {
              if (wsSignal?.readyState === WebSocket.OPEN) {
                wsSignal.send(JSON.stringify({ type: "answer", streamId: sid, answer: pc.localDescription }));
              }
              setStatus("Ligação estabelecida");
            })
            .catch((err) => {
              console.error("Erro no handshake offer/answer:", err);
              scheduleReconnect();
            });
        } else if (data.type === "ice") {
          pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
        }
      };

      if (wsSignal) {
        wsSignal.onmessage = onSignalMessage;
      }
    };

    setup();

    return () => {
      active = false;
      clearTimeout(reconnectTimer);
      if (videoRef.current) videoRef.current.srcObject = null;
      cleanup();
    };
  }, [mode]);

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
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>Detetadas</span>
          <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "var(--font-mono)", color: detections.length > 0 ? "var(--accent)" : "var(--text-primary)" }}>{detections.length}</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>Alertas</span>
          <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "var(--font-mono)", color: alert ? "var(--accent)" : "var(--text-muted)" }}>{alert ? "ATIVO" : "—"}</span>
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
    <InfoCard title={`Pessoas detetadas${detections.length > 0 ? ` (${detections.length})` : ""}`}>
      {detections.length === 0 ? (
        <div style={{ textAlign: "center", padding: "14px 0" }}>
          <div style={{ fontSize: "20px", marginBottom: "6px", opacity: 0.4 }}>◎</div>
          <p style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-mono)", margin: 0 }}>
            Nenhuma pessoa detetada
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", maxHeight: "300px", overflowY: "auto" }}>
          {detections.map((det) => (
            <div key={det.id} style={{
              display: "flex", alignItems: "center", gap: "8px",
              borderRadius: "7px", padding: "8px 10px",
              background: "var(--success-light)",
              border: "1px solid var(--success-border)",
              animation: "fadeInRow 0.2s ease",
            }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: "var(--accent-light)", border: "1px solid var(--accent-border)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent)", fontFamily: "var(--font-sans)" }}>
                  {det.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 500, color: "var(--success)", fontFamily: "var(--font-sans)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {det.name}
                </p>
                <p style={{ margin: 0, fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {det.hora}
                </p>
              </div>
              {det.count > 1 && (
                <span style={{
                  fontSize: "10px", fontFamily: "var(--font-mono)",
                  background: "var(--success-light)", color: "var(--success)",
                  padding: "2px 7px", borderRadius: "99px", flexShrink: 0,
                  border: "1px solid var(--success-border)",
                }}>×{det.count}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </InfoCard>
  );

  const systemInfo = (
    <InfoCard title="Sistema">
      {[
        ["WebRTC",  connected ? "Ligado"  : "Desligado", connected],
        ["Alertas", alert     ? "ATIVO"   : "Normal",    alert],
        ["Stream",  selectedStream || "—", !!selectedStream],
      ].map(([label, val, ok]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{label}</span>
          <span style={{ fontSize: "11px", fontWeight: 500, fontFamily: "var(--font-mono)", color: ok ? "var(--success)" : "var(--text-muted)", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{val}</span>
        </div>
      ))}
    </InfoCard>
  );

  // ── Stream Select Screen ──
  const streamSelectScreen = (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      flex: 1, padding: "40px 20px",
    }}>
      <h2 style={{ fontSize: "18px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "4px" }}>Transmissões Ativas</h2>
      <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: "24px" }}>
        {streams.length === 0 ? "Nenhuma transmissão disponível" : "Seleciona uma transmissão para visualizar"}
      </p>

      {streams.length === 0 ? (
        <div style={{
          padding: "24px", textAlign: "center", borderRadius: "10px",
          border: "1px dashed var(--border)", background: "var(--bg-surface)", maxWidth: "360px", width: "100%",
        }}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Aguarda que um emissor inicie a transmissão...
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "400px", width: "100%" }}>
          {streams.map((s) => (
            <button
              key={s.id}
              onClick={() => connectToStream(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)",
                background: "var(--bg-surface)", cursor: "pointer", textAlign: "left",
                transition: "all 0.12s", width: "100%",
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent-border)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px",
              }}>⬤</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{s.id}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  {s.since_seconds < 60 ? `Há ${s.since_seconds}s` : `Há ${Math.floor(s.since_seconds / 60)}min`}
                </div>
              </div>
              <span style={{ fontSize: "18px", color: "var(--text-muted)" }}>→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── Watching Screen ──
  const watchingScreen = (
    <>
      <main className="receiver-layout">

        {/* Video area */}
        <div className="receiver-video-area">
          <div className="receiver-video-box">

            {/* Botão voltar */}
            <button onClick={backToList} style={{
              position: "absolute", top: "8px", left: "8px", zIndex: 26,
              display: "flex", alignItems: "center", gap: "6px",
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "7px", padding: "6px 12px", cursor: "pointer",
              color: "#fff", fontFamily: "var(--font-mono)", fontSize: "11px",
            }}>
              ← Voltar
            </button>

            {/* Stream badge */}
            {selectedStream && (
              <div style={{
                position: "absolute", top: "8px", left: "90px", zIndex: 25,
                background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
                borderRadius: "6px", padding: "4px 8px",
              }}>
                <span style={{ fontSize: "10px", color: "#fff", fontFamily: "var(--font-mono)", opacity: 0.7 }}>📡 </span>
                <span style={{ fontSize: "11px", color: "#fff", fontFamily: "var(--font-mono)", fontWeight: 500 }}>{selectedStream}</span>
              </div>
            )}

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
                  {status}
                </p>
              </div>
            )}

            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: "100%", height: "100%", objectFit: "contain", display: connected ? "block" : "none" }} />
            <canvas ref={overlayRef} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", display: "none" }} />

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

            {/* Mobile detections overlay */}
            {detections.length > 0 && (
              <div style={{
                position: "absolute", top: "10px", right: "10px", zIndex: 20,
                width: "160px", maxHeight: "200px",
                background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
                borderRadius: "10px", overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <div style={{
                  padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", gap: "6px",
                }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2d7a4f" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Detetadas ({detections.length})
                  </span>
                </div>
                <div style={{ overflowY: "auto", maxHeight: "155px", padding: "4px 0" }}>
                  {detections.map((p) => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: "7px",
                      padding: "5px 10px",
                    }}>
                      <div style={{
                        width: "22px", height: "22px", borderRadius: "50%",
                        background: "rgba(45,122,79,0.3)", border: "1px solid rgba(45,122,79,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <span style={{ fontSize: "9px", fontWeight: 600, color: "#6fcf97", fontFamily: "var(--font-sans)" }}>
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
                        <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#6fcf97", background: "rgba(45,122,79,0.2)", padding: "1px 5px", borderRadius: "99px", flexShrink: 0 }}>
                          ×{p.count}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop side panel */}
        <div className="receiver-side-panel">
          {statsBar}
          {detectionsList}
          {systemInfo}
        </div>
      </main>

      {/* Mobile FAB */}
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
    </>
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
        @keyframes fadeInRow {
          from { opacity: 0; transform: translateX(6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .scan-line   { animation: scan-line 3s linear infinite; }
        .alert-flash { animation: alert-flash 0.4s ease-in-out 3; }

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
          width: 260px; display: flex; flex-direction: column; gap: 0px; flex-shrink: 0;
        }
        .receiver-fab { display: none; }
        .receiver-bottom-sheet { display: none; }

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
            border: none;
            box-shadow: 0 4px 16px rgba(192,57,43,0.35);
            align-items: center; justify-content: center;
            font-size: 18px; cursor: pointer; z-index: 120;
          }
          .receiver-bottom-sheet {
            display: block; position: fixed; bottom: 64px; left: 0; right: 0;
            background: var(--bg-surface); border-top: 1px solid var(--border);
            border-radius: 16px 16px 0 0; max-height: 70vh; overflow-y: auto;
            z-index: 110; padding: 12px 16px 16px;
            animation: slideUp 0.25s cubic-bezier(0.2,0,0.2,1);
            box-shadow: 0 -4px 24px rgba(26,25,22,0.12);
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

        {mode === MODE_SELECT ? streamSelectScreen : watchingScreen}

      </div>
    </>
  );
};

export default Receiver;