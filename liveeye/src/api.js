/**
 * api.js — configuração central do backend
 *
 * Lógica automática:
 *   • HTTP local (npm run dev no mesmo PC/rede)
 *       → aponta diretamente para o IP do servidor
 *   • HTTPS (ngrok ou outro proxy com TLS)
 *       → usa o host da própria página (o ngrok faz proxy de tudo)
 *
 * Para mudar o IP do servidor basta editar LOCAL_API_HOST aqui.
 */

const LOCAL_API_HOST = "192.168.1.130:8000";

const isSecure = location.protocol === "https:";

// Base URL para fetch (REST)
export const API = isSecure
  ? `https://${location.host}`
  : `http://${LOCAL_API_HOST}`;

// Protocolo e host para WebSockets
export const WS_PROTO = isSecure ? "wss://" : "ws://";
export const WS_HOST  = isSecure ? location.host : LOCAL_API_HOST;