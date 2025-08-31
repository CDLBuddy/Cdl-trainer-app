// src/main.jsx
import '@/setup/school-overrides.js'
import './styles/index.css'

import React from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import SplashScreen from '@components/SplashScreen.jsx'
import ToastProvider from '@components/ToastProvider.jsx'
import { useAuthStatus } from '@utils/auth.js'
import { __DEV__ } from '@utils/env.js'
import { warmRoutesOnSession } from '@utils/route-preload.js'
import { getCurrentSchoolBranding, BRAND_EVENT } from '@utils/school-branding.js'
import { SessionProvider, syncSessionDebug } from '@session'
import { router } from './router.jsx'

/* ------------------------------------------------------------------ */
/* Branding meta binding (idempotent + HMR-safe)                       */
/* ------------------------------------------------------------------ */
function bindBrandingMetaOnce() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (window.__BRAND_META_BOUND__) return
  window.__BRAND_META_BOUND__ = true

  const meta = document.querySelector('meta[name="theme-color"]')

  // initial paint
  getCurrentSchoolBranding()
    .then(brand => {
      if (meta && brand?.primaryColor) meta.setAttribute('content', brand.primaryColor)
    })
    .catch(err => { if (__DEV__) console.warn('[bootstrap] Branding fetch failed:', err) })

  // live updates
  const onBrandingUpdated = (e) => {
    const b = e?.detail
    if (meta && b?.primaryColor) meta.setAttribute('content', b.primaryColor)
  }
  window.addEventListener(BRAND_EVENT, onBrandingUpdated)

  // expose disposer for HMR
  window.__UNBIND_BRAND_META__ = () => {
    window.removeEventListener(BRAND_EVENT, onBrandingUpdated)
    delete window.__BRAND_META_BOUND__
    delete window.__UNBIND_BRAND_META__
  }
}
bindBrandingMetaOnce()

/* ------------------------------------------------------------------ */
/* Session root                                                        */
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

  // Warm routes only after we know loading is false and state changed
  const last = React.useRef({ isLoggedIn: null, role: null })
  React.useEffect(() => {
    if (value.loading) return
    const next = { isLoggedIn: !!value.isLoggedIn, role: value.role || null }
    if (
      next.isLoggedIn !== last.current.isLoggedIn ||
      next.role !== last.current.role
    ) {
      warmRoutesOnSession({
        loading: false,
        isLoggedIn: next.isLoggedIn,
        role: next.role,
      })
      last.current = next
    }
  }, [value.isLoggedIn, value.role, value.loading])

  // Bridge legacy globals (and clear them on logout)
  React.useEffect(() => {
    const u = value.user || {}
    const schoolId = (u.profile?.schoolId ?? u.schoolId ?? '').trim()
    const email = (u.email ?? u.profile?.email ?? '').trim()

    try {
      if (schoolId) {
        localStorage.setItem('schoolId', schoolId)
        // @ts-ignore legacy bridge
        window.schoolId = schoolId
      } else {
        localStorage.removeItem('schoolId')
        // @ts-ignore
        delete window.schoolId
      }

      if (email) {
        // @ts-ignore
        window.currentUserEmail = email
      } else {
        // @ts-ignore
        delete window.currentUserEmail
      }
    } catch {
      /* ignore storage errors */
    }
  }, [value.user])

  return <SessionProvider value={value}>{children}</SessionProvider>
}

/* ------------------------------------------------------------------ */
/* Error boundary (unchanged)                                         */
/* ------------------------------------------------------------------ */
export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(error, info) { console.error('[App] Uncaught error:', error, info) }
  render() {
    if (this.state.err) {
      return (
        <div className="error-overlay" role="alert" aria-live="assertive" style={{ textAlign: 'center', padding: '6rem 1rem' }}>
          <h2>Something went wrong.</h2>
          <p style={{ color: '#b22', maxWidth: 720, margin: '0 auto' }}>{String(this.state.err)}</p>
          <button className="btn" onClick={() => window.location.reload()} style={{ marginTop: 20 }}>Reload App</button>
        </div>
      )
    }
    return this.props.children
  }
}

/* ------------------------------------------------------------------ */
/* Mount                                                               */
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
            fallbackElement={<SplashScreen message="Loading CDL Trainer…" showTip={false} />}
          />
        </ErrorBoundary>
      </SessionRoot>
    </ToastProvider>
  </React.StrictMode>
)

/* ------------------------------------------------------------------ */
/* Vite HMR hygiene                                                    */
/* ------------------------------------------------------------------ */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try { window.__UNBIND_BRAND_META__?.() } catch {}
    root.unmount()
  })
}