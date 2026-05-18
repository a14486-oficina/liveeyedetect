import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: ["freya-ethylic-nicolas.ngrok-free.dev"],
    proxy: {
      // REST — todos os endpoints do backend
      '/login':                      { target: 'http://localhost:8000', changeOrigin: true },
      '/registar':                   { target: 'http://localhost:8000', changeOrigin: true },
      '/recuperar':                  { target: 'http://localhost:8000', changeOrigin: true },
      '/pessoas_criar':              { target: 'http://localhost:8000', changeOrigin: true },
      '/pessoas_listar':             { target: 'http://localhost:8000', changeOrigin: true },
      '/pessoas_listar_encontradas': { target: 'http://localhost:8000', changeOrigin: true },
      '/pessoa_detalhes':            { target: 'http://localhost:8000', changeOrigin: true },
      '/pessoa_atualizar':           { target: 'http://localhost:8000', changeOrigin: true },
      '/pessoa_encontrada':          { target: 'http://localhost:8000', changeOrigin: true },
      '/pessoa_adicionar_loc':       { target: 'http://localhost:8000', changeOrigin: true },
      '/utilizador_perfil':          { target: 'http://localhost:8000', changeOrigin: true },
      '/utilizador_atualizar':       { target: 'http://localhost:8000', changeOrigin: true },
      '/utilizador_password':        { target: 'http://localhost:8000', changeOrigin: true },
      '/utilizador_eliminar':        { target: 'http://localhost:8000', changeOrigin: true },
      '/admin':                      { target: 'http://localhost:8000', changeOrigin: true },

      // WebSockets
      '/ws-signal': { target: 'ws://localhost:8000', ws: true, rewriteWsOrigin: true },
      '/ws':        { target: 'ws://localhost:8000', ws: true, rewriteWsOrigin: true },
    },
  },
})