import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const UserMenu = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("liveeye_user");
      if (raw) setUser(JSON.parse(raw));
    } catch { /* silent */ }
  }, []);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleLogout = () => {
    sessionStorage.removeItem("liveeye_user");
    navigate("/");
  };

  const handleSettings = () => {
    setOpen(false);
    onNavigate("settings");
  };

  // Gera iniciais a partir do email ou nome
  const getInitials = () => {
    if (!user) return "?";
    const name = user.nome || user.email || "";
    const parts = name.split(/[\s@]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = user?.nome || user?.email?.split("@")[0] || "Utilizador";
  const displayEmail = user?.email || "";

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      {/* Botão da foto de perfil */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Perfil"
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          border: open
            ? "2px solid var(--accent)"
            : "2px solid var(--border-strong)",
          background: user?.foto
            ? "transparent"
            : "var(--accent-light)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          transition: "border-color 0.15s, box-shadow 0.15s",
          boxShadow: open ? "0 0 0 3px var(--accent-mid)" : "none",
          padding: 0,
          flexShrink: 0,
        }}
      >
        {user?.foto ? (
          <img
            src={user.foto}
            alt="Perfil"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{
            fontFamily: "var(--font-sans)",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--accent)",
            letterSpacing: "0.02em",
            userSelect: "none",
          }}>
            {getInitials()}
          </span>
        )}
      </button>

      {/* Dropdown flutuante */}
      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: 0,
          width: "200px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          boxShadow: "0 8px 24px rgba(26,25,22,0.12), 0 2px 6px rgba(26,25,22,0.06)",
          overflow: "hidden",
          animation: "menuIn 0.15s cubic-bezier(0.2, 0, 0, 1.2)",
          zIndex: 300,
        }}>
          <style>{`
            @keyframes menuIn {
              from { opacity: 0; transform: translateY(6px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0)   scale(1);    }
            }
          `}</style>

          {/* Info do utilizador */}
          <div style={{
            padding: "13px 14px 11px",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <div style={{
                width: "30px", height: "30px", borderRadius: "50%",
                background: "var(--accent-light)",
                border: "1px solid var(--accent-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, overflow: "hidden",
              }}>
                {user?.foto ? (
                  <img src={user.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--accent)" }}>
                    {getInitials()}
                  </span>
                )}
              </div>
              <div style={{ overflow: "hidden" }}>
                <p style={{
                  fontSize: "12px", fontWeight: 500, color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)", margin: 0,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {displayName}
                </p>
                {displayEmail && (
                  <p style={{
                    fontSize: "10px", color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)", margin: 0,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {displayEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Opções */}
          <div style={{ padding: "5px" }}>
            <MenuItem
              icon="⚙"
              label="Definições"
              onClick={handleSettings}
            />
            <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
            <MenuItem
              icon="→"
              label="Logout"
              onClick={handleLogout}
              danger
            />
          </div>
        </div>
      )}
    </div>
  );
};

const MenuItem = ({ icon, label, onClick, danger }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 10px",
        borderRadius: "6px",
        border: "none",
        background: hovered
          ? danger ? "var(--accent-light)" : "var(--bg-raised)"
          : "transparent",
        color: danger
          ? hovered ? "var(--accent)" : "var(--text-secondary)"
          : hovered ? "var(--text-primary)" : "var(--text-secondary)",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        fontSize: "13px",
        fontWeight: danger && hovered ? 500 : 400,
        textAlign: "left",
        transition: "all 0.1s",
      }}
    >
      <span style={{ fontSize: "12px", width: "14px", textAlign: "center", opacity: 0.75 }}>
        {icon}
      </span>
      {label}
    </button>
  );
};

export default UserMenu;