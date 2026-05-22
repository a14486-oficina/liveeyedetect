import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";

import { API } from "../api.js";
import PersonMap from "./PersonMap.jsx";

const s = {
  label: {
    fontSize: "10px", fontWeight: 500, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.09em",
    fontFamily: "var(--font-mono)",
  },
};

// ─── Lightbox (pop-up de fotografia) ─────────────────────────────────────────
const ZOOM_SCALE = 2.5;

const Lightbox = ({ imagens, index, onClose, onPrev, onNext }) => {
  const imgRef = useRef(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 }); // transform-origin em %
  const isDragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 50, oy: 50 });

  // Reset zoom ao mudar imagem
  useEffect(() => {
    setZoomed(false);
    setOrigin({ x: 50, y: 50 });
  }, [index]);

  // Teclas
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") { if (zoomed) setZoomed(false); else onClose(); }
      if (!zoomed && e.key === "ArrowLeft") onPrev();
      if (!zoomed && e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext, zoomed]);

  const getPct = (e, el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
    };
  };

  const handleImgClick = (e) => {
    e.stopPropagation();
    if (!zoomed) {
      setOrigin(getPct(e, e.currentTarget));
      setZoomed(true);
    } else {
      setZoomed(false);
    }
  };

  const handleMouseDown = (e) => {
    if (!zoomed) return;
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: origin.x, oy: origin.y };
  };

  const handleMouseMove = (e) => {
    if (!zoomed || !isDragging.current || !imgRef.current) return;
    const r = imgRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.mx) / r.width) * 100 / ZOOM_SCALE * 2;
    const dy = ((e.clientY - dragStart.current.my) / r.height) * 100 / ZOOM_SCALE * 2;
    setOrigin({
      x: Math.max(0, Math.min(100, dragStart.current.ox - dx)),
      y: Math.max(0, Math.min(100, dragStart.current.oy - dy)),
    });
  };

  const handleMouseUp = () => { isDragging.current = false; };

  return (
    <div
      onClick={zoomed ? undefined : onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.18s ease",
        userSelect: "none",
      }}
    >
      {/* Botão fechar */}
      <button
        onClick={onClose}
        style={{
          position: "fixed", top: "18px", right: "22px",
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "50%", width: "38px", height: "38px",
          color: "#fff", fontSize: "18px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1, zIndex: 1002,
        }}
      >✕</button>

      {/* Contador + dica */}
      <div style={{
        position: "fixed", top: "22px", left: "50%", transform: "translateX(-50%)",
        fontFamily: "var(--font-mono)", fontSize: "11px", color: "rgba(255,255,255,0.55)",
        letterSpacing: "0.08em", zIndex: 1002, textAlign: "center", whiteSpace: "nowrap",
      }}>
        {index + 1} / {imagens.length}
        <span style={{ marginLeft: "12px", opacity: 0.6 }}>
          {zoomed ? "Arraste para mover · clique para sair do zoom" : "Clique na imagem para zoom"}
        </span>
      </div>

      {/* Setas (escondem no zoom) */}
      {imagens.length > 1 && !zoomed && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          style={{
            position: "fixed", left: "16px", top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "50%", width: "42px", height: "42px",
            color: "#fff", fontSize: "22px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1002,
          }}
        >‹</button>
      )}

      {/* Contentor com overflow hidden para o zoom não vazar */}
      <div
        style={{
          maxWidth: "90vw", maxHeight: "88vh",
          overflow: zoomed ? "hidden" : "visible",
          borderRadius: "10px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          ref={imgRef}
          src={`data:image/jpeg;base64,${imagens[index]}`}
          alt={`Foto ${index + 1}`}
          draggable={false}
          onMouseDown={handleMouseDown}
          onClick={handleImgClick}
          style={{
            maxWidth: "90vw", maxHeight: "88vh",
            objectFit: "contain", display: "block",
            borderRadius: "10px",
            transform: zoomed ? `scale(${ZOOM_SCALE})` : "scale(1)",
            transformOrigin: `${origin.x}% ${origin.y}%`,
            transition: isDragging.current ? "none" : "transform 0.25s ease",
            cursor: zoomed ? (isDragging.current ? "grabbing" : "grab") : "zoom-in",
          }}
        />
      </div>

      {imagens.length > 1 && !zoomed && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          style={{
            position: "fixed", right: "16px", top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "50%", width: "42px", height: "42px",
            color: "#fff", fontSize: "22px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1002,
          }}
        >›</button>
      )}

      {/* Miniaturas em baixo (escondem no zoom) */}
      {imagens.length > 1 && !zoomed && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: "8px", zIndex: 1002,
          }}
        >
          {imagens.map((b64, i) => (
            <button
              key={i}
              onClick={() => onPrev(i)}
              style={{
                width: "48px", height: "48px", padding: 0, border: "none",
                borderRadius: "6px", overflow: "hidden", cursor: "pointer",
                outline: i === index ? "2px solid #fff" : "2px solid transparent",
                outlineOffset: "2px", opacity: i === index ? 1 : 0.45,
                transition: "opacity 0.15s, outline-color 0.15s",
              }}
            >
              <img
                src={`data:image/jpeg;base64,${b64}`}
                alt={`Miniatura ${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Galeria de fotos ─────────────────────────────────────────────────────────
const PhotoGallery = ({ imagens }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null); // null = fechado

  if (!imagens || imagens.length === 0) return null;

  const open = (i) => setLightboxIndex(i);
  const close = () => setLightboxIndex(null);
  const prev = (i) => {
    if (typeof i === "number") { setLightboxIndex(i); return; }
    setLightboxIndex((idx) => (idx - 1 + imagens.length) % imagens.length);
  };
  const next = () => setLightboxIndex((idx) => (idx + 1) % imagens.length);

  return (
    <div style={{ marginBottom: "20px" }}>
      <span style={{ ...s.label, display: "block", marginBottom: "10px" }}>
        Fotografias ({imagens.length})
      </span>

      {/* Grelha de miniaturas clicáveis */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(imagens.length, 4)}, 1fr)`,
        gap: "8px",
      }}>
        {imagens.map((b64, i) => (
          <button
            key={i}
            onClick={() => open(i)}
            title="Clique para ampliar"
            style={{
              aspectRatio: "1 / 1", padding: 0, border: "none",
              borderRadius: "8px", overflow: "hidden", cursor: "zoom-in",
              background: "var(--bg-raised)",
              outline: "2px solid transparent", outlineOffset: "2px",
              transition: "outline-color 0.15s, opacity 0.15s, transform 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.outlineColor = "var(--accent)"; e.currentTarget.style.transform = "scale(1.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.outlineColor = "transparent"; e.currentTarget.style.transform = "scale(1)"; }}
          >
            <img
              src={`data:image/jpeg;base64,${b64}`}
              alt={`Foto ${i + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          imagens={imagens}
          index={lightboxIndex}
          onClose={close}
          onPrev={prev}
          onNext={next}
        />
      )}
    </div>
  );
};

// ─── Linha de pessoa ──────────────────────────────────────────────────────────
const PersonRow = ({ pessoa, onFoundSuccess }) => {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [addingLoc, setAddingLoc] = useState(false);
  const [newLoc, setNewLoc] = useState({ lat: "", lon: "", data: "", hora: "" });

  const toggleOpen = async () => {
    if (!open && !details) {
      setLoadingDetails(true);
      try {
        const res = await fetch(`${API}/pessoas/${pessoa.id}`);
        setDetails(await res.json());
      } catch { /* silent */ }
      setLoadingDetails(false);
    }
    setOpen((o) => !o);
  };

  const marcarEncontrada = async () => {
    if (!confirm("Confirmas que esta pessoa foi encontrada?")) return;
    const res = await fetch(`${API}/pessoas/${pessoa.id}/estado`, { method: "POST" });
    if (res.ok) onFoundSuccess(pessoa.id);
  };

  const submitLoc = async () => {
    if (!newLoc.lat || !newLoc.lon) return;
    const url = `${API}/pessoas/${pessoa.id}/localizacao?lat=${parseFloat(newLoc.lat)}&lon=${parseFloat(newLoc.lon)}&data=${encodeURIComponent(newLoc.data)}&hora=${encodeURIComponent(newLoc.hora)}`;
    const res = await fetch(url, { method: "POST" });
    if (res.ok) {
      setAddingLoc(false);
      setNewLoc({ lat: "", lon: "", data: "", hora: "" });
      const r2 = await fetch(`${API}/pessoas/${pessoa.id}`);
      setDetails(await r2.json());
    }
  };

  const inputStyle = {
    flex: 1, background: "var(--bg-raised)", border: "1px solid var(--border)",
    borderRadius: "6px", color: "var(--text-primary)", fontFamily: "var(--font-mono)",
    fontSize: "12px", padding: "7px 10px", outline: "none", minWidth: 0,
  };

  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: "10px", marginBottom: "6px", overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
    }}>
      {/* Cabeçalho da linha */}
      <div style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={toggleOpen} style={{
          flex: 1, display: "flex", alignItems: "center", gap: "9px",
          background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0,
        }}>
          <span style={{
            fontSize: "8px", color: "var(--text-muted)", transition: "transform 0.18s",
            transform: open ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block",
          }}>▶</span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
            {pessoa.nome}
          </span>
          <span style={{
            fontSize: "10px", fontFamily: "var(--font-mono)",
            background: "var(--warning-light)", color: "var(--warning)",
            padding: "2px 8px", borderRadius: "99px", border: "1px solid var(--warning-border)",
          }}>Desaparecido/a</span>
        </button>

        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => setAddingLoc((a) => !a)} style={{
            background: "var(--bg-raised)", border: "1px solid var(--border)",
            borderRadius: "6px", color: "var(--text-secondary)", fontSize: "12px",
            padding: "5px 11px", cursor: "pointer", fontFamily: "var(--font-sans)",
          }}>Novo avistamento</button>
          <button onClick={marcarEncontrada} style={{
            background: "var(--success-light)", border: "1px solid var(--success-border)",
            borderRadius: "6px", color: "var(--success)", fontSize: "12px",
            padding: "5px 11px", cursor: "pointer", fontFamily: "var(--font-sans)",
          }}>Foi encontrada?</button>
        </div>
      </div>

      {/* Formulário nova localização */}
      {addingLoc && (
        <div style={{ padding: "13px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-raised)" }}>
          <p style={{ ...s.label, marginBottom: "10px" }}>Nova localização</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[["lat", "Latitude"], ["lon", "Longitude"], ["data", "Data DD/MM/AAAA"], ["hora", "Hora HH:MM"]].map(([k, ph]) => (
              <input key={k} style={{ ...inputStyle, flex: "1 1 120px" }}
                value={newLoc[k]} placeholder={ph}
                onChange={(e) => setNewLoc((n) => ({ ...n, [k]: e.target.value }))} />
            ))}
            <button onClick={submitLoc} style={{
              background: "var(--accent)", border: "none", borderRadius: "6px", color: "#fff",
              fontSize: "12px", padding: "7px 14px", cursor: "pointer",
              fontFamily: "var(--font-sans)", fontWeight: 500,
            }}>Guardar</button>
          </div>
        </div>
      )}

      {/* Detalhes expandidos */}
      {open && (
        <div style={{
          padding: "16px 16px 18px", borderTop: "1px solid var(--border)",
          animation: "fadeIn 0.18s ease",
        }}>
          {loadingDetails ? (
            <p style={{ color: "var(--text-muted)", fontSize: "13px", fontFamily: "var(--font-mono)" }}>
              A carregar...
            </p>
          ) : details ? (
            <>
              <PhotoGallery imagens={details.imagens_b64} />

              {/* ── MAPA ── */}
              <PersonMap
                homeCoords={details.local_de_residencia}
                localizacoes={details.localizacoes}
              />

              {/* Grelha de info */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "14px" }}>
                {[
                  ["Idade", `${details.idade} anos`],
                  ["Sexo", details.sexo],
                  ["Residência", `${details.local_de_residencia?.lat}, ${details.local_de_residencia?.lon}`],
                ].map(([k, v]) => (
                  <div key={k} style={{
                    background: "var(--bg-raised)", borderRadius: "7px", padding: "10px 13px",
                    border: "1px solid var(--border)",
                  }}>
                    <span style={{ ...s.label, display: "block", marginBottom: "4px" }}>{k}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-primary)" }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Observações */}
              {details.observacoes && (
                <div style={{
                  background: "var(--bg-raised)", borderRadius: "7px", padding: "12px 13px",
                  marginBottom: "14px", border: "1px solid var(--border)",
                }}>
                  <span style={{ ...s.label, display: "block", marginBottom: "6px" }}>Observações</span>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                    {details.observacoes}
                  </p>
                </div>
              )}

              {/* Histórico de localizações */}
              <p style={{ ...s.label, marginBottom: "10px" }}>Histórico de localizações</p>
              {details.localizacoes?.length > 0 ? (
                <div style={{
                  background: "var(--bg-raised)", borderRadius: "7px", overflow: "hidden",
                  border: "1px solid var(--border)",
                }}>
                  {details.localizacoes.map((loc, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "13px",
                      padding: "9px 13px",
                      borderBottom: i < details.localizacoes.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <span style={{ color: "var(--accent)", fontSize: "10px" }}>◎</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-primary)" }}>
                        {loc.lat} | {loc.lon}
                      </span>
                      <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                        {loc.data && loc.hora ? `${loc.data} ${loc.hora}` : "Sem registo de tempo"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                  Nenhuma localização registada.
                </p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

// ─── Ecrã principal ───────────────────────────────────────────────────────────
const Desaparecidas = forwardRef(({ onCountChange }, ref) => {
  const [pessoas, setPessoas] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/pessoas_listar`);
      const data = await res.json();
      setPessoas(data);
      if (typeof onCountChange === "function") onCountChange(data.length);
    } catch { /* silent */ }
    setLoading(false);
  };

  useImperativeHandle(ref, () => ({ reload: carregar }));

  useEffect(() => { carregar(); }, []);

  const handleFound = (id) => {
    setPessoas((p) => {
      const updated = p.filter((x) => x.id !== id);
      if (typeof onCountChange === "function") onCountChange(updated.length);
      return updated;
    });
  };

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
          Pessoas Desaparecidas
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
          {pessoas.length} registo{pessoas.length !== 1 ? "s" : ""} ativo{pessoas.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div style={{
        display: "inline-flex", alignItems: "center", gap: "10px",
        background: "var(--warning-light)", border: "1px solid var(--warning-border)",
        borderRadius: "9px", padding: "12px 20px", marginBottom: "24px",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 500, color: "var(--warning)" }}>
          {pessoas.length}
        </span>
        <span style={{ ...s.label, color: "var(--warning)" }}>Desaparecidas</span>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>A carregar...</p>
      ) : pessoas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "28px", marginBottom: "12px" }}>◎</div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
            Nenhuma pessoa desaparecida registada.
          </p>
        </div>
      ) : (
        pessoas.map((p) => <PersonRow key={p.id} pessoa={p} onFoundSuccess={handleFound} />)
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .leaflet-container { font-family: var(--font-sans) !important; }
      `}</style>
    </div>
  );
});

export { Lightbox, PhotoGallery };
export default Desaparecidas;