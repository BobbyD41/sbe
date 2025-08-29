import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
<<<<<<< HEAD
})
=======
})
>>>>>>> 6fd6839 (frontend: dev proxy /api -> http://127.0.0.1:8000 for React)
