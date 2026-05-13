import { useState } from "react";
import Sidebar from "../components/Sidebar";
import AddPessoa from "../components/AddPessoa";
import Desaparecidas from "../components/Desaparecidas";
import Encontradas from "../components/Encontradas";
import VideoCapture from "../components/VideoCapture";
import UserSettings from "../components/UserSettings";
import Receiver from "./Receiver";

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

  // Receiver e Camera ocupam o ecrã completo (sem padding do dashboard)
  const isFullscreen = panel === "receiver" || panel === "camera";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); }

        .dash-sidebar { display: flex; }
        .dash-mobile-header { display: none; }
        .dash-main { margin-left: 220px; }
        .dash-main.padded { padding: 48px 52px; }
        .dash-mobile-spacer { display: none; }

        @media (max-width: 768px) {
          .dash-sidebar { display: none; }
          .dash-mobile-header { display: flex; }
          .dash-main { margin-left: 0 !important; }
          .dash-main.padded { padding: 20px 18px !important; }
          .dash-mobile-spacer { display: block; height: 60px; }
        }

        .drawer {
          position: fixed; top: 0; left: 0; height: 100vh; width: 220px;
          z-index: 201; transform: translateX(-100%);
          transition: transform 0.22s cubic-bezier(0.4,0,0.2,1);
        }
        .drawer.open { transform: translateX(0); }
        .overlay {
          position: fixed; inset: 0; background: rgba(26,25,22,0.25);
          z-index: 200; backdrop-filter: blur(2px);
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>

        {/* Desktop sidebar */}
        <div className="dash-sidebar">
          <Sidebar active={panel} onNavigate={handleNavigate} counts={counts} />
        </div>

        {/* Mobile top header */}
        <header className="dash-mobile-header" style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px",
          background: "rgba(247,246,243,0.95)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "26px", height: "26px", borderRadius: "6px",
              background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px",
              color: "#fff",
            }}>◎</div>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
              LiveEye
            </span>
          </div>
          <button onClick={() => setSidebarOpen(true)} style={{
            background: "var(--bg-raised)", border: "1px solid var(--border)",
            borderRadius: "7px", color: "var(--text-secondary)", padding: "7px 13px",
            cursor: "pointer", fontSize: "16px", lineHeight: 1,
          }}>☰</button>
        </header>

        {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

        <div className={`drawer ${sidebarOpen ? "open" : ""}`}>
          <Sidebar active={panel} onNavigate={handleNavigate} counts={counts} />
        </div>

        {/* Main content */}
        <main
          className={`dash-main${isFullscreen ? "" : " padded"}`}
          style={{ flex: 1, minHeight: "100vh" }}
        >
          <div className="dash-mobile-spacer" />

          {panel === "add" && (
            <AddPessoa onSuccess={handleAddSuccess} />
          )}
          {panel === "missing" && (
            <Desaparecidas
              key={refreshKey}
              onCountChange={(n) => setCounts((c) => ({ ...c, missing: n }))}
            />
          )}
          {panel === "found" && (
            <Encontradas
              key={refreshKey}
              onCountChange={(n) => setCounts((c) => ({ ...c, found: n }))}
            />
          )}
          {panel === "camera" && (
            <VideoCapture />
          )}
          {panel === "receiver" && (
            <Receiver />
          )}
          {panel === "settings" && (
            <UserSettings />
          )}
        </main>
      </div>
    </>
  );
};

export default Dashboard;