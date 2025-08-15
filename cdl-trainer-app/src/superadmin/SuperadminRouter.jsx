// src/superadmin/SuperadminRouter.jsx
// ======================================================================
// Superadmin Router (nested under /superadmin/*)
// - Lazy-loads superadmin pages
// - Local Suspense fallback (keeps app chrome responsive)
// - Lightweight error boundary for render-time safety
// - Optional: call SuperadminRouter.preload() for hover/idle warming
// ======================================================================

import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

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

          {/* Fallback */}
          <Route path="*" element={<SuperadminNotFound />} />
        </Routes>
      </Suspense>
    </SuperadminSectionErrorBoundary>
  )
}

/* -----------------------------------------------------------------------
   Optional chunk preloader (attached to component to avoid react-refresh
   complaints about multiple exports in a component file).
   Usage: SuperadminRouter.preload?.()
------------------------------------------------------------------------ */
async function _preloadSuperadminRoutes() {
  await Promise.allSettled([
    import('@superadmin/SuperAdminDashboard.jsx'),
    import('@superadmin/SchoolManagement.jsx'),
    import('@superadmin/UserManagement.jsx'),
    import('@superadmin/ComplianceCenter.jsx'),
    import('@superadmin/Billings.jsx'),
    import('@superadmin/Settings.jsx'),
    import('@superadmin/Logs.jsx'),
    import('@superadmin/Permissions.jsx'),
    import('@superadmin/WalkthroughManager.jsx'),
  ])
}

SuperadminRouter.preload = _preloadSuperadminRoutes