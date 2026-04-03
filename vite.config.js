import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/neo-sentinel/',
  build: {
    outDir: 'neo-sentinel',
    emptyOutDir: true,
    rollupOptions: {
      input: 'app.html',
    },
  },
  server: {
    proxy: {
      '/api/cad': {
        target: 'https://ssd-api.jpl.nasa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cad/, '/cad.api'),
      },
      '/api/sentry': {
        target: 'https://ssd-api.jpl.nasa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sentry/, '/sentry.api'),
      },
    },
  },
})
