// Path: /vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM-safe __dirname
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const r = (p) => path.resolve(__dirname, p)

// Optional bundle analyzer — run with VISUALIZE=1 (or VITE_VISUALIZE=1)
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

// Optional: vite-plugin-inspect — run with INSPECT=1 (or VITE_INSPECT=1)
async function maybeInspect(enabled) {
  if (!enabled) return null
  const Inspect = (await import('vite-plugin-inspect')).default
  return Inspect()
}

export default defineConfig(async ({ mode }) => {
  // Load both VITE_* and bare envs so VISUALIZE/INSPECT keep working
  const envVite = loadEnv(mode, process.cwd(), 'VITE_')
  const envAll  = loadEnv(mode, process.cwd(), '')

  const isProd  = mode === 'production'
  const analyze = (envVite.VITE_VISUALIZE ?? envAll.VISUALIZE) ? true : false
  const inspect = (envVite.VITE_INSPECT   ?? envAll.INSPECT)   ? true : false
  const lanHost = (envVite.VITE_LAN ?? envAll.VITE_LAN) === '1'

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

        // ===== Shared / Global =====
        '@assets': r('src/assets'),
        '@components': r('src/components'),
        '@navigation': r('src/navigation'),
        '@pages': r('src/pages'),
        '@session': r('src/session'),
        '@shared': r('src/shared'),
        '@styles': r('src/styles'),
        '@utils': r('src/utils'),

        // ===== Walkthrough system (global) =====
        '@walkthrough-data': r('src/walkthrough-data'),
        '@walkthrough-defaults': r('src/walkthrough-data/defaults'),
        '@walkthrough-loaders': r('src/walkthrough-data/loaders'),
        '@walkthrough-utils': r('src/walkthrough-data/utils'),
        '@walkthrough-overlays': r('src/walkthrough-data/overlays'),
        // If you want fewer single-file aliases, you can import from this folder:
        // import auto from '@walkthrough-restrictions/automatic.js'
        '@walkthrough-restrictions': r('src/walkthrough-data/overlays/restrictions'),
        // (Keep the original single-file aliases if you’re using them already)
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

        // Includes Admin Dashboard, Companies suite, Billing, Walkthroughs, Settings, and Users (if present)
        '@admin': r('src/admin'),
        '@admin-walkthroughs': r('src/admin/walkthroughs'),

        '@superadmin': r('src/superadmin'),
      },
      dedupe: ['react', 'react-dom'],
    },

    server: {
      // Toggle LAN device testing with: VITE_LAN=1 vite
      host: lanHost ? true : 'localhost',
      port: 5173,
      strictPort: true,
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
        // Firebase modular SDK: explicit prebundle helps HMR/startup
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        // If you later need to parse XLSX during dev:
        // 'xlsx',
      ],
      esbuildOptions: { target: 'es2020' },
    },

    build: {
      target: 'es2020',
      sourcemap: !isProd,
      cssCodeSplit: true,
      cssMinify: true,              // explicit (Vite defaults to true)
      reportCompressedSize: false,  // faster builds; use visualizer when needed
      chunkSizeWarningLimit: 1024,  // Firebase & router chunks can be large
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
            // You can add feature bundles later if desired:
            // 'feature-admin': ['@admin/preload.js', '@admin/companies/...'],
          },
        },
      },
      // assetsInlineLimit: 0,
    },

    define: {
      __DEV__: !isProd, // Back-compat; prefer import.meta.env.DEV in new code
    },
  }
})