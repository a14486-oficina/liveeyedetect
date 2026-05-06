const NAV = [
  { id: "add", label: "Adicionar", icon: "＋" },
  { id: "missing", label: "Desaparecidas", icon: "◎" },
  { id: "found", label: "Encontradas", icon: "✓" },
];
 
const Sidebar = ({ active, onNavigate, counts }) => {
  return (
    <aside style={{
      width: "230px",
      flexShrink: 0,
      background: "#080b12",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      height: "100vh",
      top: 0,
      left: 0,
      zIndex: 100,
    }}>
      <div style={{
        padding: "28px 24px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "6px",
            background: "linear-gradient(135deg, #e63946, #c1121f)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px", boxShadow: "0 0 16px rgba(230,57,70,0.35)", color: "#fff",
          }}>◎</div>
          <span style={{
            fontFamily: "'Syne', sans-serif", fontSize: "15px",
            fontWeight: 700, color: "#f0eee8", letterSpacing: "0.02em",
          }}>LiveEye</span>
        </div>
        <span style={{
          fontSize: "10px", color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.12em", textTransform: "uppercase",
          fontFamily: "'JetBrains Mono', monospace",
        }}>Sistema PAP</span>
      </div>
 
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 12px", borderRadius: "8px", border: "none",
              background: isActive ? "rgba(230,57,70,0.12)" : "transparent",
              color: isActive ? "#e63946" : "rgba(255,255,255,0.45)",
              cursor: "pointer", marginBottom: "2px", transition: "all 0.15s",
              textAlign: "left", fontFamily: "'Syne', sans-serif", fontSize: "13px",
              fontWeight: isActive ? 600 : 400, letterSpacing: "0.01em",
              borderLeft: isActive ? "2px solid #e63946" : "2px solid transparent",
            }}>
              <span style={{ fontSize: "15px", width: "18px", textAlign: "center" }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {counts[item.id] > 0 && (
                <span style={{
                  fontSize: "10px", fontFamily: "'JetBrains Mono', monospace",
                  background: isActive ? "rgba(230,57,70,0.2)" : "rgba(255,255,255,0.07)",
                  color: isActive ? "#e63946" : "rgba(255,255,255,0.35)",
                  padding: "2px 7px", borderRadius: "99px",
                }}>{counts[item.id]}</span>
              )}
            </button>
          );
        })}
      </nav>
 
      <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{
          fontSize: "10px", color: "rgba(255,255,255,0.2)",
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em",
        }}>v1.0.0</span>
      </div>
    </aside>
  );
};
 
export default Sidebar;