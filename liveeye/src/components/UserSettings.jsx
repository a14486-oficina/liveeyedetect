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
    borderRadius: "12px", padding: "24px 28px",
    boxShadow: "var(--shadow-sm)", marginBottom: "16px",
  },
  sectionTitle: {
    fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.1em",
    fontFamily: "var(--font-mono)", marginBottom: "18px",
    paddingBottom: "10px", borderBottom: "1px solid var(--border)",
  },
};

/* ────────────────────────────────────────────────────────────
   Toggle switch reutilizável
──────────────────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────────────────
   Modal de eliminação — 2 passos
──────────────────────────────────────────────────────────── */
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
        width: "100%", maxWidth: "420px",
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "14px", padding: "28px 28px 24px",
        boxShadow: "0 20px 60px rgba(26,25,22,0.18)",
        zIndex: 401, animation: "modalIn 0.18s cubic-bezier(0.2,0,0,1.1)",
      }}>
        <style>{`@keyframes modalIn {
          from { opacity:0; transform:translate(-50%,-47%) scale(0.96); }
          to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
        }`}</style>

        <div style={{
          width: "42px", height: "42px", borderRadius: "10px",
          background: "var(--accent-light)", border: "1px solid var(--accent-border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px", marginBottom: "16px",
        }}>⚠</div>

        {step === 1 && (
          <>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
              Eliminar conta?
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "6px" }}>
              Esta ação é <strong>permanente e irreversível</strong>. Ao confirmares, a tua conta será
              apagada e não será possível recuperá-la.
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "24px" }}>
              Tens a certeza que queres continuar?
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={onCancel} style={{
                background: "var(--bg-raised)", border: "1px solid var(--border)",
                borderRadius: "7px", color: "var(--text-secondary)",
                padding: "9px 18px", fontSize: "13px", cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>Cancelar</button>
              <button onClick={() => setStep(2)} style={{
                background: "var(--accent)", border: "none", borderRadius: "7px", color: "#fff",
                padding: "9px 18px", fontSize: "13px", cursor: "pointer",
                fontFamily: "var(--font-sans)", fontWeight: 500,
              }}>Sim, quero eliminar</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
              Confirma a tua identidade
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "18px" }}>
              Introduz a tua palavra-passe para confirmar a eliminação da conta.
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
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button onClick={onCancel} disabled={loading} style={{
                background: "var(--bg-raised)", border: "1px solid var(--border)",
                borderRadius: "7px", color: "var(--text-secondary)",
                padding: "9px 18px", fontSize: "13px",
                cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)",
              }}>Cancelar</button>
              <button onClick={() => onConfirm(password)} disabled={loading || !password} style={{
                background: loading || !password ? "var(--accent-mid)" : "var(--accent)",
                border: "none", borderRadius: "7px", color: "#fff",
                padding: "9px 18px", fontSize: "13px",
                cursor: loading || !password ? "not-allowed" : "pointer",
                fontFamily: "var(--font-sans)", fontWeight: 500, transition: "background 0.12s",
              }}>{loading ? "A eliminar..." : "Eliminar conta"}</button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

/* ────────────────────────────────────────────────────────────
   Hook: modo escuro — persiste em localStorage e aplica
   a classe "dark" no <html>
──────────────────────────────────────────────────────────── */
const useDarkMode = () => {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("liveeye_theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("liveeye_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("liveeye_theme", "light");
    }
  }, [dark]);

  return [dark, setDark];
};

/* ────────────────────────────────────────────────────────────
   Componente principal
──────────────────────────────────────────────────────────── */
const UserSettings = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ nome: "", email: "" });

  const [perfilLoading, setPerfilLoading] = useState(false);
  const [perfilError, setPerfilError]     = useState("");
  const [perfilSaved, setPerfilSaved]     = useState(false);

  const [pwForm, setPwForm]       = useState({ atual: "", nova: "", confirmar: "" });
  const [pwError, setPwError]     = useState("");
  const [pwSaved, setPwSaved]     = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [elimError, setElimError]     = useState("");
  const [elimLoading, setElimLoading] = useState(false);

  const [dark, setDark] = useDarkMode();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("liveeye_user");
      if (raw) {
        const u = JSON.parse(raw);
        setUser(u);
        setForm({ nome: u.nome || "", email: u.email || "" });
      }
    } catch { /* silent */ }
  }, []);

  const getInitials = () => {
    const name = form.nome || form.email || "";
    const parts = name.split(/[\s@]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || "?";
  };

  const temAlteracoes =
    form.nome !== (user?.nome || "") || form.email !== (user?.email || "");

  const handleSavePerfil = async () => {
    setPerfilError(""); setPerfilSaved(false);
    if (!form.nome.trim())  { setPerfilError("O nome não pode estar vazio"); return; }
    if (!form.email.trim()) { setPerfilError("O email não pode estar vazio"); return; }
    if (!user?.id) { setPerfilError("Sessão inválida. Faz login novamente."); return; }

    setPerfilLoading(true);
    try {
      const res = await fetch(`${API}/atualizar_perfil`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_utilizador: user.id, nome: form.nome.trim(), email: form.email.trim() }),
      });
      const data = await res.json();
      if (data.erro) { setPerfilError(data.erro); return; }

      const updated = { ...user, nome: data.nome, email: data.email };
      sessionStorage.setItem("liveeye_user", JSON.stringify(updated));
      setUser(updated);
      setPerfilSaved(true);
      setTimeout(() => setPerfilSaved(false), 2500);
    } catch {
      setPerfilError("Erro ao contactar o servidor. Verifica a ligação.");
    } finally {
      setPerfilLoading(false);
    }
  };

  const handleSavePw = async () => {
    setPwError(""); setPwSaved(false);
    if (!pwForm.atual) { setPwError("Introduz a palavra-passe atual"); return; }
    if (pwForm.nova.length < 6) { setPwError("A nova palavra-passe deve ter pelo menos 6 caracteres"); return; }
    if (pwForm.nova !== pwForm.confirmar) { setPwError("As palavras-passe não coincidem"); return; }
    if (!user?.id) { setPwError("Sessão inválida. Faz login novamente."); return; }

    setPwLoading(true);
    try {
      const res = await fetch(`${API}/alterar_password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_utilizador: user.id, password_atual: pwForm.atual, nova_password: pwForm.nova }),
      });
      const data = await res.json();
      if (data.erro) { setPwError(data.erro); return; }
      setPwForm({ atual: "", nova: "", confirmar: "" });
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch {
      setPwError("Erro ao contactar o servidor. Verifica a ligação.");
    } finally { setPwLoading(false); }
  };

  const handleEliminarConta = async (password) => {
    setElimError("");
    if (!user?.id) { setElimError("Sessão inválida. Faz login novamente."); return; }
    setElimLoading(true);
    try {
      const res = await fetch(`${API}/eliminar_conta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_utilizador: user.id, password }),
      });
      const data = await res.json();
      if (data.erro) { setElimError(data.erro); return; }
      sessionStorage.removeItem("liveeye_user");
      navigate("/");
    } catch {
      setElimError("Erro ao contactar o servidor. Verifica a ligação.");
    } finally { setElimLoading(false); }
  };

  const inputFocus = (e) => e.target.style.borderColor = "var(--accent)";
  const inputBlur  = (e) => e.target.style.borderColor = "var(--border)";

  return (
    <div>
      {modalAberto && (
        <ModalEliminar
          onConfirm={handleEliminarConta}
          onCancel={() => { setModalAberto(false); setElimError(""); }}
          loading={elimLoading}
          error={elimError}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
          Definições
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
          Gere o teu perfil e preferências da conta
        </p>
      </div>

      {/* ── Aparência ── */}
      <div style={s.card}>
        <p style={s.sectionTitle}>Aparência</p>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
        }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
              Modo escuro
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "3px" }}>
              {dark ? "Interface escura ativa" : "Interface clara ativa"}
            </p>
          </div>
          <Toggle checked={dark} onChange={setDark} />
        </div>
      </div>

      {/* ── Perfil ── */}
      <div style={s.card}>
        <p style={s.sectionTitle}>Perfil</p>

        {/* Avatar com iniciais */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%", flexShrink: 0,
            background: "var(--accent-light)", border: "2px solid var(--accent-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--accent)", fontFamily: "var(--font-sans)" }}>
              {getInitials()}
            </span>
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
              {form.nome || "—"}
            </p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", margin: 0 }}>
              {form.email || "—"}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
          <div style={{
            marginTop: "14px", background: "var(--accent-light)", border: "1px solid var(--accent-border)",
            borderRadius: "7px", padding: "9px 14px", color: "var(--accent)",
            fontSize: "12px", fontFamily: "var(--font-mono)",
          }}>⚠ {perfilError}</div>
        )}
        {perfilSaved && (
          <div style={{
            marginTop: "14px", background: "var(--success-light)", border: "1px solid var(--success-border)",
            borderRadius: "7px", padding: "9px 14px", color: "var(--success)",
            fontSize: "12px", fontFamily: "var(--font-mono)",
          }}>✓ Perfil guardado com sucesso</div>
        )}

        <button
          onClick={handleSavePerfil}
          disabled={perfilLoading || !temAlteracoes}
          style={{
            marginTop: "18px",
            background: perfilLoading || !temAlteracoes ? "var(--accent-mid)" : "var(--accent)",
            border: "none", borderRadius: "7px", color: "#fff", padding: "10px 22px",
            fontSize: "13px", fontWeight: 500, fontFamily: "var(--font-sans)",
            cursor: perfilLoading || !temAlteracoes ? "not-allowed" : "pointer",
            letterSpacing: "0.01em", transition: "background 0.15s",
          }}
        >
          {perfilLoading ? "A guardar..." : "Guardar alterações"}
        </button>
      </div>

      {/* ── Segurança ── */}
      <div style={s.card}>
        <p style={s.sectionTitle}>Segurança</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
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
          <div style={{ marginTop: "10px", display: "flex", gap: "16px", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
            <span style={{ color: pwForm.nova.length >= 6 ? "var(--success)" : "var(--text-muted)" }}>
              {pwForm.nova.length >= 6 ? "✓" : "○"} Mínimo 6 caracteres
            </span>
            <span style={{ color: pwForm.nova === pwForm.confirmar && pwForm.confirmar ? "var(--success)" : "var(--text-muted)" }}>
              {pwForm.nova === pwForm.confirmar && pwForm.confirmar ? "✓" : "○"} Palavras-passe coincidem
            </span>
          </div>
        )}

        {pwError && (
          <div style={{
            marginTop: "12px", background: "var(--accent-light)", border: "1px solid var(--accent-border)",
            borderRadius: "7px", padding: "9px 14px", color: "var(--accent)",
            fontSize: "12px", fontFamily: "var(--font-mono)",
          }}>⚠ {pwError}</div>
        )}
        {pwSaved && (
          <div style={{
            marginTop: "12px", background: "var(--success-light)", border: "1px solid var(--success-border)",
            borderRadius: "7px", padding: "9px 14px", color: "var(--success)",
            fontSize: "12px", fontFamily: "var(--font-mono)",
          }}>✓ Palavra-passe alterada com sucesso</div>
        )}

        <button onClick={handleSavePw} disabled={pwLoading} style={{
          marginTop: "18px", background: pwLoading ? "var(--bg-subtle)" : "var(--bg-raised)",
          border: "1px solid var(--border)", borderRadius: "7px",
          color: pwLoading ? "var(--text-muted)" : "var(--text-secondary)",
          padding: "10px 22px", fontSize: "13px", fontFamily: "var(--font-sans)",
          cursor: pwLoading ? "not-allowed" : "pointer", transition: "all 0.12s",
        }}>
          {pwLoading ? "A guardar..." : "Alterar palavra-passe"}
        </button>
      </div>

      {/* ── Zona de perigo ── */}
      <div style={{ ...s.card, marginBottom: 0, borderColor: "var(--accent-border)", background: "var(--accent-light)" }}>
        <p style={{ ...s.sectionTitle, borderBottomColor: "var(--accent-border)", color: "var(--accent)" }}>
          Zona de perigo
        </p>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px" }}>
          Ao eliminar a conta todos os dados serão permanentemente removidos. Esta ação é irreversível.
        </p>
        <button onClick={() => { setElimError(""); setModalAberto(true); }} style={{
          background: "none", border: "1px solid var(--accent-border)",
          borderRadius: "7px", color: "var(--accent)", padding: "9px 20px",
          fontSize: "13px", fontFamily: "var(--font-sans)", cursor: "pointer",
        }}>
          Eliminar conta
        </button>
      </div>
    </div>
  );
};

export default UserSettings;