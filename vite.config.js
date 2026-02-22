import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/Dampe/readable/',
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client'],
  },
}))
