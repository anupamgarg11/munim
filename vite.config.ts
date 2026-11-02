import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Served from GitHub Pages at /munim/. Routing is hash-based, so no server rewrites are needed.
export default defineConfig({
  base: '/munim/',
  plugins: [react(), tailwindcss()],
  // One bundle on purpose (no route splitting in a single-screen demo). The budget that
  // matters is SPEC 10: under 300 KB of JS gzipped; this bundle is about half of that.
  build: { chunkSizeWarningLimit: 700 },
})
