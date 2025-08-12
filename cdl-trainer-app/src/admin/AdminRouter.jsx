// src/admin/AdminRouter.jsx
// ======================================================================
// Admin Router (nested under /admin/*)
// - Lazy-loads admin pages
// - Local Suspense fallback (keeps app chrome responsive)
// - Lightweight error boundary for render-time safety
// - Optional export: preloadAdminRoutes() for hover-based warming
// ======================================================================

import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// If you prefer your global splash style, you can import and swap it below:
// import SplashScreen from '@components/SplashScreen.jsx'

// ---- Lazy pages ---------------------------------------------------------
const AdminDashboard = lazy(() => import('@admin/AdminDashboard.jsx'))
const AdminProfile   = lazy(() => import('@admin/AdminProfile.jsx'))
const AdminUsers     = lazy(() => import('@admin/AdminUsers.jsx'))
const AdminCompanies = lazy(() => import('@admin/AdminCompanies.jsx'))
const AdminReports   = lazy(() => import('@admin/AdminReports.jsx'))
// const AdminBilling = lazy(() => import('@admin/AdminBilling.jsx')) // add when ready

// ---- Local loading UI (accessible) -------------------------------------
function Loading({ text = 'Loading admin page…' }) {
  return (
    <div className="loading-container" role="status" aria-live="polite" style={{ textAlign: 'center', marginTop: '4rem' }}>
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
        <div className="error-overlay" role="alert" aria-live="assertive" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
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

// ---- (Optional) sub-route preloader for hover-based warming ------------
export async function preloadAdminRoutes() {
  await Promise.allSettled([
    import('@admin/AdminDashboard.jsx'),
    import('@admin/AdminProfile.jsx'),
    import('@admin/AdminUsers.jsx'),
    import('@admin/AdminCompanies.jsx'),
    import('@admin/AdminReports.jsx'),
    // import('@admin/AdminBilling.jsx'),
  ])
}

// ---- Router component ---------------------------------------------------
export default function AdminRouter() {
  return (
    <AdminSectionErrorBoundary>
      <Suspense
        fallback={
          <Loading text="Loading admin area…" />
          // Or use global splash:
          // <SplashScreen message="Loading admin area…" showTip={false} />
        }
      >
        <Routes>
          {/* Root (/admin) → dashboard */}
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />

          {/* Core */}
          <Route path="profile" element={<AdminProfile />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="reports" element={<AdminReports />} />
          {/* <Route path="billing" element={<AdminBilling />} /> */}

          {/* Fallback */}
          <Route path="*" element={<AdminNotFound />} />
        </Routes>
      </Suspense>
    </AdminSectionErrorBoundary>
  )
}