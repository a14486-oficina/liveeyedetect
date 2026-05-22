// ── Toast global ─────────────────────────────────────────────────────────────
// Funciona fora da árvore React — pode ser chamado de qualquer ficheiro,
// incluindo dentro da fila de background do AddPessoa.
//
// Uso:
//   import { toast } from "../toast.js";
//   toast.error("Foto 1: nenhum rosto detetado");
//   toast.success("\"Maria Silva\" criado com sucesso!");
//   toast.info("A enviar registo...");
// ─────────────────────────────────────────────────────────────────────────────

let container = null;

function getContainer() {
  if (container && document.body.contains(container)) return container;

  container = document.createElement("div");
  container.id = "liveeye-toast-root";
  Object.assign(container.style, {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "99999",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    pointerEvents: "none",
  });
  document.body.appendChild(container);
  return container;
}

const COLORS = {
  error:   { bg: "#c0392b", icon: "⚠" },
  success: { bg: "#2d7a4f", icon: "✓" },
  info:    { bg: "#4a4a48", icon: "↑" },
};

function show(msg, type = "error", duration = 5000) {
  const c = getContainer();
  const { bg, icon } = COLORS[type] ?? COLORS.info;

  const el = document.createElement("div");
  Object.assign(el.style, {
    background: bg,
    color: "#fff",
    borderRadius: "9px",
    padding: "11px 20px",
    fontSize: "13px",
    fontFamily: "'DM Mono', monospace",
    boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
    maxWidth: "calc(100vw - 48px)",
    textAlign: "center",
    opacity: "0",
    transform: "translateY(10px) scale(0.97)",
    transition: "opacity 0.18s ease, transform 0.18s ease",
    pointerEvents: "none",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  });
  el.textContent = `${icon}  ${msg}`;

  c.appendChild(el);

  // Animar entrada
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0) scale(1)";
    });
  });

  // Animar saída e remover
  const remove = () => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px) scale(0.97)";
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
  };
  setTimeout(remove, duration);
}

export const toast = {
  error:   (msg, duration) => show(msg, "error",   duration),
  success: (msg, duration) => show(msg, "success", duration),
  info:    (msg, duration) => show(msg, "info",    duration),
};