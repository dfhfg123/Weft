import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { weftApi } from './server/vite-api.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), weftApi()],
  server: { port: 5199 },
  preview: { port: 5200 },
})
