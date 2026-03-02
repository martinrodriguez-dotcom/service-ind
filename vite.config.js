import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Esto ayuda a que el navegador no se confunda con los tipos MIME localmente
    fs: {
      allow: ['.']
    }
  },
  // Si vas a desplegar en GitHub Pages bajo un nombre de repo (ej: /mi-app/)
  // Descomenta la siguiente línea y pon el nombre de tu repo:
  // base: '/nombre-de-tu-repo/', 
})
