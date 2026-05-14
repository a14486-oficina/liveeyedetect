import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://10.170.130.134:8000";

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

const Toggle = ({ checked, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    style={{
      position: "relative", width: "40px", height: "22px",
      borderRadius: "99px", border: "none", cursor: "pointer",
      background: checked ? "var(--accent)" : "var(--border-strong)",
      transition: "background 0.2s", flexShrink: 0, padding: 0,
    }}
  >
    <span style={{
      position: "absolute", top: "3px",
      left: checked ? "21px" : "3px",
      width: "16px", height: "16px", borderRadius: "50%",
      background: "#fff", transition: "left 0.2s",
      boxShadow: "0 1px 3px rgba(26,25,22,0.25)",
    }} />
  </button>
);

const ModalEliminar = ({ onConfirm, onCancel, loading, error }) => {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (step === 2) setTimeout(() => inputRef.current?.focus(), 60);
  }, [step]);

  const inputFocus = (e) => e.target.style.borderColor = "var(--accent)";
  const inputBlur  = (e) => e.target.style.borderColor = "var(--border)";

  return (
    <>
      <div onClick={onCancel} style={{
        position: "fixed", inset: 0, background: "rgba(26,25,22,0.45)",
        backdropFilter: "blur(3px)", zIndex: 400,
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "calc(100% - 32px)", maxWidth: "420px",
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "14px", padding: "24px 20px",
        boxShadow: "0 20px 60px rgba(26,25,22,0.18)",
        zIndex: 401, animation: "modalIn 0.18s cubic-bezier(0.2,0,0,1.1)",
      }}>
        <style>{`@keyframes modalIn {
          from { opacity:0; transform:translate(-50%,-47%) scale(0.96); }
          to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
        }`}</style>

        <div style={{
          width: "40px", height: "40px", borderRadius: "10px",
          background: "var(--accent-light)", border: "1px solid var(--accent-border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px", marginBottom: "14px",
        }}>⚠</div>

        {step === 1 && (
          <>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
              Eliminar conta?
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "20px" }}>
              Esta ação é <strong>permanente e irreversível</strong>. A tua conta será apagada definitivamente.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={onCancel} style={{
                flex: 1, background: "var(--bg-raised)", border: "1px solid var(--border)",
                borderRadius: "7px", color: "var(--text-secondary)",
                padding: "10px", fontSize: "13px", cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>Cancelar</button>
              <button onClick={() => setStep(2)} style={{
                flex: 1, background: "var(--accent)", border: "none", borderRadius: "7px", color: "#fff",
                padding: "10px", fontSize: "13px", cursor: "pointer",
                fontFamily: "var(--font-sans)", fontWeight: 500,
              }}>Sim, eliminar</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
              Confirma a tua identidade
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "16px" }}>
              Introduz a tua palavra-passe para confirmar.
            </p>
            <div style={s.group}>
              <label style={s.label}>Palavra-passe</label>
              <input ref={inputRef} style={s.input} type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && onConfirm(password)}
                placeholder="••••••••" onFocus={inputFocus} onBlur={inputBlur} disabled={loading} />
            </div>
            {error && (
              <div style={{
                marginTop: "10px", background: "var(--accent-light)", border: "1px solid var(--accent-border)",
                borderRadius: "7px", padding: "8px 12px", color: "var(--accent)",
                fontSize: "12px", fontFamily: "var(--font-mono)",
              }}>⚠ {error}</div>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button onClick={onCancel} disabled={loading} style={{
                flex: 1, background: "var(--bg-raised)", border: "1px solid var(--border)",
                borderRadius: "7px", color: "var(--text-secondary)",
                padding: "10px", fontSize: "13px",
                cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)",
              }}>Cancelar</button>
              <button onClick={() => onConfirm(password)} disabled={loading || !password} style={{
                flex: 1, background: loading || !password ? "var(--accent-mid)" : "var(--accent)",
                border: "none", borderRadius: "7px", color: "#fff",
                padding: "10px", fontSize: "13px",
                cursor: loading || !password ? "not-allowed" : "pointer",
                fontFamily: "var(--font-sans)", fontWeight: 500,
              }}>{loading ? "A eliminar..." : "Eliminar conta"}</button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

const useDarkMode = () => {
  const [dark, setDarkState] = useState(() => document.documentElement.classList.contains("dark"));
  const setDark = (val) => {
    setDarkState(val);
    if (val) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("liveeye_dark", val ? "1" : "0");
  };
  useEffect(() => {
    const saved = localStorage.getItem("liveeye_dark");
    if (saved === "1") setDark(true);
    else if (saved === "0") setDark(false);
  }, []);
  return [dark, setDark];
};

const inputFocus = (e) => e.target.style.borderColor = "var(--accent)";
const inputBlur  = (e) => e.target.style.borderColor = "var(--border)";

const UserSettings = () => {
  const navigate = useNavigate();
  const [dark, setDark] = useDarkMode();

  const raw = sessionStorage.getItem("liveeye_user");
  const sessionUser = raw ? JSON.parse(raw) : {};

  const [form, setForm] = useState({ nome: sessionUser.nome || "", email: sessionUser.email || "" });
  const [original] = useState({ nome: sessionUser.nome || "", email: sessionUser.email || "" });
  const temAlteracoes = form.nome !== original.nome || form.email !== original.email;

  const [perfilLoading, setPerfilLoading] = useState(false);
  const [perfilError, setPerfilError] = useState("");
  const [perfilSaved, setPerfilSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ atual: "", nova: "", confirmar: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [elimLoading, setElimLoading] = useState(false);
  const [elimError, setElimError] = useState("");

  const getInitials = () => {
    const name = form.nome || form.email || "";
    const parts = name.split(/[\s@]/);
    if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || "?";
  };

  const handleSavePerfil = async () => {
    setPerfilError(""); setPerfilSaved(false);
    if (!form.nome.trim() || !form.email.trim()) { setPerfilError("Preenche todos os campos."); return; }
    setPerfilLoading(true);
    try {
      const res = await fetch(`${API}/utilizadores/${sessionUser.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: form.nome.trim(), email: form.email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.erro || "Erro ao guardar");
      sessionStorage.setItem("liveeye_user", JSON.stringify({ ...sessionUser, nome: form.nome.trim(), email: form.email.trim() }));
      setPerfilSaved(true);
      setTimeout(() => setPerfilSaved(false), 3000);
    } catch (e) { setPerfilError(e.message || "Erro ao guardar"); }
    finally { setPerfilLoading(false); }
  };

  const handleSavePw = async () => {
    setPwError(""); setPwSaved(false);
    if (!pwForm.atual || !pwForm.nova || !pwForm.confirmar) { setPwError("Preenche todos os campos."); return; }
    if (pwForm.nova.length < 6) { setPwError("A nova palavra-passe deve ter pelo menos 6 caracteres."); return; }
    if (pwForm.nova !== pwForm.confirmar) { setPwError("As palavras-passe não coincidem."); return; }
    setPwLoading(true);
    try {
      const res = await fetch(`${API}/utilizadores/${sessionUser.id}/password`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password_atual: pwForm.atual, password_nova: pwForm.nova }),
      });
      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.erro || "Erro ao alterar");
      setPwForm({ atual: "", nova: "", confirmar: "" });
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (e) { setPwError(e.message || "Erro ao alterar"); }
    finally { setPwLoading(false); }
  };

  const handleEliminar = async (password) => {
    setElimError(""); setElimLoading(true);
    try {
      const res = await fetch(`${API}/utilizadores/${sessionUser.id}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.erro || "Erro ao eliminar");
      sessionStorage.removeItem("liveeye_user");
      navigate("/");
    } catch (e) { setElimError(e.message || "Erro ao eliminar"); }
    finally { setElimLoading(false); }
  };

  return (
    <>
      <style>{`
        .settings-pw-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .settings-profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 540px) {
          .settings-pw-grid { grid-template-columns: 1fr; }
          .settings-profile-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div>
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>Definições</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
            Gere a tua conta e preferências
          </p>
        </div>

        {/* Aparência */}
        <div style={s.card}>
          <p style={s.sectionTitle}>Aparência</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>Modo escuro</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "3px" }}>
                {dark ? "Interface escura ativa" : "Interface clara ativa"}
              </p>
            </div>
            <Toggle checked={dark} onChange={setDark} />
          </div>
        </div>

        {/* Perfil */}
        <div style={s.card}>
          <p style={s.sectionTitle}>Perfil</p>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
              background: "var(--accent-light)", border: "2px solid var(--accent-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent)", fontFamily: "var(--font-sans)" }}>
                {getInitials()}
              </span>
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{form.nome || "—"}</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", margin: 0 }}>{form.email || "—"}</p>
            </div>
          </div>

          <div className="settings-profile-grid">
            <div style={s.group}>
              <label style={s.label}>Nome</label>
              <input style={s.input} value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="O teu nome" onFocus={inputFocus} onBlur={inputBlur}
                disabled={perfilLoading} />
            </div>
            <div style={s.group}>
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com" onFocus={inputFocus} onBlur={inputBlur}
                disabled={perfilLoading} />
            </div>
          </div>

          {perfilError && (
            <div style={{ marginTop: "12px", background: "var(--accent-light)", border: "1px solid var(--accent-border)", borderRadius: "7px", padding: "9px 14px", color: "var(--accent)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>⚠ {perfilError}</div>
          )}
          {perfilSaved && (
            <div style={{ marginTop: "12px", background: "var(--success-light)", border: "1px solid var(--success-border)", borderRadius: "7px", padding: "9px 14px", color: "var(--success)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>✓ Perfil guardado com sucesso</div>
          )}

          <button
            onClick={handleSavePerfil}
            disabled={perfilLoading || !temAlteracoes}
            style={{
              marginTop: "16px", width: "100%",
              background: perfilLoading || !temAlteracoes ? "var(--accent-mid)" : "var(--accent)",
              border: "none", borderRadius: "7px", color: "#fff", padding: "11px",
              fontSize: "13px", fontWeight: 500, fontFamily: "var(--font-sans)",
              cursor: perfilLoading || !temAlteracoes ? "not-allowed" : "pointer",
            }}
          >
            {perfilLoading ? "A guardar..." : "Guardar alterações"}
          </button>
        </div>

        {/* Segurança */}
        <div style={s.card}>
          <p style={s.sectionTitle}>Segurança</p>

          <div className="settings-pw-grid">
            {[
              { label: "Palavra-passe atual",    key: "atual" },
              { label: "Nova palavra-passe",      key: "nova" },
              { label: "Confirmar palavra-passe", key: "confirmar" },
            ].map(({ label, key }) => (
              <div key={key} style={s.group}>
                <label style={s.label}>{label}</label>
                <input style={s.input} type="password"
                  value={pwForm[key]}
                  onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder="••••••••" onFocus={inputFocus} onBlur={inputBlur}
                  disabled={pwLoading} />
              </div>
            ))}
          </div>

          {pwForm.nova.length > 0 && (
            <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "12px", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
              <span style={{ color: pwForm.nova.length >= 6 ? "var(--success)" : "var(--text-muted)" }}>
                {pwForm.nova.length >= 6 ? "✓" : "○"} Mínimo 6 caracteres
              </span>
              <span style={{ color: pwForm.nova === pwForm.confirmar && pwForm.confirmar ? "var(--success)" : "var(--text-muted)" }}>
                {pwForm.nova === pwForm.confirmar && pwForm.confirmar ? "✓" : "○"} Palavras-passe coincidem
              </span>
            </div>
          )}

          {pwError && <div style={{ marginTop: "12px", background: "var(--accent-light)", border: "1px solid var(--accent-border)", borderRadius: "7px", padding: "9px 14px", color: "var(--accent)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>⚠ {pwError}</div>}
          {pwSaved && <div style={{ marginTop: "12px", background: "var(--success-light)", border: "1px solid var(--success-border)", borderRadius: "7px", padding: "9px 14px", color: "var(--success)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>✓ Palavra-passe alterada</div>}

          <button onClick={handleSavePw} disabled={pwLoading} style={{
            marginTop: "16px", background: pwLoading ? "var(--bg-subtle)" : "var(--bg-raised)",
            border: "1px solid var(--border)", borderRadius: "7px",
            color: pwLoading ? "var(--text-muted)" : "var(--text-secondary)",
            padding: "10px 22px", fontSize: "13px", fontFamily: "var(--font-sans)",
            cursor: pwLoading ? "not-allowed" : "pointer",
          }}>
            {pwLoading ? "A guardar..." : "Alterar palavra-passe"}
          </button>
        </div>

        {/* Zona de perigo */}
        <div style={{ ...s.card, marginBottom: 0, borderColor: "var(--accent-border)", background: "var(--accent-light)" }}>
          <p style={{ ...s.sectionTitle, borderBottomColor: "var(--accent-border)", color: "var(--accent)" }}>
            Zona de perigo
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px" }}>
            Ao eliminar a conta todos os dados serão permanentemente removidos.
          </p>
          <button onClick={() => { setElimError(""); setModalAberto(true); }} style={{
            background: "none", border: "1px solid var(--accent-border)",
            borderRadius: "7px", color: "var(--accent)", padding: "9px 20px",
            fontSize: "13px", fontFamily: "var(--font-sans)", cursor: "pointer",
          }}>
            Eliminar conta
          </button>
        </div>

        {modalAberto && (
          <ModalEliminar
            onConfirm={handleEliminar}
            onCancel={() => setModalAberto(false)}
            loading={elimLoading}
            error={elimError}
          />
        )}
      </div>
    </>
  );
};

export default UserSettings;