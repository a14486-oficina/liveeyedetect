// Com proxy do Vite, todas as chamadas são relativas ao frontend.
// Funciona em localhost E via ngrok sem alterar nada.

export const API = "";
export const WS_PROTO = location.protocol === "https:" ? "wss://" : "ws://";
export const WS_HOST  = location.host;

