import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
    fontSize: "16px", padding: "10px 13px", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  group: { display: "flex", flexDirection: "column", marginBottom: "14px" },
  btn: {
    width: "100%", background: "var(--accent)", border: "none", borderRadius: "7px",
    color: "#fff", padding: "12px", fontSize: "14px", fontWeight: 500,
    fontFamily: "var(--font-sans)", cursor: "pointer", transition: "all 0.15s",
    letterSpacing: "0.01em",
  },
  btnDisabled: { background: "var(--accent-mid)", cursor: "not-allowed" },
  btnOutline: {
    width: "100%", background: "none",
    border: "1px solid var(--border)", borderRadius: "7px",
    color: "var(--text-secondary)", padding: "11px", fontSize: "14px",
    fontFamily: "var(--font-sans)", cursor: "pointer", transition: "all 0.15s",
    marginTop: "8px",
  },
  error: {
    marginBottom: "14px", background: "var(--accent-light)",
    border: "1px solid var(--accent-border)", borderRadius: "7px",
    padding: "10px 14px", color: "var(--accent)", fontSize: "12px",
    fontFamily: "var(--font-mono)",
  },
  success: {
    marginBottom: "14px", background: "var(--success-light)",
    border: "1px solid var(--success-border)", borderRadius: "7px",
    padding: "10px 14px", color: "var(--success)", fontSize: "12px",
    fontFamily: "var(--font-mono)",
  },
  link: {
    background: "none", border: "none", color: "var(--accent)",
    fontFamily: "var(--font-mono)", fontSize: "11px", cursor: "pointer",
    textDecoration: "underline", padding: 0,
  },
};

const inputFocus = (e) => (e.target.style.borderColor = "var(--accent)");
const inputBlur  = (e) => (e.target.style.borderColor = "var(--border)");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Logo = () => (
  <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
    <img src="/logo-light.png" alt="LiveDetect" className="logo-light"
      style={{ height: "72px", width: "auto" }} />
    <img src="/logo-dark.png" alt="LiveDetect" className="logo-dark"
      style={{ height: "72px", width: "auto", display: "none" }} />
    <style>{`
      html.dark .logo-light { display: none !important; }
      html.dark .logo-dark  { display: block !important; }
    `}</style>
  </div>
);

const PainelLogin = ({ onRegister, onRecover }) => {
  const navigate = useNavigate();
  const [form, setForm]         = useState({ email: "", pass: "" });
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    if (!form.email.trim() || !form.pass) { setError("Preenche todos os campos."); return; }
    if (!emailRegex.test(form.email.trim())) { setError("Introduz um email válido."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), password: form.pass }),
      });
      const data = await res.json();
      if (!res.ok || data.erro) { setError(data.erro || "Credenciais inválidas."); return; }
      sessionStorage.setItem("liveeye_user", JSON.stringify({ id: data.id, nome: data.nome, email: data.email, isAdmin: data.isAdmin, token: data.token }));
      navigate("/dashboard");
    } catch {
      setError("Não foi possível ligar ao servidor.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <Logo />
        <h1 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
          Bem-vindo ao LiveEye
        </h1>

      </div>

      <div style={s.group}>
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" value={form.email} onChange={set("email")}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          onFocus={inputFocus} onBlur={inputBlur}
          placeholder="ex: operador@liveeye.pt" autoComplete="email" autoFocus />
      </div>

      <div style={s.group}>
        <label style={s.label}>Palavra-passe</label>
        <div style={{ position: "relative" }}>
          <input style={{ ...s.input, paddingRight: "52px" }}
            type={showPass ? "text" : "password"} value={form.pass} onChange={set("pass")}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            onFocus={inputFocus} onBlur={inputBlur}
            placeholder="••••••••" autoComplete="current-password" />
          <button onClick={() => setShowPass((v) => !v)} tabIndex={-1} style={{
            position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", padding: "4px",
            color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-mono)",
          }}>{showPass ? "ocultar" : "ver"}</button>
        </div>
        <button onClick={onRecover} style={{ ...s.link, marginTop: "6px", alignSelf: "flex-end" }}>
          Esqueceste a palavra-passe?
        </button>
      </div>

      {error && <div style={s.error}>⚠ {error}</div>}

      <button className="login-btn" onClick={handleSubmit} disabled={loading}
        style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}>
        {loading ? "A verificar..." : "Entrar"}
      </button>
      <button onClick={onRegister} style={s.btnOutline}>Criar conta</button>


    </>
  );
};

const PainelRegisto = ({ onBack }) => {
  const navigate = useNavigate();
  const [form, setForm]         = useState({ nome: "", email: "", pass: "", pass2: "" });
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    if (!form.nome.trim() || !form.email.trim() || !form.pass || !form.pass2)
      { setError("Preenche todos os campos."); return; }
    if (!emailRegex.test(form.email.trim()))
      { setError("Introduz um email válido."); return; }
    if (form.pass.length < 6)
      { setError("A palavra-passe deve ter pelo menos 6 caracteres."); return; }
    if (form.pass !== form.pass2)
      { setError("As palavras-passe não coincidem."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/registar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.pass,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.erro) { setError(data.erro || "Erro ao criar conta."); return; }
      sessionStorage.setItem("liveeye_user", JSON.stringify({ id: data.id, nome: data.nome, email: data.email, isAdmin: data.isAdmin, token: data.token }));
      navigate("/dashboard");
    } catch { setError("Não foi possível ligar ao servidor."); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <Logo />
        <h1 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>Criar conta</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", margin: 0 }}>
          Regista-te gratuitamente
        </p>
      </div>

      {[
        { label: "Nome completo", key: "nome", type: "text",     ph: "ex: João Silva",           auto: "name" },
        { label: "Email",         key: "email", type: "email",   ph: "ex: joao@liveeye.pt",       auto: "email" },
        { label: "Palavra-passe", key: "pass",  type: showPass ? "text" : "password", ph: "mín. 6 caracteres", auto: "new-password" },
        { label: "Confirmar",     key: "pass2", type: showPass ? "text" : "password", ph: "repete a palavra-passe", auto: "new-password" },
      ].map(({ label, key, type, ph, auto }) => (
        <div key={key} style={s.group}>
          <label style={s.label}>{label}</label>
          <input style={s.input} type={type} value={form[key]} onChange={set(key)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            onFocus={inputFocus} onBlur={inputBlur}
            placeholder={ph} autoComplete={auto} />
        </div>
      ))}

      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "14px" }}>
        <input type="checkbox" checked={showPass} onChange={(e) => setShowPass(e.target.checked)} />
        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          Mostrar palavras-passe
        </span>
      </label>

      {error && <div style={s.error}>⚠ {error}</div>}

      <button className="login-btn" onClick={handleSubmit} disabled={loading}
        style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}>
        {loading ? "A criar conta..." : "Criar conta"}
      </button>
      <button onClick={onBack} style={s.btnOutline}>← Voltar ao login</button>
    </>
  );
};

