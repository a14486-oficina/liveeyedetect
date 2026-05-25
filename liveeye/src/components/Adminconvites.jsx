import { useState, useEffect } from "react";

import { API } from "../api.js";

const s = {
  label: {
    fontSize: "11px", fontWeight: 500, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.08em",
    fontFamily: "var(--font-mono)", marginBottom: "6px", display: "block",
  },
  input: {
    width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: "7px", color: "var(--text-primary)", fontFamily: "var(--font-sans)",
    fontSize: "13px", padding: "9px 13px", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  group: { display: "flex", flexDirection: "column" },
  card: {
    background: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: "12px", padding: "20px 16px",
    boxShadow: "var(--shadow-sm)", marginBottom: "14px",
  },
  sectionTitle: {
    fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.1em",
    fontFamily: "var(--font-mono)", marginBottom: "16px",
    paddingBottom: "10px", borderBottom: "1px solid var(--border)",
  },
};

const inputFocus = (e) => e.target.style.borderColor = "var(--accent)";
const inputBlur  = (e) => e.target.style.borderColor = "var(--border)";

const AdminConvites = () => {
  // Verificação de acesso
  const [autorizado, setAutorizado] = useState(false);

  // Password guardada na sessão para não ter de introduzir sempre
  const PASS_KEY = "liveeye_admin_pass";
  const savedPass = sessionStorage.getItem(PASS_KEY) || "";

  const [adminPassword, setAdminPassword] = useState(savedPass);
  const [gerando, setGerando] = useState(false);
  const [codigoGerado, setCodigoGerado] = useState(null);
  const [erroGerar, setErroGerar] = useState("");

  // Estado da lista de convites
  const [convites, setConvites] = useState([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [erroLista, setErroLista] = useState("");
  const [copiado, setCopiado] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("liveeye_user");
      if (raw) {
        const user = JSON.parse(raw);
        if (user?.isAdmin) setAutorizado(true);
      }
    } catch { /* silent */ }
  }, []);

  // Carrega a lista automaticamente se já tiver password guardada
  useEffect(() => {
    if (savedPass) carregarConvites(savedPass);
  }, []);

  const carregarConvites = async (password) => {
    if (!password) return;
    setLoadingLista(true);
    setErroLista("");
    try {
      const res = await fetch(`${API}/admin/convites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_password: password }),
      });
      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.erro || "Erro ao carregar");
      // Guarda a password na sessão após validação com sucesso
      sessionStorage.setItem(PASS_KEY, password);
      setConvites(data.convites || []);
    } catch (e) {
      setErroLista(e.message);
    }
    setLoadingLista(false);
  };

  const handleGerar = async () => {
    if (!adminPassword.trim()) { setErroGerar("Introduz a password de admin"); return; }
    setGerando(true);
    setErroGerar("");
    setCodigoGerado(null);
    try {
      const res = await fetch(`${API}/admin/gerar_convite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.erro || "Erro ao gerar");
      setCodigoGerado(data.codigo);
      // Guarda a password e recarrega a lista
      sessionStorage.setItem(PASS_KEY, adminPassword);
      await carregarConvites(adminPassword);
    } catch (e) {
      setErroGerar(e.message);
    }
    setGerando(false);
  };

  const handleVerLista = () => {
    sessionStorage.setItem(PASS_KEY, adminPassword);
    carregarConvites(adminPassword);
  };

  const copiar = (codigo, id) => {
    navigator.clipboard.writeText(codigo).then(() => {
      setCopiado(id);
      setTimeout(() => setCopiado(null), 2000);
    });
  };

  // Acesso negado
  if (!autorizado) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "12px" }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "12px",
          background: "var(--accent-light)", border: "1px solid var(--accent-border)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
        }}>⛔</div>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Acesso restrito</h2>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", margin: 0 }}>
          Esta página é exclusiva para administradores.
        </p>
      </div>
    );
  }

  const usados   = convites.filter((c) => c.codigo_usado);
  const disponiveis = convites.filter((c) => !c.codigo_usado);

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .convite-row { animation: fadeIn 0.2s ease; }
        .copy-btn:hover { background: var(--bg-raised) !important; }
      `}</style>

      <div>
        {/* Cabeçalho */}
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
            Gestão de Convites
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
            Gera e monitoriza códigos de acesso ao sistema
          </p>
        </div>

        {/* Estatísticas rápidas */}
        {convites.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            {[
              { label: "Total",       value: convites.length,      color: "var(--text-primary)",  bg: "var(--bg-surface)",    border: "var(--border)" },
              { label: "Disponíveis", value: disponiveis.length,   color: "var(--success)",        bg: "var(--success-light)", border: "var(--success-border)" },
              { label: "Usados",      value: usados.length,        color: "var(--accent)",         bg: "var(--accent-light)",  border: "var(--accent-border)" },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: stat.bg, border: `1px solid ${stat.border}`,
                borderRadius: "10px", padding: "12px 14px",
                boxShadow: "var(--shadow-sm)",
              }}>
                <p style={{ fontSize: "22px", fontWeight: 600, color: stat.color, fontFamily: "var(--font-mono)", margin: 0 }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "3px 0 0" }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Gerar convite */}
        <div style={s.card}>
          <p style={s.sectionTitle}>Gerar novo convite</p>

          <div style={{ ...s.group, marginBottom: "12px" }}>
            <label style={s.label}>Password de admin</label>
            <input
              style={s.input}
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !gerando && handleGerar()}
              placeholder="••••••••"
              onFocus={inputFocus}
              onBlur={inputBlur}
              disabled={gerando}
            />
          </div>

          {erroGerar && (
            <div style={{
              marginBottom: "12px", background: "var(--accent-light)", border: "1px solid var(--accent-border)",
              borderRadius: "7px", padding: "9px 14px", color: "var(--accent)",
              fontSize: "12px", fontFamily: "var(--font-mono)",
            }}>⚠ {erroGerar}</div>
          )}

          {/* Código gerado */}
          {codigoGerado && (
            <div style={{
              marginBottom: "12px", background: "var(--success-light)", border: "1px solid var(--success-border)",
              borderRadius: "9px", padding: "14px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
              animation: "fadeIn 0.2s ease",
            }}>
              <div>
                <p style={{ fontSize: "10px", color: "var(--success)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>
                  Código gerado
                </p>
                <p style={{ fontSize: "20px", fontWeight: 600, color: "var(--success)", fontFamily: "var(--font-mono)", margin: 0, letterSpacing: "0.12em" }}>
                  {codigoGerado}
                </p>
              </div>
              <button
                onClick={() => copiar(codigoGerado, "novo")}
                style={{
                  background: copiado === "novo" ? "var(--success)" : "var(--bg-surface)",
                  border: "1px solid var(--success-border)",
                  borderRadius: "7px", color: copiado === "novo" ? "#fff" : "var(--success)",
                  padding: "8px 14px", fontSize: "12px", cursor: "pointer",
                  fontFamily: "var(--font-mono)", transition: "all 0.15s", flexShrink: 0,
                }}
              >
                {copiado === "novo" ? "✓ Copiado" : "Copiar"}
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleGerar}
              disabled={gerando || !adminPassword}
              style={{
                flex: 1, background: gerando || !adminPassword ? "var(--accent-mid)" : "var(--accent)",
                border: "none", borderRadius: "7px", color: "#fff",
                padding: "11px", fontSize: "13px", fontWeight: 500,
                fontFamily: "var(--font-sans)", cursor: gerando || !adminPassword ? "not-allowed" : "pointer",
                transition: "all 0.12s",
              }}
            >
              {gerando ? "A gerar..." : "Gerar código"}
            </button>
            <button
              onClick={handleVerLista}
              disabled={loadingLista || !adminPassword}
              style={{
                background: "var(--bg-raised)", border: "1px solid var(--border)",
                borderRadius: "7px", color: "var(--text-secondary)",
                padding: "11px 18px", fontSize: "13px", fontFamily: "var(--font-sans)",
                cursor: loadingLista || !adminPassword ? "not-allowed" : "pointer",
                transition: "all 0.12s", flexShrink: 0,
              }}
            >
              {loadingLista ? "A carregar..." : "↻ Atualizar lista"}
            </button>
          </div>
        </div>

        {/* Lista de convites */}
        {convites.length > 0 && (
          <div style={s.card}>
            <p style={s.sectionTitle}>Todos os convites</p>

            {erroLista && (
              <div style={{
                marginBottom: "12px", background: "var(--accent-light)", border: "1px solid var(--accent-border)",
                borderRadius: "7px", padding: "9px 14px", color: "var(--accent)",
                fontSize: "12px", fontFamily: "var(--font-mono)",
              }}>⚠ {erroLista}</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {convites.map((c) => (
                <div key={c.id} className="convite-row" style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  background: c.codigo_usado ? "var(--bg-raised)" : "var(--bg-surface)",
                  border: `1px solid ${c.codigo_usado ? "var(--border)" : "var(--success-border)"}`,
                  borderRadius: "8px", padding: "11px 14px",
                  opacity: c.codigo_usado ? 0.65 : 1,
                }}>
                  {/* Indicador de estado */}
                  <div style={{
                    width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
                    background: c.codigo_usado ? "var(--text-muted)" : "var(--success)",
                  }} />

                  {/* Código */}
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 500,
                    color: c.codigo_usado ? "var(--text-muted)" : "var(--text-primary)",
                    letterSpacing: "0.1em", flex: 1, minWidth: 0,
                  }}>
                    {c.codigo_validacao}
                  </span>

                  {/* Data de criação */}
                  <span style={{
                    fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-muted)",
                    flexShrink: 0, display: "flex", alignItems: "center",
                  }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-PT") : "—"}
                  </span>

                  {/* Badge de estado */}
                  <span style={{
                    fontSize: "10px", fontFamily: "var(--font-mono)",
                    padding: "2px 8px", borderRadius: "99px", flexShrink: 0,
                    background: c.codigo_usado ? "var(--bg-subtle)" : "var(--success-light)",
                    color: c.codigo_usado ? "var(--text-muted)" : "var(--success)",
                    border: `1px solid ${c.codigo_usado ? "var(--border)" : "var(--success-border)"}`,
                  }}>
                    {c.codigo_usado ? "Usado" : "Disponível"}
                  </span>

                  {/* Botão copiar (só para disponíveis) */}
                  {!c.codigo_usado && (
                    <button
                      className="copy-btn"
                      onClick={() => copiar(c.codigo_validacao, c.id)}
                      style={{
                        background: copiado === c.id ? "var(--success)" : "transparent",
                        border: `1px solid ${copiado === c.id ? "var(--success)" : "var(--border)"}`,
                        borderRadius: "6px", color: copiado === c.id ? "#fff" : "var(--text-muted)",
                        padding: "4px 10px", fontSize: "11px", cursor: "pointer",
                        fontFamily: "var(--font-mono)", transition: "all 0.15s", flexShrink: 0,
                      }}
                    >
                      {copiado === c.id ? "✓" : "Copiar"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado vazio (lista carregada mas sem convites) */}
        {!loadingLista && convites.length === 0 && adminPassword && (
          <div style={{
            textAlign: "center", padding: "48px 20px", color: "var(--text-muted)",
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "12px",
          }}>
            <div style={{ fontSize: "26px", marginBottom: "10px" }}>○</div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
              Nenhum convite gerado ainda.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminConvites;