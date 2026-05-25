import { useState, useEffect } from "react";
import UserMenu from "./UserMenu";

const NAV_GESTAO = [
  { id: "add",      label: "Adicionar",    icon: "＋" },
  { id: "missing",  label: "Desaparecidas", icon: "◎" },
  { id: "found",    label: "Encontradas",  icon: "✓" },
];

const NAV_SISTEMA = [
  { id: "camera",   label: "Emissor",  icon: "⬤" },
  { id: "receiver", label: "Recetor",  icon: "▶" },
];

const NAV_ADMIN = [
  { id: "admin", label: "Convites", icon: "⚑" },
];

const Sidebar = ({ active, onNavigate, counts }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("liveeye_user");
      if (raw) {
        const user = JSON.parse(raw);
        if (user?.isAdmin) setIsAdmin(true);
      }
    } catch { /* silent */ }
  }, []);

  return (
    <aside style={{
      width: "220px",
      flexShrink: 0,
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      height: "100vh",
      top: 0,
      left: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        padding: "28px 22px 22px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
          {/* Logo claro (modo light) */}
          <img
            src="/logo-light.png"
            alt="LiveDetect"
            className="logo-light"
            style={{ height: "52px", width: "auto", display: "block" }}
          />
          {/* Logo escuro (modo dark) */}
          <img
            src="/logo-dark.png"
            alt="LiveDetect"
            className="logo-dark"
            style={{ height: "52px", width: "auto", display: "none" }}
          />
          <style>{`
            html.dark .logo-light { display: none !important; }
            html.dark .logo-dark  { display: block !important; }
          `}</style>
          <span style={{
            fontFamily: "var(--font-sans)",
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}>
            Live Eye Detect
          </span>
        </div>

        <span style={{
          fontSize: "10px", color: "var(--text-muted)",
          letterSpacing: "0.1em", textTransform: "uppercase",
          fontFamily: "var(--font-mono)",
        }}>Sistema PAP</span>
      </div>

      {/* Nav */}
      <nav style={{ padding: "14px 12px", flex: 1, overflowY: "auto" }}>

        {/* Gestão */}
        <p style={{
          fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.12em",
          padding: "0 10px", marginBottom: "6px", marginTop: "4px",
        }}>Gestão</p>

        {NAV_GESTAO.map((item) => (
          <NavBtn key={item.id} item={item} active={active} onNavigate={onNavigate} counts={counts} />
        ))}

        {/* Divisor */}
        <div style={{ height: "1px", background: "var(--border)", margin: "12px 4px" }} />

        {/* Sistema */}
        <p style={{
          fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.12em",
          padding: "0 10px", marginBottom: "6px",
        }}>Sistema</p>

        {NAV_SISTEMA.map((item) => (
          <NavBtn key={item.id} item={item} active={active} onNavigate={onNavigate} counts={counts} />
        ))}

        {/* Admin — só visível para o admin */}
        {isAdmin && (
          <>
            <div style={{ height: "1px", background: "var(--border)", margin: "12px 4px" }} />
            <p style={{
              fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.12em",
              padding: "0 10px", marginBottom: "6px",
            }}>Admin</p>
            {NAV_ADMIN.map((item) => (
              <NavBtn key={item.id} item={item} active={active} onNavigate={onNavigate} counts={counts} />
            ))}
          </>
        )}
      </nav>

      {/* Footer com perfil */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
      }}>
        <UserMenu onNavigate={onNavigate} />
        <span style={{
          fontSize: "10px", color: "var(--text-muted)",
          fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
        }}>v1.0.0</span>
      </div>
    </aside>
  );
};

const NavBtn = ({ item, active, onNavigate, counts }) => {
  const isActive = active === item.id;
  return (
    <button onClick={() => onNavigate(item.id)} style={{
      width: "100%", display: "flex", alignItems: "center", gap: "9px",
      padding: "9px 12px", borderRadius: "7px", border: "none",
      background: isActive ? "var(--accent-light)" : "transparent",
      color: isActive ? "var(--accent)" : "var(--text-secondary)",
      cursor: "pointer", marginBottom: "2px", transition: "all 0.12s",
      textAlign: "left", fontFamily: "var(--font-sans)", fontSize: "13px",
      fontWeight: isActive ? 500 : 400,
    }}>
      <span style={{ fontSize: "12px", width: "16px", textAlign: "center", opacity: 0.8 }}>{item.icon}</span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {counts?.[item.id] > 0 && (
        <span style={{
          fontSize: "10px", fontFamily: "var(--font-mono)",
          background: isActive ? "var(--accent-mid)" : "var(--bg-subtle)",
          color: isActive ? "var(--accent)" : "var(--text-muted)",
          padding: "2px 7px", borderRadius: "99px",
        }}>{counts[item.id]}</span>
      )}
    </button>
  );
};

export default Sidebar;