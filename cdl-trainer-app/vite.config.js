// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const r = (p) => path.resolve(__dirname, p);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': r('src'),

      // Shared/global
      '@components': r('src/components'),
      '@utils': r('src/utils'),
      '@navigation': r('src/navigation'),
      '@pages': r('src/pages'),
      '@session': r('src/session'),
      '@shared': r('src/shared'),
      '@styles': r('src/styles'),
      '@assets': r('src/assets'),
      '@walkthrough-data': r('src/walkthrough-data'),

      // Role-specific
      '@student': r('src/student'),
      '@student-components': r('src/student/components'),
      '@instructor': r('src/instructor'),
      '@admin': r('src/admin'),
      '@superadmin': r('src/superadmin'),
    },
  },
  server: {
    port: 5173,
    open: true,
    // strictPort: true, // uncomment to fail instead of picking a new port
  },
});
