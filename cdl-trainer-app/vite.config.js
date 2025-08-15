// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM-safe __dirname
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const r = p => path.resolve(__dirname, p)

// Optional bundle analyzer: run with VISUALIZE=1 (or VITE_VISUALIZE=1) vite build
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

// Optional: vite-plugin-inspect — run with INSPECT=1 (or VITE_INSPECT=1) vite dev
async function maybeInspect(enabled) {
  if (!enabled) return null
  const Inspect = (await import('vite-plugin-inspect')).default
  return Inspect()
}

export default defineConfig(async ({ mode }) => {
  // Load both VITE_* and bare envs so your existing VISUALIZE keeps working
  const envVite = loadEnv(mode, process.cwd(), 'VITE_')
  const envAll  = loadEnv(mode, process.cwd(), '') // includes non-VITE_ (e.g., VISUALIZE)

  const isProd   = mode === 'production'
  const analyze  = (envVite.VITE_VISUALIZE ?? envAll.VISUALIZE) ? true : false
  const inspect  = (envVite.VITE_INSPECT ?? envAll.INSPECT) ? true : false

  const visualizerPlugin = await maybeVisualizer(analyze)
  const inspectPlugin    = await maybeInspect(inspect)

  return {
    plugins: [
      react(),
      ...(inspectPlugin ? [inspectPlugin] : []),
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
        '@walkthrough-overlays': r('src/walkthrough-data/overlays'),
        // Restriction single-file aliases
        '@walkthrough-restriction-automatic': r('src/walkthrough-data/overlays/restrictions/automatic.js'),
        '@walkthrough-restriction-no-air': r('src/walkthrough-data/overlays/restrictions/no-air.js'),
        '@walkthrough-restriction-no-fifth-wheel': r('src/walkthrough-data/overlays/restrictions/no-fifth-wheel.js'),

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
      dedupe: ['react', 'react-dom'],
    },

    server: {
      host: true,       // allow LAN access (useful for device testing)
      port: 5173,
      strictPort: true, // fail fast if port is taken
      open: true,
      // headers: { 'Cache-Control': 'no-store' },
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
        // Firebase modular SDK tends to benefit from explicit prebundle
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
      ],
      // exclude: ['firebase'],
      esbuildOptions: {
        target: 'es2020',
      },
    },

    build: {
      target: 'es2020',
      sourcemap: !isProd,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 900,
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
      // assetsInlineLimit: 0,
    },

    define: {
      __DEV__: !isProd, // keep for back-compat while you finish migrating to import.meta.env.DEV
    },

    // logLevel: 'info',
  }
})
