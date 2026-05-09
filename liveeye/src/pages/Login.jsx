import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://127.0.0.1:8000";

const s = {
  label: {
    fontSize: "11px", fontWeight: 500, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.08em",
    fontFamily: "var(--font-mono)", marginBottom: "6px", display: "block",
  },
  input: {
    width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: "7px", color: "var(--text-primary)", fontFamily: "var(--font-sans)",
    fontSize: "13px", padding: "10px 13px", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  group: { display: "flex", flexDirection: "column", marginBottom: "16px" },
};

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: "", pass: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError("");

    if (!form.email.trim() || !form.pass) {
      setError("Preenche todos os campos.");
      return;
    }

    // Validação básica de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError("Introduz um email válido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.pass,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.erro) {
        setError(data.erro || "Credenciais inválidas. Tenta novamente.");
        return;
      }

      // Guarda a sessão no sessionStorage
      // (limpa automaticamente quando o browser fecha)
      sessionStorage.setItem("liveeye_user", JSON.stringify({
        id: data.id,
        nome: data.nome,
        email: data.email,
      }));

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Não foi possível ligar ao servidor. Verifica se está ativo.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };
  const inputFocus = (e) => (e.target.style.borderColor = "var(--accent)");
  const inputBlur  = (e) => (e.target.style.borderColor = "var(--border)");

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-card { animation: fade-up 0.35s ease; }
        .login-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .login-btn:active:not(:disabled) { transform: scale(0.98); }
      `}</style>

      <div style={{
        minHeight: "100svh", display: "flex", flexDirection: "column",
        background: "var(--bg)", fontFamily: "var(--font-sans)",
      }}>

        {/* Header */}
        <header style={{
          display: "flex", alignItems: "center",
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
              LiveEye
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> / Acesso</span>
            </span>
          </div>
        </header>

        {/* Body */}
        <main style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "32px 20px",
        }}>
          <div className="login-card" style={{
            width: "100%", maxWidth: "380px",
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "14px", padding: "36px 32px",
            boxShadow: "var(--shadow-md)",
          }}>

            {/* Icon + title */}
            <div style={{ textAlign: "center", marginBottom: "30px" }}>
              <div style={{ position: "relative", display: "inline-block", marginBottom: "18px" }}>
                <div style={{
                  width: "48px", height: "48px", borderRadius: "12px",
                  background: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "22px", color: "#fff", margin: "0 auto",
                }}>◎</div>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "12px",
                  background: "var(--accent)",
                  animation: "pulse-ring 2.5s ease-out infinite",
                  opacity: 0.25,
                }} />
              </div>
              <h1 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
                Bem-vindo ao LiveEye
              </h1>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", margin: 0 }}>
                Sistema PAP · Acesso restrito
              </p>
            </div>

            {/* Form */}
            <div style={s.group}>
              <label style={s.label}>Email</label>
              <input
                style={s.input}
                type="email"
                value={form.email}
                onChange={set("email")}
                onKeyDown={onKeyDown}
                onFocus={inputFocus}
                onBlur={inputBlur}
                placeholder="ex: operador@liveeye.pt"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div style={s.group}>
              <label style={s.label}>Palavra-passe</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...s.input, paddingRight: "42px" }}
                  type={showPass ? "text" : "password"}
                  value={form.pass}
                  onChange={set("pass")}
                  onKeyDown={onKeyDown}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  onClick={() => setShowPass((v) => !v)}
                  style={{
                    position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: "4px",
                    color: "var(--text-muted)", fontSize: "13px", fontFamily: "var(--font-mono)",
                    lineHeight: 1,
                  }}
                  tabIndex={-1}
                >
                  {showPass ? "ocultar" : "ver"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                marginBottom: "16px",
                background: "var(--accent-light)", border: "1px solid var(--accent-border)",
                borderRadius: "7px", padding: "10px 14px",
                color: "var(--accent)", fontSize: "12px", fontFamily: "var(--font-mono)",
              }}>
                ⚠ {error}
              </div>
            )}

            <button
              className="login-btn"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%", background: loading ? "var(--accent-mid)" : "var(--accent)",
                border: "none", borderRadius: "7px", color: "#fff",
                padding: "11px", fontSize: "13px", fontWeight: 500,
                fontFamily: "var(--font-sans)", cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.15s", letterSpacing: "0.01em",
              }}
            >
              {loading ? "A verificar..." : "Entrar"}
            </button>

            {/* Divider + hint */}
            <div style={{
              marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border)",
              textAlign: "center",
            }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                Acesso apenas para operadores autorizados
              </span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer style={{
          padding: "14px 28px", borderTop: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            v1.0.0
          </span>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            LiveEye · Sistema PAP
          </span>
        </footer>
      </div>
    </>
  );
};

export default Login;