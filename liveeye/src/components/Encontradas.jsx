import { useState, useEffect, forwardRef, useImperativeHandle } from "react";

import { API } from "../api.js";

const Encontradas = forwardRef(({ onCountChange }, ref) => {
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
        <span style={{
          fontSize: "10px", fontWeight: 500, color: "var(--success)",
          textTransform: "uppercase", letterSpacing: "0.09em",
          fontFamily: "var(--font-mono)",
        }}>Encontradas</span>
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
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: "13px",
              background: "var(--bg-surface)", border: "1px solid var(--success-border)",
              borderRadius: "9px", padding: "13px 16px",
              boxShadow: "var(--shadow-sm)",
              animation: "slideIn 0.25s ease",
            }}>
              <div style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: "var(--success)", flexShrink: 0,
              }} />
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
                {p.nome}
              </span>
              <span style={{
                marginLeft: "auto", fontSize: "10px",
                fontFamily: "var(--font-mono)",
                background: "var(--success-light)", color: "var(--success)",
                padding: "2px 8px", borderRadius: "99px",
                border: "1px solid var(--success-border)",
              }}>Localizada</span>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  );
});

export default Encontradas;