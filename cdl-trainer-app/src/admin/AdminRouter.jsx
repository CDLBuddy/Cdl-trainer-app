// src/admin/AdminRouter.jsx
// ======================================================================
// Admin Router (nested under /admin/*)
// - Lazy-loads admin pages + walkthroughs
// - Local Suspense fallback (a11y-friendly spinner+status)
// - Error boundary with retry + reload
// - Idle warm-up of *core* screens (lighter than full preload)
// - Exposes AdminRouter.preload() for eager warming
// ======================================================================

import React, { Suspense, lazy, useEffect, memo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { __DEV__ } from '@utils/env.js'

// Preload helpers (single source of truth lives in ./preload.js)
import {
  preloadAdminAll as _preloadAll,
  preloadAdminCore as _preloadCore,
} from './preload.js'

// ---- Lazy pages --------------------------------------------------------
const AdminDashboard      = lazy(() => import('@admin/dashboard/AdminDashboard.jsx'))
const AdminProfile        = lazy(() => import('@admin/AdminProfile.jsx'))
const AdminReports        = lazy(() => import('@admin/reports/AdminReports.jsx'))

// Companies suite
const AdminCompanies      = lazy(() => import('@admin/companies/AdminCompanies.jsx'))
const CompanyDetail       = lazy(() => import('@admin/companies/CompanyDetail.jsx'))

// Communications (new)
const AdminCommunications = lazy(() => import('@admin/communications/AdminCommunications.jsx'))

// Billing
const AdminBilling        = lazy(() => import('@admin/billing/Billing.jsx'))

// Walkthrough management
const WalkthroughManager  = lazy(() => import('@admin/walkthroughs/WalkthroughManager.jsx'))

// Settings
const AdminSettings       = lazy(() => import('@admin/settings/AdminSettings.jsx'))

// ---- Local loading UI (accessible) ------------------------------------
const Loading = memo(function Loading({ text = 'Loading admin page…' }) {
  return (
    <div
      className="loading-container"
      role="status"
      aria-live="polite"
      style={{ textAlign: 'center', marginTop: '4rem' }}
    >
      <div className="spinner" aria-hidden="true" />
      <p style={{ marginTop: 8 }}>{text}</p>
    </div>
  )
})

// ---- Small, contained error boundary ----------------------------------
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
  reset() { this.setState({ err: null }) }
  render() {
    if (this.state.err) {
      const msg =
        (this.state.err && (this.state.err.message || String(this.state.err))) ||
        'Unknown error.'
      return (
        <div
          className="error-overlay"
          role="alert"
          aria-live="assertive"
          style={{ padding: '3rem 1rem', textAlign: 'center' }}
        >
          <h2 style={{ margin: 0 }}>Admin area failed to load</h2>
          <p style={{ color: '#b22', marginTop: 8 }}>{msg}</p>
          <div style={{ display: 'inline-flex', gap: 8, marginTop: 16 }}>
            <button className="btn outline" onClick={this.reset}>Try Again</button>
            <button className="btn" onClick={() => window.location.reload()}>Reload</button>
          </div>
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

// ---- Router component --------------------------------------------------
export default function AdminRouter() {
  // Light idle warm-up of core screens after mount (skips for reduce motion)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersReduced =
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const warm = () => { if (!prefersReduced) _preloadCore().catch(() => {}) }

    if ('requestIdleCallback' in window) {
      // @ts-expect-error not in all TS DOM libs
      const id = window.requestIdleCallback(warm, { timeout: 2000 })
      return () => window.cancelIdleCallback?.(id)
    }
    const t = setTimeout(warm, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <AdminSectionErrorBoundary>
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

          {/* Walkthrough management hub */}
          <Route path="walkthroughs/*" element={<WalkthroughManager />} />

          {/* Legacy: /admin/users → redirect to Companies */}
          <Route path="users" element={<Navigate to="/admin/companies" replace />} />

          {/* Fallback */}
          <Route path="*" element={<AdminNotFound />} />
        </Routes>
      </Suspense>
    </AdminSectionErrorBoundary>
  )
}

/**
 * Optional: warm *all* admin chunks proactively (e.g., from a hover/guard).
 * Usage:
 *   import AdminRouter from '@admin/AdminRouter.jsx'
 *   AdminRouter.preload?.()
 */
AdminRouter.preload = _preloadAll
