import { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import AddPessoa from "../components/AddPessoa";
import Desaparecidas from "../components/Desaparecidas";
import Encontradas from "../components/Encontradas";
import VideoCapture from "../components/VideoCapture";
import UserSettings from "../components/UserSettings";
import Receiver from "./Receiver";
import AdminConvites from "../components/Adminconvites.jsx";

const Dashboard = () => {
  const [panel, setPanel] = useState("add");
  const [counts, setCounts] = useState({ missing: 0, found: 0 });
  const desaparecedasRef = useRef(null);
  const encontradasRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const handleAddNavigate = () => {
    setPanel("missing");
  };

  const handleAddRefresh = () => {
    desaparecedasRef.current?.reload();
    encontradasRef.current?.reload();
  };

  const handleNavigate = (p) => {
    setPanel(p);
    setSidebarOpen(false);
  };

  const isFullscreen = panel === "receiver" || panel === "camera";

  const MOBILE_NAV = [
    { id: "add",      icon: "＋", label: "Adicionar" },
    { id: "missing",  icon: "◎",  label: "Desapar." },
    { id: "found",    icon: "✓",  label: "Encontr." },
    { id: "camera",   icon: "⬤",  label: "Emissor" },
    { id: "receiver", icon: "▶",  label: "Recetor" },
    ...(isAdmin ? [{ id: "admin", icon: "⚑", label: "Admin" }] : []),
  ];

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
        .dash-mobile-nav { display: none; }

        @media (max-width: 768px) {
          .dash-sidebar { display: none; }
          .dash-mobile-header { display: flex; }
          .dash-main { margin-left: 0 !important; margin-bottom: 64px; }
          .dash-main.padded { padding: 16px 14px !important; }
          .dash-mobile-spacer { display: block; height: 56px; }
          .dash-mobile-nav { display: flex; }
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

        /* Mobile bottom nav */
        .mobile-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 150;
          background: rgba(247,246,243,0.97);
          backdrop-filter: blur(14px);
          border-top: 1px solid var(--border);
          padding: 6px 4px env(safe-area-inset-bottom, 0px);
          justify-content: space-around; align-items: center;
          gap: 2px;
        }
        html.dark .mobile-nav {
          background: rgba(20,20,18,0.97);
        }
        .mobile-nav-btn {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          flex: 1; padding: 6px 4px; border: none; background: transparent;
          cursor: pointer; border-radius: 10px; transition: background 0.12s;
          min-width: 0;
        }
        .mobile-nav-btn.active { background: var(--accent-light); }
        .mobile-nav-icon { font-size: 17px; line-height: 1; }
        .mobile-nav-label {
          font-size: 9px; font-family: var(--font-mono);
          color: var(--text-muted); text-transform: uppercase;
          letter-spacing: 0.05em; white-space: nowrap;
        }
        .mobile-nav-btn.active .mobile-nav-label { color: var(--accent); }
        .mobile-nav-btn.active .mobile-nav-icon { filter: none; }

        /* Mobile top header — dark mode */
        .dash-mobile-header {
          background: rgba(247,246,243,0.97);
          backdrop-filter: blur(12px);
        }
        html.dark .dash-mobile-header {
          background: rgba(20,20,18,0.97);
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
          padding: "12px 16px",

          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "24px", height: "24px", borderRadius: "6px",
              background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px",
              color: "#fff",
            }}>◎</div>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
              LiveEye
            </span>
          </div>
          <button onClick={() => handleNavigate("settings")} style={{
            background: panel === "settings" ? "var(--accent-light)" : "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "7px", color: panel === "settings" ? "var(--accent)" : "var(--text-secondary)",
            padding: "7px 12px", cursor: "pointer", fontSize: "14px", lineHeight: 1,
          }}>⚙</button>
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

          {panel === "add" && <AddPessoa onNavigate={handleAddNavigate} onRefresh={handleAddRefresh} />}
          {panel === "missing" && (
            <Desaparecidas
              ref={desaparecedasRef}
              onCountChange={(n) => setCounts((c) => ({ ...c, missing: n }))}
            />
          )}
          {panel === "found" && (
            <Encontradas
              ref={encontradasRef}
              onCountChange={(n) => setCounts((c) => ({ ...c, found: n }))}
            />
          )}
          {panel === "camera" && <VideoCapture />}
          {panel === "receiver" && <Receiver />}
          {panel === "settings" && <UserSettings />}
          {panel === "admin" && <AdminConvites />}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="dash-mobile-nav mobile-nav">
          {MOBILE_NAV.map((item) => (
            <button
              key={item.id}
              className={`mobile-nav-btn${panel === item.id ? " active" : ""}`}
              onClick={() => handleNavigate(item.id)}
            >
              <span className="mobile-nav-icon" style={{
                color: panel === item.id ? "var(--accent)" : "var(--text-muted)",
              }}>{item.icon}</span>
              <span className="mobile-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Dashboard;