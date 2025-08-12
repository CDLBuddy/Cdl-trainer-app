// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM-safe dirname
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const r = p => path.resolve(__dirname, p)

// Optional bundle analyzer: run with VISUALIZE=1 vite build
const maybeVisualizer = async (enabled) => {
  if (!enabled) return null
  const { visualizer } = await import('rollup-plugin-visualizer')
  return visualizer({
    filename: 'stats.html',
    template: 'treemap',
    gzipSize: true,
    brotliSize: true,
    open: false,
  })
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProd = mode === 'production'
  const analyze = !!env.VISUALIZE

  return {
    plugins: [
      react(),
      ...(await maybeVisualizer(analyze) ? [await maybeVisualizer(analyze)] : []),
    ],

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
      // (Optional) add extensions if you want to omit them in imports
      // extensions: ['.js', '.jsx', '.json'],
    },

    server: {
      port: 5173,
      open: true,
      // strictPort: true, // uncomment to fail instead of picking a new port
    },

    preview: {
      port: 4173,
      open: false,
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
      ],
      // Exclude heavy libs you lazy-load to avoid bundling twice
      exclude: [
        // 'firebase', // if you dynamically import individual Firebase packages
      ],
    },

    build: {
      target: 'es2020',
      sourcemap: !isProd,              // dev/staging debugging; off in prod
      cssCodeSplit: true,
      chunkSizeWarningLimit: 900,      // quiets warnings for big role chunks
      rollupOptions: {
        output: {
          // Sensible vendor splitting (tweak as needed after checking stats.html)
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-router': ['react-router', 'react-router-dom'],
            // If you use Firebase modular SDK heavily, this keeps it in one chunk
            'vendor-firebase': [
              'firebase/app',
              'firebase/auth',
              'firebase/firestore',
              'firebase/storage',
            ],
          },
        },
      },
    },

    define: {
      __DEV__: !isProd,
    },
  }
})