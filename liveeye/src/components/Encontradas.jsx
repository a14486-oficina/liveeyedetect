import { useState, useEffect, forwardRef, useImperativeHandle } from "react";

import { API } from "../api.js";
import PersonMap from "./PersonMap.jsx";
import { PhotoGallery } from "./Desaparecidas.jsx";

const s = {
  label: {
    fontSize: "10px", fontWeight: 500, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.09em",
    fontFamily: "var(--font-mono)",
  },
};

const parseDatetime = (loc) => {
  if (!loc.data && !loc.hora) return 0;
  const [d, m, y] = (loc.data || "01/01/1970").split("/");
  const [h, min] = (loc.hora || "00:00").split(":");
  return new Date(`${y}-${m}-${d}T${h}:${min}:00`).getTime();
};

const FoundRow = ({ pessoa }) => {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const ultimaLoc = (pessoa.localizacoes || [])
    .filter((l) => l.lat != null && l.lon != null)
    .sort((a, b) => parseDatetime(a) - parseDatetime(b))
    .pop();

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

  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--success-border)",
      borderRadius: "10px", marginBottom: "6px", overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
    }}>
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
            background: "var(--success-light)", color: "var(--success)",
            padding: "2px 8px", borderRadius: "99px", border: "1px solid var(--success-border)",
          }}>Localizada</span>
          {ultimaLoc && (
            <span style={{
              marginLeft: "8px", fontFamily: "var(--font-mono)", fontSize: "11px",
              color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {ultimaLoc.lat} | {ultimaLoc.lon}
              {ultimaLoc.data && ultimaLoc.hora ? ` — ${ultimaLoc.data} ${ultimaLoc.hora}` : ""}
            </span>
          )}
        </button>
      </div>

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

              <PersonMap
                homeCoords={details.local_de_residencia}
                localizacoes={details.localizacoes}
                foundCoords={ultimaLoc}
              />

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

              {ultimaLoc && (
                <div style={{
                  background: "var(--success-light)", borderRadius: "7px", padding: "12px 13px",
                  marginBottom: "14px", border: "1px solid var(--success-border)",
                }}>
                  <span style={{ ...s.label, display: "block", marginBottom: "6px", color: "var(--success)" }}>
                    Localizada em
                  </span>
                  <p style={{
                    fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-primary)",
                    margin: 0, lineHeight: "1.5",
                  }}>
                    Coordenadas: {ultimaLoc.lat}, {ultimaLoc.lon}
                    {ultimaLoc.data || ultimaLoc.hora ? ` — ${ultimaLoc.data || ""}${ultimaLoc.data && ultimaLoc.hora ? " " : ""}${ultimaLoc.hora || ""}` : ""}
                  </p>
                </div>
              )}

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

              <p style={{ ...s.label, marginBottom: "10px" }}>Histórico de localizações</p>
              {details.localizacoes?.length > 0 ? (
                <div style={{
                  background: "var(--bg-raised)", borderRadius: "7px", overflow: "hidden",
                  border: "1px solid var(--border)",
                }}>
                  {details.localizacoes.map((loc, i) => {
                    const isFound = ultimaLoc && loc.lat === ultimaLoc.lat && loc.lon === ultimaLoc.lon;
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: "13px",
                        padding: "9px 13px",
                        borderBottom: i < details.localizacoes.length - 1 ? "1px solid var(--border)" : "none",
                        background: isFound ? "var(--success-light)" : "transparent",
                      }}>
                        <span style={{ color: isFound ? "var(--success)" : "var(--accent)", fontSize: "10px" }}>
                          {isFound ? "✓" : "◎"}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-primary)" }}>
                          {loc.lat} | {loc.lon}
                        </span>
                        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
                          {loc.data && loc.hora ? `${loc.data} ${loc.hora}` : "Sem registo de tempo"}
                          {isFound ? " (Localizada)" : ""}
                        </span>
                      </div>
                    );
                  })}
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

const Encontradas = forwardRef(({ onCountChange }, ref) => {
  const [pessoas, setPessoas] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/pessoas_listar_encontradas`);
      const data = await res.json();

      const comDetalhes = await Promise.all(
        data.map(async (p) => {
          try {
            const r = await fetch(`${API}/pessoas/${p.id}`);
            const detalhes = await r.json();
            return { ...p, ...detalhes };
          } catch {
            return p;
          }
        })
      );

      setPessoas(comDetalhes);
      onCountChange(data.length);
    } catch { /* silent */ }
    setLoading(false);
  };

  useImperativeHandle(ref, () => ({ reload: carregar }));

  useEffect(() => { carregar(); }, []);

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
          Pessoas Encontradas
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
          Registos de pessoas já localizadas
        </p>
      </div>

      <div style={{
        display: "inline-flex", alignItems: "center", gap: "10px",
        background: "var(--success-light)", border: "1px solid var(--success-border)",
        borderRadius: "9px", padding: "12px 20px", marginBottom: "24px",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 500, color: "var(--success)" }}>
          {pessoas.length}
        </span>
        <span style={{ ...s.label, color: "var(--success)" }}>Encontradas</span>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>A carregar...</p>
      ) : pessoas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "26px", marginBottom: "12px" }}>✓</div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>Nenhuma pessoa encontrada ainda.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {pessoas.map((p) => (
            <FoundRow key={p.id} pessoa={p} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
});

export default Encontradas;
