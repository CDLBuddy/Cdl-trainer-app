// Path: vite.config.js
// ======================================================================
// Vite Config (React + Aliases + DX extras)
// - React Fast Refresh
// - Aliases aligned with src structure (incl. @communications, @lib, @setup)
// - Optional visualizer & inspect (opt-in via env vars)
// - Stable vendor manualChunks for better browser caching
// - CSS Modules tuned for ergonomic classnames
// ======================================================================

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ESM-safe __dirname
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const r = p => path.resolve(__dirname, p)

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
  // Load both VITE_* and bare envs so VISUALIZE/INSPECT work either way
  const envVite = loadEnv(mode, process.cwd(), 'VITE_')
  const envAll = loadEnv(mode, process.cwd(), '')

  const isProd = mode === 'production'
  const analyze = (envVite.VITE_VISUALIZE ?? envAll.VISUALIZE) ? true : false
  const inspect = (envVite.VITE_INSPECT ?? envAll.INSPECT) ? true : false
  const lanHost = (envVite.VITE_LAN ?? envAll.VITE_LAN) === '1'

  const visualizerPlugin = await maybeVisualizer(analyze)
  const inspectPlugin = await maybeInspect(inspect)

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

        // ===== Shared Communications =====
        '@communications': r('src/communications'),

        // ===== lib =====
        '@lib': r('src/lib'),
        '@lib/scheduling': r('src/lib/scheduling'),

        // user-profile convenience
        '@user-profile': r('src/lib/user-profile'),
        '@user-profile/helpers': r('src/lib/user-profile/helpers.js'),
        '@user-profile/normalize': r('src/lib/user-profile/normalize.js'),
        '@user-profile/progress': r('src/lib/user-profile/progress.js'),
        '@user-profile/firestore': r('src/lib/user-profile/firestore.js'),
        '@user-profile/lists': r('src/lib/user-profile/lists.js'),

        // ===== Setup / overrides =====
        '@setup': r('src/setup'),

        // ===== Types / Canonical domain models =====
        '@types': r('src/types'),
        '@/types': r('src/types'),

        // ===== Shared / Global =====
        '@assets': r('src/assets'),
        '@components': r('src/components'),
        '@navigation': r('src/navigation'),
        '@pages': r('src/pages'),
        '@session': r('src/session'),
        '@shared': r('src/shared'),
        '@styles': r('src/styles'),
        '@utils': r('src/utils'),

        // ===== Data =====
        '@data': r('src/data'),

        // ===== Walkthrough system =====
        '@walkthrough-data': r('src/walkthrough-data'),
        '@walkthrough-defaults': r('src/walkthrough-data/defaults'),
        '@walkthrough-loaders': r('src/walkthrough-data/loaders'),
        '@walkthrough-utils': r('src/walkthrough-data/utils'),
        '@walkthrough-overlays': r('src/walkthrough-data/overlays'),
        '@walkthrough-restrictions': r('src/walkthrough-data/overlays/restrictions'),
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

        // Admin
        '@admin': r('src/admin'),
        '@admin/dashboard': r('src/admin/dashboard'),
        '@admin-walkthroughs': r('src/admin/walkthroughs'),

        '@superadmin': r('src/superadmin'),
      },
      // Ensure one copy of React in the graph
      dedupe: ['react', 'react-dom'],
    },

    css: {
      // CSS Modules ergonomics: .foo-bar -> styles.fooBar
      modules: {
        localsConvention: 'camelCaseOnly',
      },
      // (optional) postcss handled via postcss.config.js if present
    },

    server: {
      // Toggle LAN device testing with: VITE_LAN=1 vite
      host: lanHost ? true : 'localhost',
      port: 5173,
      strictPort: true,
      open: true,
      // proxy: { '/__/firebase': 'http://127.0.0.1:5000' } // example for emulators
    },

    preview: {
      port: 4173,
      open: false,
      strictPort: true,
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
      // FullCalendar (widget)
        '@fullcalendar/react',
        '@fullcalendar/daygrid',
        '@fullcalendar/timegrid',
        '@fullcalendar/interaction',
      ],
      esbuildOptions: { target: 'es2020' },
    },

    build: {
      target: 'es2020',
      sourcemap: !isProd,
      cssCodeSplit: true,
      cssMinify: true,
      reportCompressedSize: false, // faster builds; use visualizer when needed
      chunkSizeWarningLimit: 1024, // router + firebase can be chunky
      rollupOptions: {
        output: {
          manualChunks: {
            // keep these vendor chunks stable
            'vendor-react': ['react', 'react-dom'],
            'vendor-router': ['react-router', 'react-router-dom'],
            'vendor-firebase': [
              'firebase/app',
              'firebase/auth',
              'firebase/firestore',
              'firebase/storage',
            ],
            // optional: split calendar libs to a stable chunk
            'vendor-calendar': [
              '@fullcalendar/react',
              '@fullcalendar/daygrid',
              '@fullcalendar/timegrid',
              '@fullcalendar/interaction',
            ],
          },
        },
      },
    },

    define: {
      __DEV__: !isProd, // Back-compat; prefer import.meta.env.DEV in new code
    },
  }
})
