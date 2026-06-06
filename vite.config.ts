import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' hace que el build funcione en Vercel/Netlify/GitHub Pages
// y también abriendo dist/index.html directamente.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
})
