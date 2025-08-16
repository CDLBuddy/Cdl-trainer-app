// src/instructor/InstructorRouter.jsx
// ======================================================================
// Instructor Router (nested under /instructor/*)
// - Lazy-loads only the screens you actually have
// - Local Suspense fallback to keep app chrome responsive
// - Lightweight error boundary for render safety
// - Idle, post-mount warm-up of common screens (optional)
// - Note: Preload helpers live in ./preload.js (not exported here)
//   to satisfy react-refresh/only-export-components
// ======================================================================

import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Optional: warm chunks after mount (idle) for perceived snappiness
import { preloadInstructorCore } from './preload.js'

// ---- Lazy pages you actually use ---------------------------------------
const InstructorDashboard          = lazy(() => import('@instructor/InstructorDashboard.jsx'))
const InstructorProfile            = lazy(() => import('@instructor/InstructorProfile.jsx'))
const StudentProfileForInstructor  = lazy(() => import('@instructor/StudentProfileForInstructor.jsx'))
const ChecklistReviewForInstructor = lazy(() => import('@instructor/ChecklistReviewForInstructor.jsx'))

// ---- Local loading UI (accessible) -------------------------------------
function Loading({ text = 'Loading instructor page…' }) {
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
class InstructorSectionErrorBoundary extends React.Component {
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
      console.error('[InstructorRouter] render error:', error, info)
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
          <h2>Instructor area failed to load</h2>
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
function InstructorNotFound() {
  return <Navigate to="/instructor/dashboard" replace />
}

// ---- Router component ---------------------------------------------------
export default function InstructorRouter() {
  // Optional: lightly warm common screens once the route mounts.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const prefersReduced =
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const run = () => {
      if (!prefersReduced) {
        preloadInstructorCore().catch(() => {})
      }
    }

    if ('requestIdleCallback' in window) {
      // @ts-expect-error: not in default lib for JS
      const id = window.requestIdleCallback(run, { timeout: 2000 })
      return () => window.cancelIdleCallback?.(id)
    }
    const t = setTimeout(run, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <InstructorSectionErrorBoundary>
      <Suspense fallback={<Loading text="Loading instructor area…" />}>
        <Routes>
          {/* Root (/instructor) → dashboard */}
          <Route index element={<InstructorDashboard />} />
          <Route path="dashboard" element={<InstructorDashboard />} />

          {/* Core */}
          <Route path="profile" element={<InstructorProfile />} />
          <Route path="student-profile/:studentId" element={<StudentProfileForInstructor />} />
          <Route path="checklist-review" element={<ChecklistReviewForInstructor />} />

          {/* Fallback */}
          <Route path="*" element={<InstructorNotFound />} />
        </Routes>
      </Suspense>
    </InstructorSectionErrorBoundary>
  )
}