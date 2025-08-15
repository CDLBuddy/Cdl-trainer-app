// src/admin/AdminRouter.jsx
// ======================================================================
// Admin Router (nested under /admin/*)
// - Lazy-loads admin pages
// - Local Suspense fallback (keeps app chrome responsive)
// - Lightweight error boundary for render-time safety
// - Preload hook: AdminRouter.preload() (delegates to ./preload.js)
// ======================================================================

import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { preloadAdminAll as _preload } from './preload.js' // single source for warming

// ---- Lazy pages ---------------------------------------------------------
const AdminDashboard = lazy(() => import('@admin/AdminDashboard.jsx'))
const AdminProfile   = lazy(() => import('@admin/AdminProfile.jsx'))
const AdminUsers     = lazy(() => import('@admin/AdminUsers.jsx'))
const AdminCompanies = lazy(() => import('@admin/AdminCompanies.jsx'))
const AdminReports   = lazy(() => import('@admin/AdminReports.jsx'))
// const AdminBilling = lazy(() => import('@admin/AdminBilling.jsx')) // when ready

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
  return (
    <AdminSectionErrorBoundary>
      <Suspense
        fallback={
          <Loading text="Loading admin area…" />
          // Or global splash:
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

          {/* Fallback */}
          <Route path="*" element={<AdminNotFound />} />
        </Routes>
      </Suspense>
    </AdminSectionErrorBoundary>
  )
}

/**
 * Optional: warm chunks (hover/idle/route-guard).
 * Usage: import AdminRouter from '@admin/AdminRouter.jsx'
 *        AdminRouter.preload?.()
 * Note: this keeps the file exporting only a component (no named exports),
 * so it plays nicely with react-refresh/only-export-components.
 * @type {() => Promise<void>}
 */
AdminRouter.preload = _preload