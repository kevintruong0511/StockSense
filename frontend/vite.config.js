import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Chuyển tiếp gọi API sang backend Express (mặc định cổng 5174).
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
      // WebSocket realtime giá.
      '/ws': {
        target: 'http://localhost:5174',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
