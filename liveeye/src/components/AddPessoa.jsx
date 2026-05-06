import { useState } from "react";
 
const API = "http://127.0.0.1:8000";
 
const s = {
  label: {
    fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase", letterSpacing: "0.1em",
    fontFamily: "'JetBrains Mono', monospace", marginBottom: "6px", display: "block",
  },
  input: {
    width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px", color: "#f0eee8", fontFamily: "'Syne', sans-serif",
    fontSize: "13px", padding: "10px 14px", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  group: { display: "flex", flexDirection: "column" },
  card: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "12px", padding: "24px",
  },
};
 
const AddPessoa = ({ onSuccess }) => {
  const [form, setForm] = useState({
    nome: "", idade: "", sexo: "", sexoOutro: "", lat: "", lon: "", obs: "",
  });
  const [imagem, setImagem] = useState(null);
  const [locs, setLocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
 
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
 
  const addLoc = () => setLocs((l) => [...l, { lat: "", lon: "", data: "", hora: "" }]);
  const removeLoc = (i) => setLocs((l) => l.filter((_, idx) => idx !== i));
  const setLoc = (i, k) => (e) => setLocs((l) => l.map((loc, idx) => idx === i ? { ...loc, [k]: e.target.value } : loc));
 
  const validate = () => {
    if (!form.nome.trim()) return "Nome é obrigatório";
    if (/\d/.test(form.nome)) return "Nome não pode conter números";
    const idade = parseInt(form.idade);
    if (!form.idade || isNaN(idade) || idade <= 0) return "Idade inválida";
    if (!form.sexo) return "Seleciona um sexo";
    if (form.sexo === "Outro" && !form.sexoOutro.trim()) return "Especifica o sexo";
    if (!form.lat || !form.lon || isNaN(form.lat) || isNaN(form.lon)) return "Coordenadas inválidas";
    if (form.lat < -90 || form.lat > 90) return "Latitude entre -90 e 90";
    if (form.lon < -180 || form.lon > 180) return "Longitude entre -180 e 180";
    if (!imagem) return "Seleciona uma imagem";
    return null;
  };
 
  const submit = async () => {
    setError("");
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      const sexo = form.sexo === "Outro" ? form.sexoOutro : form.sexo;
      fd.append("nome", form.nome.trim());
      fd.append("idade", parseInt(form.idade));
      fd.append("sexo", sexo);
      fd.append("lat", parseFloat(form.lat));
      fd.append("lon", parseFloat(form.lon));
      fd.append("observacoes", form.obs.trim());
      fd.append("imagem", imagem);
      fd.append("historico", JSON.stringify(locs.filter(l => l.lat && l.lon).map(l => ({
        lat: parseFloat(l.lat), lon: parseFloat(l.lon), data: l.data, hora: l.hora,
      }))));
      const res = await fetch(`${API}/pessoas_criar`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Erro ao criar");
      setForm({ nome: "", idade: "", sexo: "", sexoOutro: "", lat: "", lon: "", obs: "" });
      setImagem(null); setLocs([]);
      onSuccess();
    } catch (e) {
      setError("Erro ao criar pessoa. Verifica o servidor.");
    } finally { setLoading(false); }
  };
 
  const inputFocus = (e) => e.target.style.borderColor = "rgba(230,57,70,0.6)";
  const inputBlur = (e) => e.target.style.borderColor = "rgba(255,255,255,0.08)";
 
  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", fontWeight: 700, color: "#f0eee8", margin: 0 }}>
          Adicionar Pessoa
        </h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
          Preenche os dados para criar um novo registo
        </p>
      </div>
 
      <div style={s.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div style={s.group}>
            <label style={s.label}>Nome completo</label>
            <input style={s.input} value={form.nome} onChange={set("nome")} placeholder="ex: Maria Silva"
              onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={s.group}>
            <label style={s.label}>Idade</label>
            <input style={s.input} type="number" value={form.idade} onChange={set("idade")} placeholder="ex: 34"
              onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={{ ...s.group, gridColumn: "1 / -1" }}>
            <label style={s.label}>Sexo</label>
            <select style={{ ...s.input, cursor: "pointer" }} value={form.sexo} onChange={set("sexo")}
              onFocus={inputFocus} onBlur={inputBlur}>
              <option value="">Selecionar...</option>
              <option>Masculino</option>
              <option>Feminino</option>
              <option>Outro</option>
            </select>
          </div>
          {form.sexo === "Outro" && (
            <div style={{ ...s.group, gridColumn: "1 / -1" }}>
              <label style={s.label}>Especifica o sexo</label>
              <input style={s.input} value={form.sexoOutro} onChange={set("sexoOutro")} placeholder="Especifica..."
                onFocus={inputFocus} onBlur={inputBlur} />
            </div>
          )}
          <div style={s.group}>
            <label style={s.label}>Latitude residência</label>
            <input style={s.input} value={form.lat} onChange={set("lat")} placeholder="ex: 38.7169"
              onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={s.group}>
            <label style={s.label}>Longitude residência</label>
            <input style={s.input} value={form.lon} onChange={set("lon")} placeholder="ex: -9.1399"
              onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div style={{ ...s.group, gridColumn: "1 / -1" }}>
            <label style={s.label}>Fotografia</label>
            <input type="file" accept="image/*" onChange={(e) => setImagem(e.target.files[0])}
              style={{ ...s.input, cursor: "pointer", color: "rgba(255,255,255,0.4)" }} />
          </div>
          <div style={{ ...s.group, gridColumn: "1 / -1" }}>
            <label style={s.label}>Observações</label>
            <input
              style={s.input}
              value={form.obs}
              onChange={set("obs")}
              placeholder="Indique dados extra sobre a pessoa..."
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>
        </div>
 
        {/* Localizações */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px", marginTop: "4px" }}>
          <p style={{ ...s.label, marginBottom: "12px" }}>Últimas localizações conhecidas</p>
          {locs.map((loc, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "8px", marginBottom: "10px", alignItems: "end" }}>
              {["lat", "lon", "data", "hora"].map((k) => (
                <div key={k} style={s.group}>
                  <label style={s.label}>{k === "lat" ? "Latitude" : k === "lon" ? "Longitude" : k === "data" ? "Data" : "Hora"}</label>
                  <input style={s.input} value={loc[k]} onChange={setLoc(i, k)}
                    placeholder={k === "lat" ? "38.71" : k === "lon" ? "-9.13" : k === "data" ? "DD/MM/AAAA" : "HH:MM"}
                    onFocus={inputFocus} onBlur={inputBlur} />
                </div>
              ))}
              <button onClick={() => removeLoc(i)} style={{
                background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.2)",
                borderRadius: "8px", color: "#e63946", padding: "10px 12px", cursor: "pointer",
                fontSize: "13px",
              }}>✕</button>
            </div>
          ))}
          <button onClick={addLoc} style={{
            background: "none", border: "1px dashed rgba(255,255,255,0.15)",
            borderRadius: "8px", color: "rgba(255,255,255,0.4)", fontSize: "13px",
            padding: "8px 16px", cursor: "pointer", fontFamily: "'Syne', sans-serif",
            transition: "all 0.15s", marginTop: "4px",
          }}>+ Adicionar localização</button>
        </div>
 
        {error && (
          <div style={{
            marginTop: "16px", background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)",
            borderRadius: "8px", padding: "10px 14px", color: "#e63946", fontSize: "13px",
            fontFamily: "'JetBrains Mono', monospace",
          }}>⚠ {error}</div>
        )}
 
        <button onClick={submit} disabled={loading} style={{
          marginTop: "20px", background: loading ? "rgba(230,57,70,0.5)" : "#e63946",
          border: "none", borderRadius: "8px", color: "#fff", padding: "12px 28px",
          fontSize: "14px", fontWeight: 600, fontFamily: "'Syne', sans-serif",
          cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s",
          boxShadow: loading ? "none" : "0 0 20px rgba(230,57,70,0.3)",
        }}>
          {loading ? "A criar..." : "Criar registo"}
        </button>
      </div>
    </div>
  );
};
 
export default AddPessoa;