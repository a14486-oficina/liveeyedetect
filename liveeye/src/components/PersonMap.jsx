import { useState, useEffect, useRef } from "react";

let leafletReady = false;
let leafletCallbacks = [];

function loadLeaflet(cb) {
  if (leafletReady) return cb();
  leafletCallbacks.push(cb);
  if (document.getElementById("leaflet-css")) return;

  const link = document.createElement("link");
  link.id = "leaflet-css";
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);

  const script = document.createElement("script");
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.onload = () => {
    const L = window.L;
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    leafletReady = true;
    leafletCallbacks.forEach((fn) => fn());
    leafletCallbacks = [];
  };
  document.head.appendChild(script);
}

const PersonMap = ({ homeCoords, localizacoes, foundCoords }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(leafletReady);
  const hasFound = foundCoords?.lat != null && foundCoords?.lon != null;

  useEffect(() => {
    if (!ready) loadLeaflet(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    if (mapRef.current) return;

    const L = window.L;
    const hasHome = homeCoords?.lat != null && homeCoords?.lon != null;

    const parseDatetime = (loc) => {
      if (!loc.data && !loc.hora) return 0;
      const [d, m, y] = (loc.data || "01/01/1970").split("/");
      const [h, min] = (loc.hora || "00:00").split(":");
      return new Date(`${y}-${m}-${d}T${h}:${min}:00`).getTime();
    };

    const sightings = (localizacoes || [])
      .filter((l) => l.lat != null && l.lon != null)
      .sort((a, b) => parseDatetime(a) - parseDatetime(b));

    const center = hasFound
      ? [foundCoords.lat, foundCoords.lon]
      : hasHome
      ? [homeCoords.lat, homeCoords.lon]
      : sightings.length > 0
      ? [sightings[0].lat, sightings[0].lon]
      : [38.716, -9.139];

    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false });
    mapRef.current = map;

    L.tileLayer("http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);

    const bounds = [];

    const trailCoords = sightings.map((l) => [l.lat, l.lon]);
    if (hasHome) trailCoords.unshift([homeCoords.lat, homeCoords.lon]);
    if (hasFound) trailCoords.push([foundCoords.lat, foundCoords.lon]);

    if (trailCoords.length > 1) {
      L.polyline(trailCoords, {
        color: "#f59e0b", weight: 2.5, dashArray: "6 5", opacity: 0.85,
      }).addTo(map);
    }

    if (hasHome) {
      const homeIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          background:var(--accent,#4f6ef7);border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
        "></div>`,
        iconSize: [28, 28], iconAnchor: [14, 28],
      });
      L.marker([homeCoords.lat, homeCoords.lon], { icon: homeIcon })
        .addTo(map)
        .bindPopup("<b>🏠 Residência</b>");
      bounds.push([homeCoords.lat, homeCoords.lon]);
    }

    sightings.forEach((loc, i) => {
      const isLast = i === sightings.length - 1;
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${isLast ? 18 : 13}px;height:${isLast ? 18 : 13}px;
          border-radius:50%;
          background:${isLast ? "#f59e0b" : "#fbbf24"};
          border:${isLast ? "3px" : "2px"} solid #fff;
          box-shadow:0 1px 6px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [isLast ? 18 : 13, isLast ? 18 : 13],
        iconAnchor: [isLast ? 9 : 6, isLast ? 9 : 6],
      });
      L.marker([loc.lat, loc.lon], { icon })
        .addTo(map)
        .bindPopup(`<b>${isLast ? "📍 Último avistamento" : `Avistamento ${i + 1}`}</b>${loc.data ? `<br>${loc.data}${loc.hora ? " " + loc.hora : ""}` : ""}`);
      bounds.push([loc.lat, loc.lon]);
    });

    if (hasFound) {
      const foundIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:#2d7a4f;
          border:3px solid #fff;
          box-shadow:0 1px 6px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      });
      L.marker([foundCoords.lat, foundCoords.lon], { icon: foundIcon })
        .addTo(map)
        .bindPopup(`<b>📍 Localizada</b>${foundCoords.data ? `<br>${foundCoords.data}${foundCoords.hora ? " " + foundCoords.hora : ""}` : ""}`);
      bounds.push([foundCoords.lat, foundCoords.lon]);
    }

    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.25));
    } else {
      map.setView(center, 14);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [ready, homeCoords, localizacoes, foundCoords]);

  if (!ready) {
    return (
      <div style={{
        height: "280px", borderRadius: "9px", border: "1px solid var(--border)",
        background: "var(--bg-raised)", display: "flex", alignItems: "center",
        justifyContent: "center", gap: "8px",
        color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px",
      }}>
        <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◎</span>
        A carregar mapa…
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{
          fontSize: "10px", fontWeight: 500, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.09em",
          fontFamily: "var(--font-mono)",
        }}>Mapa de localização</span>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--accent,#4f6ef7)", display: "inline-block" }} />
            Residência
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
            Avistamentos
          </span>
          {hasFound && (
            <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2d7a4f", display: "inline-block" }} />
              Localizada
            </span>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        style={{
          height: "400px", borderRadius: "9px", overflow: "hidden",
          border: "1px solid var(--border)", zIndex: 0,
        }}
      />
    </div>
  );
};

export default PersonMap;
