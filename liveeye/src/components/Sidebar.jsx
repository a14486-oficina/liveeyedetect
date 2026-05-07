const NAV = [
  { id: "add",     label: "Adicionar",    icon: "＋" },
  { id: "missing", label: "Desaparecidas", icon: "◎" },
  { id: "found",   label: "Encontradas",  icon: "✓" },
];

const Sidebar = ({ active, onNavigate, counts }) => {
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
          <div style={{
            width: "26px", height: "26px", borderRadius: "6px",
            background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", color: "#fff",
          }}>◎</div>
          <span style={{
            fontFamily: "var(--font-sans)", fontSize: "15px",
            fontWeight: 600, color: "var(--text-primary)",
          }}>LiveEye</span>
        </div>
        <span style={{
          fontSize: "10px", color: "var(--text-muted)",
          letterSpacing: "0.1em", textTransform: "uppercase",
          fontFamily: "var(--font-mono)",
        }}>Sistema PAP</span>
      </div>

      {/* Nav */}
      <nav style={{ padding: "14px 12px", flex: 1 }}>
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: "9px",
              padding: "9px 12px", borderRadius: "7px", border: "none",
              background: isActive ? "var(--accent-light)" : "transparent",
              color: isActive ? "var(--accent)" : "var(--text-secondary)",
              cursor: "pointer", marginBottom: "2px", transition: "all 0.12s",
              textAlign: "left", fontFamily: "var(--font-sans)", fontSize: "13px",
              fontWeight: isActive ? 500 : 400,
            }}>
              <span style={{ fontSize: "13px", width: "16px", textAlign: "center", opacity: 0.8 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {counts[item.id] > 0 && (
                <span style={{
                  fontSize: "10px", fontFamily: "var(--font-mono)",
                  background: isActive ? "var(--accent-mid)" : "var(--bg-subtle)",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  padding: "2px 7px", borderRadius: "99px",
                }}>{counts[item.id]}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border)" }}>
        <span style={{
          fontSize: "10px", color: "var(--text-muted)",
          fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
        }}>v1.0.0</span>
      </div>
    </aside>
  );
};

export default Sidebar;