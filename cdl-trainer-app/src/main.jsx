// src/main.jsx
// ============================================================
// App bootstrap (React + Vite + Data Router)
// - Global styles
// - School overrides (per-school links/scheduling)  <-- added
// - Branding pre-load (theme-color + live updates)
// - Top-level providers (Toast, Session)
// - Route preloading (public + role-aware, idle/network-aware)
// - RouterProvider mount
// - Compact top-level error boundary
// ============================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

// 🔹 Must run before anything reads window.schoolWebsites / schoolScheduling
import '@/setup/school-overrides.js'

// Global styles
import './styles/index.css'

// Providers & utils
import SplashScreen from '@components/SplashScreen.jsx'
import ToastProvider from '@components/ToastProvider.jsx'
import { useAuthStatus } from '@utils/auth.js'
import { __DEV__ } from '@utils/env.js'
import { warmRoutesOnSession } from '@utils/route-preload.js'
import { getCurrentSchoolBranding } from '@utils/school-branding.js'

import { SessionProvider, syncSessionDebug } from '@session'

// Router
import { router } from './router.jsx'

/* ------------------------------------------------------------------ */
/* Bootstrap (brand color hint)                                       */
/* ------------------------------------------------------------------ */

void (async () => {
  try {
    const brand = await getCurrentSchoolBranding()
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta && brand?.primaryColor)
      meta.setAttribute('content', brand.primaryColor)

    // React to later branding switches (e.g., school switcher)
    window.addEventListener('branding:updated', e => {
      const b = e?.detail
      if (meta && b?.primaryColor) meta.setAttribute('content', b.primaryColor)
    })
  } catch (err) {
    if (__DEV__) console.warn('[bootstrap] Branding fetch failed:', err)
  }
})()

/* ------------------------------------------------------------------ */
/* Session root: exposes auth to context + warms routes on change     */
/* Also mirrors a couple of legacy globals used by older modules.     */
/* ------------------------------------------------------------------ */

export function SessionRoot({ children }) {
  const auth = useAuthStatus() // { loading, isLoggedIn, role, user }

  const value = React.useMemo(
    () => ({
      loading: !!auth.loading,
      isLoggedIn: !!auth.isLoggedIn,
      role: auth.role ?? null,
      user: auth.user ?? null,
    }),
    [auth.loading, auth.isLoggedIn, auth.role, auth.user]
  )

  if (__DEV__) syncSessionDebug(value)

  // 🔥 Route warming only when login/role truly change (loop-safe)
  const last = React.useRef({ isLoggedIn: null, role: null })
  React.useEffect(() => {
    const next = { isLoggedIn: !!value.isLoggedIn, role: value.role || null }
    if (
      next.isLoggedIn !== last.current.isLoggedIn ||
      next.role !== last.current.role
    ) {
      warmRoutesOnSession({
        loading: !!value.loading,
        isLoggedIn: next.isLoggedIn,
        role: next.role,
      })
      last.current = next
    }
  }, [value.isLoggedIn, value.role, value.loading])

  // 🧭 Mirror schoolId/email for legacy helpers that read from window/localStorage
  React.useEffect(() => {
    const u = value.user || {}
    const schoolId = (u.profile?.schoolId ?? u.schoolId ?? '').trim()
    const email = (u.email ?? u.profile?.email ?? '').trim()

    if (schoolId) {
      try {
        localStorage.setItem('schoolId', schoolId)
      } catch {}
      // keep a window property too (older code checks window.schoolId first)
      window.schoolId = schoolId
    }
    if (email) {
      window.currentUserEmail = email
    }
  }, [value.user])

  return <SessionProvider value={value}>{children}</SessionProvider>
}

/* ------------------------------------------------------------------ */
/* Optional: tiny top-level error boundary                            */
/* ------------------------------------------------------------------ */

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) {
    return { err }
  }
  componentDidCatch(error, info) {
    console.error('[App] Uncaught error:', error, info)
  }
  render() {
    if (this.state.err) {
      return (
        <div
          className="error-overlay"
          role="alert"
          aria-live="assertive"
          style={{ textAlign: 'center', padding: '6rem 1rem' }}
        >
          <h2>Something went wrong.</h2>
          <p style={{ color: '#b22', maxWidth: 720, margin: '0 auto' }}>
            {String(this.state.err)}
          </p>
          <button
            className="btn"
            onClick={() => window.location.reload()}
            style={{ marginTop: 20 }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

/* ------------------------------------------------------------------ */
/* Mount                                                              */
/* ------------------------------------------------------------------ */

const container = document.getElementById('root')
if (!container) {
  console.error('Root node "#root" not found in index.html')
  throw new Error('Root node "#root" not found')
}

const root = createRoot(container)

root.render(
  <React.StrictMode>
    <ToastProvider>
      <SessionRoot>
        <ErrorBoundary>
          <RouterProvider
            router={router}
            // Shown while route elements lazily load before AppLayout Suspense kicks in
            fallbackElement={
              <SplashScreen message="Loading CDL Trainer…" showTip={false} />
            }
          />
        </ErrorBoundary>
      </SessionRoot>
    </ToastProvider>
  </React.StrictMode>
)

/* ------------------------------------------------------------------ */
/* Optional: Service Worker (only if you ship /sw.js)                 */
/* ------------------------------------------------------------------ */
// if ('serviceWorker' in navigator && import.meta.env.PROD) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js').catch(() => {})
//   })
// }

/* ------------------------------------------------------------------ */
/* Vite HMR hygiene                                                   */
/* ------------------------------------------------------------------ */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount()
  })
}
