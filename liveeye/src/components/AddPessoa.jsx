import { useState, useRef } from "react";

const API = "http://127.0.0.1:8000";

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
    borderRadius: "12px", padding: "28px",
    boxShadow: "var(--shadow-sm)",
  },
};

const PhotoSlot = ({ label, file, onChange }) => {
  const inputRef = useRef(null);
  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <span style={s.label}>{label}</span>
      <div
        onClick={() => inputRef.current.click()}
        style={{
          width: "100%", aspectRatio: "1 / 1",
          background: preview ? "transparent" : "var(--bg-raised)",
          border: preview ? "1px solid var(--accent-border)" : "1.5px dashed var(--border-strong)",
          borderRadius: "9px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", position: "relative", transition: "border-color 0.2s",
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt={label}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
            <div style={{
              position: "absolute", inset: 0, background: "rgba(26,25,22,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: 0, transition: "opacity 0.2s", borderRadius: "8px",
              fontSize: "11px", color: "#fff", fontFamily: "var(--font-mono)",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}
            >Alterar</div>
          </>
        ) : (
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>+</div>
            <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)" }}>Clica para adicionar</div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => onChange(e.target.files[0] || null)} />
      {file && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(null); inputRef.current.value = ""; }}
          style={{
            background: "var(--accent-light)", border: "1px solid var(--accent-border)",
            borderRadius: "5px", color: "var(--accent)", fontSize: "11px",
            padding: "4px 8px", cursor: "pointer", fontFamily: "var(--font-sans)",
            alignSelf: "flex-start",
          }}
        >✕ Remover</button>
      )}
    </div>
  );
};

const AddPessoa = ({ onSuccess }) => {
  const [form, setForm] = useState({
    nome: "", idade: "", sexo: "", sexoOutro: "", lat: "", lon: "", obs: "",
  });
  const [fotos, setFotos] = useState([null, null, null]);
  const [locs, setLocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setFoto = (i) => (file) => setFotos((prev) => { const next = [...prev]; next[i] = file; return next; });
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
    if (parseFloat(form.lat) < -90 || parseFloat(form.lat) > 90) return "Latitude entre -90 e 90";
    if (parseFloat(form.lon) < -180 || parseFloat(form.lon) > 180) return "Longitude entre -180 e 180";
    if (!fotos[0]) return "A primeira fotografia é obrigatória";
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
      fd.append("imagem1", fotos[0]);
      if (fotos[1]) fd.append("imagem2", fotos[1]);
      if (fotos[2]) fd.append("imagem3", fotos[2]);
      fd.append("historico", JSON.stringify(
        locs.filter(l => l.lat && l.lon).map(l => ({
          lat: parseFloat(l.lat), lon: parseFloat(l.lon), data: l.data, hora: l.hora,
        }))
      ));
      const res = await fetch(`${API}/pessoas_criar`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.erro) throw new Error(json.erro || "Erro ao criar");
      setForm({ nome: "", idade: "", sexo: "", sexoOutro: "", lat: "", lon: "", obs: "" });
      setFotos([null, null, null]);
      setLocs([]);
      onSuccess();
    } catch (e) {
      setError(e.message || "Erro ao criar pessoa. Verifica o servidor.");
    } finally { setLoading(false); }
  };

  const inputFocus = (e) => e.target.style.borderColor = "var(--accent)";
  const inputBlur  = (e) => e.target.style.borderColor = "var(--border)";

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
          Adicionar Pessoa
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
          Preenche os dados para criar um novo registo
        </p>
      </div>

      <div style={s.card}>
        {/* Dados pessoais */}
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
            <label style={s.label}>Observações</label>
            <input style={s.input} value={form.obs} onChange={set("obs")}
              placeholder="Indique dados extra sobre a pessoa..."
              onFocus={inputFocus} onBlur={inputBlur} />
          </div>
        </div>

        {/* Fotografias */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "22px", marginTop: "4px" }}>
          <p style={{ ...s.label, marginBottom: "14px" }}>
            Fotografias{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
              — 1 obrigatória, até 3
            </span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
            <PhotoSlot label="Foto 1 (obrigatória)" file={fotos[0]} onChange={setFoto(0)} />
            <PhotoSlot label="Foto 2 (opcional)"   file={fotos[1]} onChange={setFoto(1)} />
            <PhotoSlot label="Foto 3 (opcional)"   file={fotos[2]} onChange={setFoto(2)} />
          </div>
        </div>

        {/* Localizações */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "22px", marginTop: "22px" }}>
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
                background: "var(--accent-light)", border: "1px solid var(--accent-border)",
                borderRadius: "7px", color: "var(--accent)", padding: "9px 12px", cursor: "pointer",
                fontSize: "13px",
              }}>✕</button>
            </div>
          ))}
          <button onClick={addLoc} style={{
            background: "none", border: "1px dashed var(--border-strong)",
            borderRadius: "7px", color: "var(--text-muted)", fontSize: "13px",
            padding: "8px 16px", cursor: "pointer", fontFamily: "var(--font-sans)",
            transition: "all 0.12s", marginTop: "4px",
          }}>+ Adicionar localização</button>
        </div>

        {error && (
          <div style={{
            marginTop: "16px", background: "var(--accent-light)", border: "1px solid var(--accent-border)",
            borderRadius: "7px", padding: "10px 14px", color: "var(--accent)", fontSize: "13px",
            fontFamily: "var(--font-mono)",
          }}>⚠ {error}</div>
        )}

        <button onClick={submit} disabled={loading} style={{
          marginTop: "22px", background: loading ? "var(--accent-mid)" : "var(--accent)",
          border: "none", borderRadius: "7px", color: "#fff", padding: "11px 26px",
          fontSize: "13px", fontWeight: 500, fontFamily: "var(--font-sans)",
          cursor: loading ? "not-allowed" : "pointer", transition: "all 0.12s",
          letterSpacing: "0.01em",
        }}>
          {loading ? "A criar..." : "Criar registo"}
        </button>
      </div>
    </div>
  );
};

export default AddPessoa;