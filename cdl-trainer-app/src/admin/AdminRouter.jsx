// ======================================================================
// Admin Router (nested under /admin/*)
// - Lazy-loads admin pages + walkthroughs
// - Accessible Suspense fallback (spinner + live status)
// - Tight error boundary with retry/reload
// - Idle warm-up of *core* screens (lighter than full preload)
// - Reports polish: warm heavy reports bundles on idle + ensure modal portal
// - Scroll-to-top (and best-effort focus) on route changes
// - Exposes AdminRouter.preload() and .preloadCore() for eager warming
// ======================================================================

import React, { Suspense, lazy, useEffect, memo } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

import {
  prefetchOnIdle as prefetchReportsOnIdle,
  ensureModalRoot,
} from '@admin/reports'
import { __DEV__ } from '@utils/env.js'

// Single source of truth for code-splitting warmups
import {
  preloadAdminAll as _preloadAll,
  preloadAdminCore as _preloadCore,
} from './preload.js'

// Reports: idle prefetch + portal root for modals (SubmitToTPRDialog, etc.)

// ---------- Lazy pages -------------------------------------------------
const AdminDashboard = lazy(() => import('@admin/dashboard/AdminDashboard.jsx'))
const AdminProfile = lazy(() => import('@admin/AdminProfile.jsx'))
const AdminReports = lazy(() => import('@admin/reports/AdminReports.jsx'))

// Companies suite
const AdminCompanies = lazy(() => import('@admin/companies/AdminCompanies.jsx'))
// ⬇️ updated path to the new folder (file name unchanged)
const CompanyDetail = lazy(
  () => import('@admin/companies/company-detail/CompanyDetail.jsx')
)

// Communications / Billing / Settings
const AdminCommunications = lazy(
  () => import('@admin/communications/AdminCommunications.jsx')
)
const AdminBilling = lazy(() => import('@admin/billing/Billing.jsx'))
const AdminSettings = lazy(() => import('@admin/settings/AdminSettings.jsx'))

// Walkthrough management hub
const WalkthroughManager = lazy(
  () => import('@admin/walkthroughs/Manager/WalkthroughManager.jsx')
)

// ---------- Local loading UI (accessible) ------------------------------
const Loading = memo(function Loading({ text = 'Loading admin page…' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ textAlign: 'center', marginTop: '4rem' }}
    >
      <div className="spinner" aria-hidden="true" />
      <p style={{ marginTop: 8 }}>{text}</p>
    </div>
  )
})

// ---------- Scroll & focus on route change -----------------------------
function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation()
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    } catch {
      window.scrollTo(0, 0)
    }
    const tryFocus = () => {
      const el =
        document.querySelector('[data-route-focus]') ||
        document.querySelector('main h1, [role="main"] h1') ||
        document.querySelector('main, [role="main"]')
      if (el && typeof el.focus === 'function') el.focus()
    }
    const id = window.requestAnimationFrame(tryFocus)
    return () => window.cancelAnimationFrame?.(id)
  }, [pathname])
  return null
}

// ---------- Small, contained error boundary ----------------------------
class AdminSectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
    this.reset = this.reset.bind(this)
  }
  static getDerivedStateFromError(err) {
    return { err }
  }
  componentDidCatch(error, info) {
    if (__DEV__) {
      console.error('[AdminRouter] render error:', error, info)
    }
  }
  reset() {
    this.setState({ err: null })
  }
  render() {
    if (this.state.err) {
      const msg =
        this.state.err?.message || String(this.state.err) || 'Unknown error.'
      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{ padding: '3rem 1rem', textAlign: 'center' }}
        >
          <h2 style={{ margin: 0 }}>Admin area failed to load</h2>
          <p style={{ color: '#b22', marginTop: 8 }}>{msg}</p>
          <div style={{ display: 'inline-flex', gap: 8, marginTop: 16 }}>
            <button className="btn outline" onClick={this.reset}>
              Try Again
            </button>
            <button className="btn" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// ---------- Fallback route: normalize unknown paths --------------------
function AdminNotFound() {
  return <Navigate to="/admin/dashboard" replace />
}

// ---------- Router -----------------------------------------------------
export default function AdminRouter() {
  useEffect(() => {
    ensureModalRoot('modal-root')
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersReduced = !!window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    )?.matches
    const warmCore = () => {
      if (!prefersReduced) _preloadCore().catch(() => {})
    }
    const disposeReportsIdle = prefetchReportsOnIdle()

    if ('requestIdleCallback' in window) {
      // @ts-expect-error not in all lib.d.ts variants
      const id = window.requestIdleCallback(warmCore, { timeout: 2000 })
      return () => {
        window.cancelIdleCallback?.(id)
        disposeReportsIdle?.()
      }
    }
    const t = setTimeout(warmCore, 300)
    return () => {
      clearTimeout(t)
      disposeReportsIdle?.()
    }
  }, [])

  return (
    <AdminSectionErrorBoundary>
      <ScrollToTopOnRouteChange />
      <Suspense fallback={<Loading text="Loading admin area…" />}>
        <Routes>
          {/* Root (/admin) → dashboard */}
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />

          {/* Core */}
          <Route path="profile" element={<AdminProfile />} />

          {/* Companies */}
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="companies/:companyId" element={<CompanyDetail />} />

          {/* Reports / Communications / Billing / Settings */}
          <Route path="reports" element={<AdminReports />} />
          <Route path="communications" element={<AdminCommunications />} />
          <Route path="billing" element={<AdminBilling />} />
          <Route path="settings" element={<AdminSettings />} />

          {/* Walkthrough management hub (self-contained router under here) */}
          <Route path="walkthroughs/*" element={<WalkthroughManager />} />

          {/* Legacy: /admin/users → redirect to Companies */}
          <Route
            path="users"
            element={<Navigate to="/admin/companies" replace />}
          />

          {/* Fallback */}
          <Route path="*" element={<AdminNotFound />} />
        </Routes>
      </Suspense>
    </AdminSectionErrorBoundary>
  )
}

AdminRouter.preload = _preloadAll
AdminRouter.preloadCore = _preloadCore
