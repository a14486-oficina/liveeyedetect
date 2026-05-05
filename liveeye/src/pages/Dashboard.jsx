import { useState } from "react";
import Sidebar from "../components/Sidebar";
import AddPessoa from "../components/AddPessoa";
import Desaparecidas from "../components/Desaparecidas";
import Encontradas from "../components/Encontradas";
 
const Dashboard = () => {
  const [panel, setPanel] = useState("add");
  const [counts, setCounts] = useState({ missing: 0, found: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
 
  const handleAddSuccess = () => {
    setPanel("missing");
    setRefreshKey((k) => k + 1);
  };
 
  return (
    <>
      {/* Google Fonts */}
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
      `}</style>
 
      <div style={{ display: "flex", minHeight: "100vh", background: "#0c0e17" }}>
        <Sidebar
          active={panel}
          onNavigate={setPanel}
          counts={{ missing: counts.missing, found: counts.found }}
        />
 
        <main style={{
          marginLeft: "230px", flex: 1, padding: "40px 44px",
          maxWidth: "860px", minHeight: "100vh",
        }}>
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
        </main>
      </div>
    </>
  );
};
 
export default Dashboard;