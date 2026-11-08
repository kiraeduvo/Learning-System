import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 相对路径，让 Capacitor（Android app）和浏览器都能正确加载
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
  },
})
