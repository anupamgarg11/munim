import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Served from GitHub Pages at /munim/. Routing is hash-based, so no server rewrites are needed.
export default defineConfig({
  base: '/munim/',
  plugins: [react(), tailwindcss()],
})
