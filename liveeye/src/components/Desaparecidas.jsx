import { useState, useEffect, useRef } from "react";

const API = "http://127.0.0.1:8000";

const s = {
  label: {
    fontSize: "10px", fontWeight: 500, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.09em",
    fontFamily: "var(--font-mono)",
  },
};

// ─── Leaflet loader (sem npm extra — carrega via CDN dinamicamente) ────────────
let leafletReady = false;
let leafletCallbacks = [];

function loadLeaflet(cb) {
  if (leafletReady) return cb();
  leafletCallbacks.push(cb);
  if (document.getElementById("leaflet-css")) return; // já a carregar

  // CSS
  const link = document.createElement("link");
  link.id = "leaflet-css";
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);

  // JS
  const script = document.createElement("script");
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.onload = () => {
    // Fix ícones default (bug clássico Leaflet + bundlers)
    const L = window.L;
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    leafletReady = true;
    leafletCallbacks.forEach((fn) => fn());
    leafletCallbacks = [];
  };
  document.head.appendChild(script);
}

// ─── Componente mapa ──────────────────────────────────────────────────────────
const PersonMap = ({ homeCoords, localizacoes }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(leafletReady);

  useEffect(() => {
    if (!ready) loadLeaflet(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    if (mapRef.current) return; // já inicializado

    const L = window.L;
    const hasHome = homeCoords?.lat != null && homeCoords?.lon != null;

    // Ordena avistamentos cronologicamente (mais antigo → mais recente)
    const parseDatetime = (loc) => {
      if (!loc.data && !loc.hora) return 0;
      // Suporta formato DD/MM/AAAA HH:MM
      const [d, m, y] = (loc.data || "01/01/1970").split("/");
      const [h, min] = (loc.hora || "00:00").split(":");
      return new Date(`${y}-${m}-${d}T${h}:${min}:00`).getTime();
    };

    const sightings = (localizacoes || [])
      .filter((l) => l.lat != null && l.lon != null)
      .sort((a, b) => parseDatetime(a) - parseDatetime(b));

    const center = hasHome
      ? [homeCoords.lat, homeCoords.lon]
      : sightings.length > 0
      ? [sightings[0].lat, sightings[0].lon]
      : [38.716, -9.139]; // Lisboa fallback

    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false });
    mapRef.current = map;

    L.tileLayer("http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);

    const bounds = [];

    // Marcador casa
    if (hasHome) {
      const homeIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          background:var(--accent,#4f6ef7);border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
        "></div>`,
        iconSize: [28, 28], iconAnchor: [14, 28],
      });
      L.marker([homeCoords.lat, homeCoords.lon], { icon: homeIcon })
        .addTo(map)
        .bindPopup("<b>🏠 Residência</b>");
      bounds.push([homeCoords.lat, homeCoords.lon]);
    }

    // Marcadores avistamentos + rastro
    if (sightings.length > 0) {
      const trailCoords = sightings.map((l) => [l.lat, l.lon]);

      // Linha do rastro
      L.polyline(
        hasHome ? [[homeCoords.lat, homeCoords.lon], ...trailCoords] : trailCoords,
        { color: "#f59e0b", weight: 2.5, dashArray: "6 5", opacity: 0.85 }
      ).addTo(map);

      sightings.forEach((loc, i) => {
        const isLast = i === sightings.length - 1;
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:${isLast ? 18 : 13}px;height:${isLast ? 18 : 13}px;
            border-radius:50%;
            background:${isLast ? "#f59e0b" : "#fbbf24"};
            border:${isLast ? "3px" : "2px"} solid #fff;
            box-shadow:0 1px 6px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [isLast ? 18 : 13, isLast ? 18 : 13],
          iconAnchor: [isLast ? 9 : 6, isLast ? 9 : 6],
        });
        L.marker([loc.lat, loc.lon], { icon })
          .addTo(map)
          .bindPopup(`<b>${isLast ? "📍 Último avistamento" : `Avistamento ${i + 1}`}</b>${loc.data ? `<br>${loc.data}${loc.hora ? " " + loc.hora : ""}` : ""}`);
        bounds.push([loc.lat, loc.lon]);
      });
    }

    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.25));
    } else {
      map.setView(center, 14);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [ready, homeCoords, localizacoes]);

  if (!ready) {
    return (
      <div style={{
        height: "280px", borderRadius: "9px", border: "1px solid var(--border)",
        background: "var(--bg-raised)", display: "flex", alignItems: "center",
        justifyContent: "center", gap: "8px",
        color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px",
      }}>
        <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◎</span>
        A carregar mapa…
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={s.label}>Mapa de localização</span>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--accent,#4f6ef7)", display: "inline-block" }} />
            Residência
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
            Avistamentos
          </span>
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          height: "400px", borderRadius: "9px", overflow: "hidden",
          border: "1px solid var(--border)", zIndex: 0,
        }}
      />
    </div>
  );
};

// ─── Lightbox (pop-up de fotografia) ─────────────────────────────────────────
const Lightbox = ({ imagens, index, onClose, onPrev, onNext }) => {
  // Fechar com Escape, navegar com setas
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.18s ease",
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
          lineHeight: 1, zIndex: 1001,
        }}
      >✕</button>

      {/* Contador */}
      <div style={{
        position: "fixed", top: "22px", left: "50%", transform: "translateX(-50%)",
        fontFamily: "var(--font-mono)", fontSize: "11px", color: "rgba(255,255,255,0.55)",
        letterSpacing: "0.1em", zIndex: 1001,
      }}>
        {index + 1} / {imagens.length}
      </div>

      {/* Seta esquerda */}
      {imagens.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          style={{
            position: "fixed", left: "16px", top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "50%", width: "42px", height: "42px",
            color: "#fff", fontSize: "18px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1001, transition: "background 0.15s",
          }}
        >‹</button>
      )}

      {/* Imagem principal */}
      <img
        src={`data:image/jpeg;base64,${imagens[index]}`}
        alt={`Foto ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw", maxHeight: "88vh",
          borderRadius: "10px", objectFit: "contain",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          display: "block",
        }}
      />

      {/* Seta direita */}
      {imagens.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          style={{
            position: "fixed", right: "16px", top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "50%", width: "42px", height: "42px",
            color: "#fff", fontSize: "18px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1001, transition: "background 0.15s",
          }}
        >›</button>
      )}

      {/* Miniaturas em baixo */}
      {imagens.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: "8px", zIndex: 1001,
          }}
        >
          {imagens.map((b64, i) => (
            <button
              key={i}
              onClick={() => onPrev(i) /* reutilizamos onPrev com índice direto via wrapper */}
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
          }}>+ Loc</button>
          <button onClick={marcarEncontrada} style={{
            background: "var(--success-light)", border: "1px solid var(--success-border)",
            borderRadius: "6px", color: "var(--success)", fontSize: "12px",
            padding: "5px 11px", cursor: "pointer", fontFamily: "var(--font-sans)",
          }}>Encontrada?</button>
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
const Desaparecidas = ({ onCountChange }) => {
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
};

export default Desaparecidas;