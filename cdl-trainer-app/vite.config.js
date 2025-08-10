import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@navigation': path.resolve(__dirname, 'src/navigation'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@student': path.resolve(__dirname, 'src/student'),
      '@instructor': path.resolve(__dirname, 'src/instructor'),
      '@admin': path.resolve(__dirname, 'src/admin'),
      '@superadmin': path.resolve(__dirname, 'src/superadmin'),
      '@walkthrough': path.resolve(__dirname, 'src/walkthrough-data'),
      '@styles': path.resolve(__dirname, 'src/styles'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
