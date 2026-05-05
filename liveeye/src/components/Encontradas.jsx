import { useState, useEffect } from "react";
 
const API = "http://127.0.0.1:8000";
 
const Encontradas = ({ onCountChange }) => {
  const [pessoas, setPessoas] = useState([]);
  const [loading, setLoading] = useState(true);
 
  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/pessoas_listar_encontradas`);
      const data = await res.json();
      setPessoas(data);
      onCountChange(data.length);
    } catch { /* silent */ }
    setLoading(false);
  };
 
  useEffect(() => { carregar(); }, []);
 
  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", fontWeight: 700, color: "#f0eee8", margin: 0 }}>
          Pessoas Encontradas
        </h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
          Registos de pessoas já localizadas
        </p>
      </div>
 
      {/* Stat */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "10px",
        background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
        borderRadius: "10px", padding: "12px 20px", marginBottom: "24px",
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "28px", fontWeight: 700, color: "#22c55e" }}>
          {pessoas.length}
        </span>
        <span style={{
          fontSize: "10px", fontWeight: 600, color: "#22c55e",
          textTransform: "uppercase", letterSpacing: "0.1em",
          fontFamily: "'JetBrains Mono', monospace",
        }}>Encontradas</span>
      </div>
 
      {loading ? (
        <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }}>A carregar...</p>
      ) : pessoas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>✓</div>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }}>Nenhuma pessoa encontrada ainda.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {pessoas.map((p) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: "14px",
              background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
              borderRadius: "12px", padding: "14px 18px",
              animation: "slideIn 0.3s ease",
            }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: "#22c55e", flexShrink: 0,
                boxShadow: "0 0 8px rgba(34,197,94,0.5)",
              }} />
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: 600, color: "#22c55e" }}>
                {p.nome}
              </span>
              <span style={{
                marginLeft: "auto", fontSize: "10px",
                fontFamily: "'JetBrains Mono', monospace",
                background: "rgba(34,197,94,0.12)", color: "#22c55e",
                padding: "2px 8px", borderRadius: "99px",
              }}>Localizada</span>
            </div>
          ))}
        </div>
      )}
 
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  );
};
 
export default Encontradas;