import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Esto asegura que las rutas funcionen en cualquier servidor (Netlify/GitHub)
  base: './', 
  build: {
    outDir: 'dist',
  }
})
