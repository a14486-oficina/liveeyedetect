import { useState, useEffect } from "react";

const API = "http://127.0.0.1:8000";

const s = {
  label: {
    fontSize: "10px", fontWeight: 500, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.09em",
    fontFamily: "var(--font-mono)",
  },
};

const PhotoGallery = ({ imagens }) => {
  const [selected, setSelected] = useState(0);
  if (!imagens || imagens.length === 0) return null;

  return (
    <div style={{ marginBottom: "20px" }}>
      <span style={{ ...s.label, display: "block", marginBottom: "10px" }}>
        Fotografias ({imagens.length})
      </span>
      <div style={{
        width: "100%", borderRadius: "9px", overflow: "hidden",
        border: "1px solid var(--border)", marginBottom: "10px",
        background: "var(--bg-raised)", maxHeight: "650px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <img src={`data:image/jpeg;base64,${imagens[selected]}`} alt={`Foto ${selected + 1}`}
          style={{ width: "100%", maxHeight: "650px", objectFit: "cover", display: "block" }} />
      </div>
      {imagens.length > 1 && (
        <div style={{ display: "flex", gap: "8px" }}>
          {imagens.map((b64, i) => (
            <button key={i} onClick={() => setSelected(i)} style={{
              flex: "1 1 0", aspectRatio: "1 / 1", padding: 0, border: "none",
              borderRadius: "7px", overflow: "hidden", cursor: "pointer",
              outline: selected === i ? `2px solid var(--accent)` : "2px solid transparent",
              outlineOffset: "2px", transition: "opacity 0.15s, outline-color 0.15s",
              opacity: selected === i ? 1 : 0.5,
            }}>
              <img src={`data:image/jpeg;base64,${b64}`} alt={`Miniatura ${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
      `}</style>
    </div>
  );
};

export default Desaparecidas;