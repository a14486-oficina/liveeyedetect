import { useState } from "react";
import Sidebar from "../components/Sidebar";
import AddPessoa from "../components/AddPessoa";
import Desaparecidas from "../components/Desaparecidas";
import Encontradas from "../components/Encontradas";

const Dashboard = () => {
  const [panel, setPanel] = useState("add");
  const [counts, setCounts] = useState({ missing: 0, found: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleAddSuccess = () => {
    setPanel("missing");
    setRefreshKey((k) => k + 1);
  };

  const handleNavigate = (p) => {
    setPanel(p);
    setSidebarOpen(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0c0e17; }
        select option { background: #0c0e17; }
        input[type=file]::file-selector-button {
          background: rgba(230,57,70,0.15); border: 1px solid rgba(230,57,70,0.3);
          border-radius: 6px; color: #e63946; padding: 4px 10px;
          font-family: 'Syne', sans-serif; font-size: 12px; cursor: pointer; margin-right: 10px;
        }
        .dash-sidebar { display: flex; }
        .dash-mobile-header { display: none; }
        .dash-main { margin-left: 230px; padding: 40px 44px; }
        .dash-mobile-spacer { display: none; }

        @media (max-width: 768px) {
          .dash-sidebar { display: none; }
          .dash-mobile-header { display: flex; }
          .dash-main { margin-left: 0 !important; padding: 20px 16px !important; }
          .dash-mobile-spacer { display: block; height: 64px; }
        }

        .drawer {
          position: fixed; top: 0; left: 0; height: 100vh; width: 230px;
          z-index: 201; transform: translateX(-100%);
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        .drawer.open { transform: translateX(0); }
        .overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.65);
          z-index: 200; backdrop-filter: blur(3px);
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: "#0c0e17" }}>

        {/* Desktop sidebar */}
        <div className="dash-sidebar">
          <Sidebar active={panel} onNavigate={handleNavigate} counts={counts} />
        </div>

        {/* Mobile top header */}
        <header className="dash-mobile-header" style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px",
          background: "rgba(6,8,16,0.96)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "26px", height: "26px", borderRadius: "6px", color: "#fff",
              background: "linear-gradient(135deg, #e63946, #c1121f)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px",
              boxShadow: "0 0 12px rgba(230,57,70,0.35)",
            }}>◎</div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: "15px", fontWeight: 700, color: "#f0eee8" }}>
              LiveEye
            </span>
          </div>
          <button onClick={() => setSidebarOpen(true)} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px", color: "#f0eee8", padding: "8px 13px",
            cursor: "pointer", fontSize: "18px", lineHeight: 1,
            fontFamily: "monospace",
          }}>☰</button>
        </header>

        {/* Mobile drawer overlay */}
        {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

        {/* Mobile drawer */}
        <div className={`drawer ${sidebarOpen ? "open" : ""}`}>
          <Sidebar active={panel} onNavigate={handleNavigate} counts={counts} />
        </div>

        {/* Main content */}
        <main className="dash-main" style={{ flex: 1, minHeight: "100vh" }}>
          <div className="dash-mobile-spacer" />
          {panel === "add" && <AddPessoa onSuccess={handleAddSuccess} />}
          {panel === "missing" && (
            <Desaparecidas key={refreshKey} onCountChange={(n) => setCounts((c) => ({ ...c, missing: n }))} />
          )}
          {panel === "found" && (
            <Encontradas key={refreshKey} onCountChange={(n) => setCounts((c) => ({ ...c, found: n }))} />
          )}
        </main>
      </div>
    </>
  );
};

export default Dashboard;