const PainelRecuperacao = ({ onBack }) => {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaPass, setNovaPass] = useState("");
  const [novaPass2, setNovaPass2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const pedirCodigo = async () => {
    setError(""); setSuccess("");
    if (!email.trim() || !emailRegex.test(email.trim())) { setError("Introduz um email válido."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/recuperar/pedir`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.erro || "Erro");
      setSuccess("Código enviado para o teu email.");
      setStep("codigo");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const verificarCodigo = async () => {
    setError(""); setSuccess("");
    if (codigo.length !== 6) { setError("O código deve ter 6 dígitos."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/recuperar/verificar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), codigo }),
      });
      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.erro || "Código inválido");
      setStep("nova");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const definirNova = async () => {
    setError(""); setSuccess("");
    if (novaPass.length < 6) { setError("A palavra-passe deve ter pelo menos 6 caracteres."); return; }
    if (novaPass !== novaPass2) { setError("As palavras-passe não coincidem."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/recuperar/redefinir`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), codigo, nova_password: novaPass }),
      });
      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.erro || "Erro");
      setSuccess("Palavra-passe alterada! Redirecionar...");
      setTimeout(onBack, 1800);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const titles = {
    email:  ["Recuperar acesso",    "Indica o email da tua conta"],
    codigo: ["Verificar código",    `Código enviado para ${email}`],
    nova:   ["Nova palavra-passe",  "Define a tua nova palavra-passe"],
  };
  const steps = ["email", "codigo", "nova"];

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <Logo />
        <h1 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
          {titles[step][0]}
        </h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", margin: 0 }}>
          {titles[step][1]}
        </p>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        {steps.map((st, i) => (
          <div key={st} style={{
            flex: 1, height: "3px", borderRadius: "99px", transition: "background 0.3s",
            background: steps.indexOf(step) >= i ? "var(--accent)" : "var(--border)",
          }} />
        ))}
      </div>

      {success && <div style={s.success}>✓ {success}</div>}
      {error   && <div style={s.error}>⚠ {error}</div>}

      {step === "email" && (
        <>
          <div style={s.group}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pedirCodigo()}
              onFocus={inputFocus} onBlur={inputBlur}
              placeholder="ex: operador@liveeye.pt" autoFocus />
          </div>
          <button className="login-btn" onClick={pedirCodigo} disabled={loading}
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}>
            {loading ? "A enviar..." : "Enviar código"}
          </button>
          <button onClick={onBack} style={s.btnOutline}>← Voltar ao login</button>
        </>
      )}

      {step === "codigo" && (
        <>
          <div style={s.group}>
            <label style={s.label}>Código de 6 dígitos</label>
            <input
              style={{ ...s.input, fontSize: "24px", letterSpacing: "0.35em", textAlign: "center" }}
              type="text" inputMode="numeric" maxLength={6}
              value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && verificarCodigo()}
              onFocus={inputFocus} onBlur={inputBlur}
              placeholder="000000" autoFocus />
          </div>
          <button className="login-btn" onClick={verificarCodigo} disabled={loading}
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}>
            {loading ? "A verificar..." : "Verificar código"}
          </button>
          <button onClick={() => { setStep("email"); setError(""); setSuccess(""); setCodigo(""); }}
            style={s.btnOutline}>Reenviar código</button>
        </>
      )}

      {step === "nova" && (
        <>
          <div style={s.group}>
            <label style={s.label}>Nova palavra-passe</label>
            <input style={s.input} type={showPass ? "text" : "password"} value={novaPass}
              onChange={(e) => setNovaPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && definirNova()}
              onFocus={inputFocus} onBlur={inputBlur}
              placeholder="mín. 6 caracteres" autoFocus />
          </div>
          <div style={s.group}>
            <label style={s.label}>Confirmar palavra-passe</label>
            <input style={s.input} type={showPass ? "text" : "password"} value={novaPass2}
              onChange={(e) => setNovaPass2(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && definirNova()}
              onFocus={inputFocus} onBlur={inputBlur}
              placeholder="repete a palavra-passe" />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "14px" }}>
            <input type="checkbox" checked={showPass} onChange={(e) => setShowPass(e.target.checked)} />
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              Mostrar palavras-passe
            </span>
          </label>
          <button className="login-btn" onClick={definirNova} disabled={loading}
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}>
            {loading ? "A guardar..." : "Guardar nova palavra-passe"}
          </button>
        </>
      )}
    </>
  );
};

const Login = () => {
  const [painel, setPainel] = useState("login");
  const subtitles = { login: "/ Acesso", registo: "/ Registo", recuperacao: "/ Recuperação" };

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
        .login-card { animation: fade-up 0.3s ease; }
        .login-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .login-btn:active:not(:disabled) { transform: scale(0.98); }

        /* Mobile login tweaks */
        @media (max-width: 480px) {
          .login-card {
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
            padding: 28px 20px !important;
          }
          .login-main {
            padding: 0 !important;
            align-items: flex-start !important;
          }
        }
      `}</style>

      <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", background: "var(--bg)", fontFamily: "var(--font-sans)" }}>

        <main className="login-main" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
          <div key={painel} className="login-card" style={{
            width: "100%", maxWidth: "390px",
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "14px", padding: "32px 28px", boxShadow: "var(--shadow-md)",
          }}>
            {painel === "login"       && <PainelLogin       onRegister={() => setPainel("registo")} onRecover={() => setPainel("recuperacao")} />}
            {painel === "registo"     && <PainelRegisto      onBack={() => setPainel("login")} />}
            {painel === "recuperacao" && <PainelRecuperacao  onBack={() => setPainel("login")} />}
          </div>
        </main>

      </div>
    </>
  );
};

export default Login;