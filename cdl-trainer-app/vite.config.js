// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM-safe __dirname
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const r = p => path.resolve(__dirname, p)

// Optional bundle analyzer: run with VISUALIZE=1 vite build
async function maybeVisualizer(enabled) {
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
  const visualizerPlugin = await maybeVisualizer(analyze)

  return {
    plugins: [
      react(),
      ...(visualizerPlugin ? [visualizerPlugin] : []),
    ],

    resolve: {
      alias: {
        // ===== Base =====
        '@': r('src'),

        // ===== Shared/global =====
        '@components': r('src/components'),
        '@utils': r('src/utils'),
        '@navigation': r('src/navigation'),
        '@pages': r('src/pages'),
        '@styles': r('src/styles'),
        '@assets': r('src/assets'),
        '@shared': r('src/shared'),
        '@session': r('src/session'),

        // ===== Walkthrough system (global) =====
        '@walkthrough-data': r('src/walkthrough-data'),
        '@walkthrough-defaults': r('src/walkthrough-data/defaults'),
        '@walkthrough-loaders': r('src/walkthrough-data/loaders'),
        '@walkthrough-utils': r('src/walkthrough-data/utils'),

        // ===== Role-specific =====
        '@student': r('src/student'),
        '@student-components': r('src/student/components'),
        '@student-profile': r('src/student/profile'),
        '@student-profile-sections': r('src/student/profile/sections'),
        '@student-profile-ui': r('src/student/profile/ui'),
        '@student-walkthrough': r('src/student/walkthrough'),

        '@instructor': r('src/instructor'),
        '@admin': r('src/admin'),
        '@superadmin': r('src/superadmin'),
      },
      dedupe: ['react', 'react-dom'], // Prevent duplicate React copies
      // extensions: ['.js', '.jsx', '.json'], // Uncomment if omitting extensions
    },

    server: {
      port: 5173,
      open: true,
      // strictPort: true, // uncomment to fail instead of picking a new port
      // headers: { 'Cache-Control': 'no-store' }, // handy during deep dev
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
      // exclude: ['firebase'], // uncomment if switching to dynamic Firebase imports
    },

    build: {
      target: 'es2020',
      sourcemap: !isProd,          // on for dev/staging, off in prod
      cssCodeSplit: true,
      chunkSizeWarningLimit: 900,  // quiet warnings for larger role chunks
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-router': ['react-router', 'react-router-dom'],
            'vendor-firebase': [
              'firebase/app',
              'firebase/auth',
              'firebase/firestore',
              'firebase/storage',
            ],
          },
        },
      },
      // assetsInlineLimit: 0, // uncomment to force all assets to files
    },

    define: {
      __DEV__: !isProd,
    },
  }
})
