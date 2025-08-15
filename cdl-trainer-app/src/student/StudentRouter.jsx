// ======================================================================
// Student Router (nested under /student/*)
// - Lazy-loads student pages and wrappers
// - Local Suspense fallback (keeps app chrome responsive)
// - Compact render-time error boundary
// - Idle, post-mount warm-up of common screens (optional)
// ======================================================================

import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { preloadStudentCore } from '@student/preload.js'

// ---- Lazy pages --------------------------------------------------------
const StudentDashboard = lazy(() => import('@student/StudentDashboard.jsx'))
const Profile          = lazy(() => import('@student-profile/Profile.jsx'))
const Checklists       = lazy(() => import('@student/Checklists.jsx'))
const PracticeTests    = lazy(() => import('@student/PracticeTests.jsx'))
const Walkthrough      = lazy(() => import('@student-walkthrough/Walkthrough.jsx'))
const Flashcards       = lazy(() => import('@student/Flashcards.jsx'))

// ---- Lazy wrappers -----------------------------------------------------
const TestEngineWrapper  = lazy(() => import('@student-components/TestEngineWrapper.jsx'))
const TestReviewWrapper  = lazy(() => import('@student-components/TestReviewWrapper.jsx'))
const TestResultsWrapper = lazy(() => import('@student-components/TestResultsWrapper.jsx'))

// ---- Local loading UI --------------------------------------------------
function LoadingScreen({ text = 'Loading student page…' }) {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  )
}

// ---- Small error boundary ----------------------------------------------
class StudentSectionErrorBoundary extends React.Component {
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
      console.error('[StudentRouter] render error:', error, info)
    }
  }
  render() {
    if (this.state.err) {
      return (
        <div
          className="error-overlay"
          role="alert"
          aria-live="assertive"
          style={{ padding: '3rem 1rem' }}
        >
          <h2>Student area failed to load</h2>
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

// ---- Fallback route ----------------------------------------------------
function StudentNotFound() {
  return <Navigate to="/student/dashboard" replace />
}

// ---- Router component (only export in this file) -----------------------
export default function StudentRouter() {
  // Optional: lightly warm common screens once the route mounts.
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const run = () => {
      if (!prefersReduced) {
        preloadStudentCore().catch(() => {})
      }
    }

    if ('requestIdleCallback' in window) {
      // @ts-expect-error: not in standard lib for JS
      const id = window.requestIdleCallback(run, { timeout: 2000 })
      return () => window.cancelIdleCallback?.(id)
    }
    const t = setTimeout(run, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <StudentSectionErrorBoundary>
      <Suspense fallback={<LoadingScreen text="Loading student area…" />}>
        <Routes>
          {/* Root (/student) → dashboard */}
          <Route index element={<StudentDashboard />} />
          <Route path="dashboard" element={<StudentDashboard />} />

          {/* Core */}
          <Route path="profile" element={<Profile />} />
          <Route path="checklists" element={<Checklists />} />
          <Route path="practice-tests" element={<PracticeTests />} />

          {/* Practice flow */}
          <Route path="test-engine/:testName" element={<TestEngineWrapper />} />
          <Route path="test-review/:testName" element={<TestReviewWrapper />} />
          <Route path="test-results" element={<TestResultsWrapper />} />

          {/* Extras */}
          <Route path="walkthrough" element={<Walkthrough />} />
          <Route path="flashcards" element={<Flashcards />} />

          {/* Fallback */}
          <Route path="*" element={<StudentNotFound />} />
        </Routes>
      </Suspense>
    </StudentSectionErrorBoundary>
  )
}