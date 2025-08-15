// src/main.jsx
// ============================================================
// App bootstrap (React + Vite + Data Router)
// - Global styles
// - Branding pre-load (theme-color + cache)
// - Top-level providers (Toast, Session)
// - Route preloading (public + role-aware, idle/network-aware)
// - RouterProvider mount
// - Optional top-level error boundary
// ============================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

// Global styles
import './styles/index.css'

// Providers
import SplashScreen from '@components/SplashScreen.jsx'
import { ToastProvider } from '@components/ToastContext.js'
import { syncSessionDebug } from '@session/useSession'
import { useAuthStatus } from '@utils/auth.js'
import { warmRoutesOnSession } from '@utils/route-preload.js'
import { getCurrentSchoolBranding } from '@utils/school-branding.js'

import { SessionProvider } from '@session'

// Router
import { router } from './router.js'

// ---- Bootstrap (Vite supports top-level await) -------------------------
await (async () => {
  try {
    const brand = await getCurrentSchoolBranding()

    // Sync browser UI chrome color on first paint
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta && brand?.primaryColor) meta.setAttribute('content', brand.primaryColor)

    // React to later branding switches (e.g., school switcher)
    window.addEventListener('branding:updated', e => {
      const b = e?.detail
      if (meta && b?.primaryColor) meta.setAttribute('content', b.primaryColor)
    })
  } catch {
    // Non-fatal: continue rendering even if branding fetch fails
  }
})()

// ---- Session bridge: compute once, provide everywhere -------------------
// Exporting makes React Refresh happy without moving them to separate files.
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

  if (import.meta.env.DEV) syncSessionDebug(value)

  // Warm public pages immediately (idle) and role routers once known
  React.useEffect(() => {
    warmRoutesOnSession(value)
  }, [value])

  return <SessionProvider value={value}>{children}</SessionProvider>
}

// ---- Optional: tiny top-level error boundary ----------------------------
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) {
    return { err }
  }
  componentDidCatch(error, info) {
    console.error('Uncaught app error:', error, info)
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
          <p style={{ color: '#b22' }}>{String(this.state.err)}</p>
          <button className="btn" onClick={() => window.location.reload()} style={{ marginTop: 20 }}>
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ---- Mount --------------------------------------------------------------
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
            fallbackElement={<SplashScreen message="Loading CDL Trainer…" showTip={false} />}
          />
        </ErrorBoundary>
      </SessionRoot>
    </ToastProvider>
  </React.StrictMode>
)

// ---- Optional: Service Worker (only if you ship /sw.js) -----------------
// if ('serviceWorker' in navigator && import.meta.env.PROD) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js').catch(() => {})
//   })
// }

// ---- Vite HMR hygiene ---------------------------------------------------
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount()
  })
}
