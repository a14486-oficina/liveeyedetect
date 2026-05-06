import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: ["freya-ethylic-nicolas.ngrok-free.dev"],
    proxy: {
      '/ws-signal': {
        target: 'ws://localhost:3000',
        ws: true,
        rewriteWsOrigin: true,
      }
    }
  }
})