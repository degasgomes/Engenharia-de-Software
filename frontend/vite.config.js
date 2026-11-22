import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em docker compose o back-end chama-se "backend"; fora dele, localhost.
const alvo = process.env.VITE_API_PROXY || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  // Vitest: testes dos módulos e dos ecrãs com o DOM simulado (jsdom).
  test: {
    environment: 'jsdom',
    setupFiles: './src/testes/preparar.js',
    restoreMocks: true,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': alvo,
      '/media': alvo,
    },
  },
})
