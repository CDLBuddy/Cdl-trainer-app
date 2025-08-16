// src/superadmin/SuperadminRouter.jsx
// ======================================================================
// Superadmin Router (nested under /superadmin/*)
// ======================================================================

import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import {
  preloadSuperadminAll as _preloadAll,
  preloadSuperadminCore as _preloadCore,
} from './preload.js'

// ---- Lazy pages ---------------------------------------------------------
const SuperAdminDashboard = lazy(() => import('@superadmin/SuperAdminDashboard.jsx'))
const SchoolManagement    = lazy(() => import('@superadmin/SchoolManagement.jsx'))
const UserManagement      = lazy(() => import('@superadmin/UserManagement.jsx'))
const ComplianceCenter    = lazy(() => import('@superadmin/ComplianceCenter.jsx'))
const Billings            = lazy(() => import('@superadmin/Billings.jsx'))
const Settings            = lazy(() => import('@superadmin/Settings.jsx'))
const Logs                = lazy(() => import('@superadmin/Logs.jsx'))
const Permissions         = lazy(() => import('@superadmin/Permissions.jsx'))
const WalkthroughManager  = lazy(() => import('@superadmin/WalkthroughManager.jsx'))

// Walkthrough Review (from barrel: src/superadmin/walkthroughs/index.js)
const SAReviewQueue  = lazy(() =>
  import('@superadmin/walkthroughs').then(m => ({ default: m.SAReviewQueue }))
)
const SAReviewDetail = lazy(() =>
  import('@superadmin/walkthroughs').then(m => ({ default: m.SAReviewDetail }))
)

// ---- Local loading UI ---------------------------------------------------
function Loading({ text = 'Loading superadmin page…' }) {
  return (
    <div
      className="loading-container"
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{ textAlign: 'center', marginTop: '4rem' }}
    >
      <div className="spinner" />
      <p>{text}</p>
    </div>
  )
}

// ---- Contained error boundary ------------------------------------------
class SuperadminSectionErrorBoundary extends React.Component {
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
      console.error('[SuperadminRouter] render error:', error, info)
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
          <h2>Superadmin area failed to load</h2>
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

// ---- Fallback route -----------------------------------------------------
function SuperadminNotFound() {
  return <Navigate to="/superadmin/dashboard" replace />
}

// ---- Router component ---------------------------------------------------
export default function SuperadminRouter() {
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
    <SuperadminSectionErrorBoundary>
      <Suspense fallback={<Loading text="Loading superadmin area…" />}>
        <Routes>
          {/* Root (/superadmin) → dashboard */}
          <Route index element={<SuperAdminDashboard />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />

          {/* Core */}
          <Route path="schools" element={<SchoolManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="compliance" element={<ComplianceCenter />} />
          <Route path="billing" element={<Billings />} />
          <Route path="settings" element={<Settings />} />
          <Route path="logs" element={<Logs />} />
          <Route path="permissions" element={<Permissions />} />

          {/* Walkthrough authoring/branding */}
          <Route path="walkthroughs" element={<WalkthroughManager />} />

          {/* Walkthrough review (superadmin) */}
          <Route path="walkthroughs/review" element={<SAReviewQueue />} />
          {/* Include schoolId so Detail can fetch the doc path directly */}
          <Route path="walkthroughs/review/:schoolId/:submissionId" element={<SAReviewDetail />} />

          {/* Fallback */}
          <Route path="*" element={<SuperadminNotFound />} />
        </Routes>
      </Suspense>
    </SuperadminSectionErrorBoundary>
  )
}

/**
 * Optional: warm *all* superadmin chunks (hover/idle/route-guard).
 * Usage: import SuperadminRouter from '@superadmin/SuperadminRouter.jsx'
 *        SuperadminRouter.preload?.()
 */
SuperadminRouter.preload = _preloadAll