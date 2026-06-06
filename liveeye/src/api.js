// Com proxy do Vite, todas as chamadas são relativas ao frontend.
// Funciona em localhost E via ngrok sem alterar nada.

const BACKEND = import.meta.env.VITE_API_URL || "";

export const API = BACKEND;
export const WS_PROTO = location.protocol === "https:" ? "wss://" : "ws://";
export const WS_HOST  = BACKEND
  ? BACKEND.replace("https://", "").replace("http://", "")
  : location.host;

export function getToken() {
  try {
    const raw = sessionStorage.getItem("liveeye_user");
    if (raw) {
      const user = JSON.parse(raw);
      return user?.token || "";
    }
  } catch { /* silent */ }
  return "";
}