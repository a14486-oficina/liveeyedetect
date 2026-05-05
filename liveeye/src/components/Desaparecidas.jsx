import { useState, useEffect } from "react";
 
const API = "http://127.0.0.1:8000";
 
const s = {
  label: {
    fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase", letterSpacing: "0.1em",
    fontFamily: "'JetBrains Mono', monospace",
  },
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
      // Refresh details
      const r2 = await fetch(`${API}/pessoas/${pessoa.id}`);
      setDetails(await r2.json());
    }
  };
 
  const inputStyle = {
    flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px", color: "#f0eee8", fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px", padding: "7px 10px", outline: "none", minWidth: 0,
  };
 
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "12px", marginBottom: "8px", overflow: "hidden",
      transition: "border-color 0.15s",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={toggleOpen} style={{
          flex: 1, display: "flex", alignItems: "center", gap: "10px",
          background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0,
        }}>
          <span style={{
            fontSize: "9px", color: "rgba(255,255,255,0.3)",
            transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0deg)",
            display: "inline-block",
          }}>▶</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 600, color: "#f0eee8" }}>
            {pessoa.nome}
          </span>
          <span style={{
            fontSize: "10px", fontFamily: "'JetBrains Mono', monospace",
            background: "rgba(245,158,11,0.12)", color: "#f59e0b",
            padding: "2px 8px", borderRadius: "99px",
          }}>Desaparecido/a</span>
        </button>
 
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => setAddingLoc((a) => !a)} style={{
            background: "none", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px", color: "rgba(255,255,255,0.5)", fontSize: "12px",
            padding: "6px 12px", cursor: "pointer", fontFamily: "'Syne', sans-serif",
          }}>+ Loc</button>
          <button onClick={marcarEncontrada} style={{
            background: "none", border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "6px", color: "#22c55e", fontSize: "12px",
            padding: "6px 12px", cursor: "pointer", fontFamily: "'Syne', sans-serif",
          }}>Encontrada?</button>
        </div>
      </div>
 
      {/* Add location inline */}
      {addingLoc && (
        <div style={{
          padding: "0 18px 14px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: "14px",
        }}>
          <p style={{ ...s.label, marginBottom: "10px" }}>Nova localização</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[["lat", "Latitude"], ["lon", "Longitude"], ["data", "Data DD/MM/AAAA"], ["hora", "Hora HH:MM"]].map(([k, ph]) => (
              <input key={k} style={{ ...inputStyle, flex: "1 1 120px" }}
                value={newLoc[k]} placeholder={ph}
                onChange={(e) => setNewLoc((n) => ({ ...n, [k]: e.target.value }))} />
            ))}
            <button onClick={submitLoc} style={{
              background: "#e63946", border: "none", borderRadius: "6px", color: "#fff",
              fontSize: "12px", padding: "7px 14px", cursor: "pointer",
              fontFamily: "'Syne', sans-serif", fontWeight: 600,
            }}>Guardar</button>
          </div>
        </div>
      )}
 
      {/* Details */}
      {open && (
        <div style={{
          padding: "0 18px 18px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: "16px",
          animation: "fadeIn 0.2s ease",
        }}>
          {loadingDetails ? (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>
              A carregar...
            </p>
          ) : details ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
                {[
                  ["Idade", `${details.idade} anos`],
                  ["Sexo", details.sexo],
                  ["Residência", `${details.local_de_residencia?.lat}, ${details.local_de_residencia?.lon}`],
                ].map(([k, v]) => (
                  <div key={k} style={{
                    background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "10px 14px",
                  }}>
                    <span style={{ ...s.label, display: "block", marginBottom: "4px" }}>{k}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#f0eee8" }}>{v}</span>
                  </div>
                ))}
              </div>
 
              <p style={{ ...s.label, marginBottom: "10px" }}>Histórico de localizações</p>
              {details.localizacoes?.length > 0 ? (
                <div style={{
                  background: "rgba(0,0,0,0.2)", borderRadius: "8px", overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}>
                  {details.localizacoes.map((loc, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "14px",
                      padding: "9px 14px", borderBottom: i < details.localizacoes.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}>
                      <span style={{ color: "#e63946", fontSize: "11px" }}>◎</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "#f0eee8" }}>
                        {loc.lat} | {loc.lon}
                      </span>
                      <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                        {loc.data && loc.hora ? `${loc.data} ${loc.hora}` : "Sem registo de tempo"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>
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
      onCountChange(data.length);
    } catch { /* silent */ }
    setLoading(false);
  };
 
  useEffect(() => { carregar(); }, []);
 
  const handleFound = (id) => {
    setPessoas((p) => {
      const updated = p.filter((x) => x.id !== id);
      onCountChange(updated.length);
      return updated;
    });
  };
 
  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", fontWeight: 700, color: "#f0eee8", margin: 0 }}>
          Pessoas Desaparecidas
        </h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
          {pessoas.length} registo{pessoas.length !== 1 ? "s" : ""} ativo{pessoas.length !== 1 ? "s" : ""}
        </p>
      </div>
 
      {/* Stat */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "10px",
        background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
        borderRadius: "10px", padding: "12px 20px", marginBottom: "24px",
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "28px", fontWeight: 700, color: "#f59e0b" }}>
          {pessoas.length}
        </span>
        <span style={{ ...s.label, color: "#f59e0b" }}>Desaparecidas</span>
      </div>
 
      {loading ? (
        <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }}>A carregar...</p>
      ) : pessoas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>◎</div>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }}>Nenhuma pessoa desaparecida registada.</p>
        </div>
      ) : (
        pessoas.map((p) => <PersonRow key={p.id} pessoa={p} onFoundSuccess={handleFound} />)
      )}
 
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};
 
export default Desaparecidas;