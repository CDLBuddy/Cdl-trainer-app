// src/admin/AdminRouter.jsx
// ======================================================================
// Admin Router (nested under /admin/*)
// - Lazy-loads admin pages (incl. Walkthroughs suite)
// - Local Suspense fallback (keeps app chrome responsive)
// - Lightweight error boundary for render-time safety
// - Preload hook: AdminRouter.preload() (delegates to ./preload.js)
// - Idle post-mount warm-up of *core* screens (lighter than full preload)
// ======================================================================

import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Preload helpers (single source of truth)
import { preloadAdminAll as _preloadAll, preloadAdminCore as _preloadCore } from './preload.js'

// ---- Lazy pages ---------------------------------------------------------
const AdminDashboard = lazy(() => import('@admin/AdminDashboard.jsx'))
const AdminProfile   = lazy(() => import('@admin/AdminProfile.jsx'))
const AdminUsers     = lazy(() => import('@admin/AdminUsers.jsx'))
const AdminCompanies = lazy(() => import('@admin/AdminCompanies.jsx'))
const AdminReports   = lazy(() => import('@admin/AdminReports.jsx'))
// const AdminBilling = lazy(() => import('@admin/AdminBilling.jsx')) // when ready

// NEW: Walkthrough Management (barrel-safe direct path)
const WalkthroughManager = lazy(() => import('@admin/walkthroughs/WalkthroughManager.jsx'))

// ---- Local loading UI (accessible) -------------------------------------
function Loading({ text = 'Loading admin page…' }) {
  return (
    <div
      className="loading-container"
      role="status"
      aria-live="polite"
      style={{ textAlign: 'center', marginTop: '4rem' }}
    >
      <div className="spinner" />
      <p>{text}</p>
    </div>
  )
}

// ---- Small, contained error boundary -----------------------------------
class AdminSectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) {
    return { err }
  }
  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[AdminRouter] render error:', error, info)
    }
  }
  render() {
    if (this.state.err) {
      return (
        <div
          className="error-overlay"
          role="alert"
          aria-live="assertive"
          style={{ padding: '3rem 1rem', textAlign: 'center' }}
        >
          <h2>Admin area failed to load</h2>
          <p style={{ color: '#b22' }}>{String(this.state.err)}</p>
          <button className="btn" onClick={() => window.location.reload()} style={{ marginTop: 16 }}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ---- Fallback route: normalize unknown paths ---------------------------
function AdminNotFound() {
  return <Navigate to="/admin/dashboard" replace />
}

// ---- Router component ---------------------------------------------------
export default function AdminRouter() {
  // Light idle warm-up of core screens after mount (skip on reduced motion)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersReduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const run = () => { if (!prefersReduced) _preloadCore().catch(() => {}) }

    if ('requestIdleCallback' in window) {
      // @ts-expect-error not in std lib
      const id = window.requestIdleCallback(run, { timeout: 2000 })
      return () => window.cancelIdleCallback?.(id)
    }
    const t = setTimeout(run, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <AdminSectionErrorBoundary>
      <Suspense
        fallback={
          <Loading text="Loading admin area…" />
          // Or a global splash:
          // <SplashScreen message="Loading admin area…" showTip={false} />
        }
      >
        <Routes>
          {/* Root (/admin) → dashboard */}
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />

          {/* Core */}
          <Route path="profile"   element={<AdminProfile />} />
          <Route path="users"     element={<AdminUsers />} />
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="reports"   element={<AdminReports />} />
          {/* <Route path="billing" element={<AdminBilling />} /> */}

          {/* NEW: Walkthrough management hub (all editor/upload/list views live under this) */}
          <Route path="walkthroughs/*" element={<WalkthroughManager />} />

          {/* Fallback */}
          <Route path="*" element={<AdminNotFound />} />
        </Routes>
      </Suspense>
    </AdminSectionErrorBoundary>
  )
}

/**
 * Optional: warm *all* admin chunks (hover/idle/route-guard).
 * Usage: import AdminRouter from '@admin/AdminRouter.jsx'
 *        AdminRouter.preload?.()
 * Keeping a single default export (component) satisfies the
 * react-refresh/only-export-components rule.
 * @type {() => Promise<void>}
 */
AdminRouter.preload = _preloadAll