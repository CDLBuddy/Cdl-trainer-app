// src/student/StudentRouter.jsx
// ======================================================================
// Student Router (nested under /student/*)
// - Lazy-loads student pages and wrappers (explicit loaders for warmups)
// - Local Suspense fallback (keeps app chrome responsive)
// - Compact render-time error boundary
// - Idle, post-mount warm-up of common screens (respect Save-Data/2G)
// - Scroll-to-top on route changes
// ======================================================================

import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

import { preloadStudentCore } from '@student/preload.js'

/* ---------- Lazy loaders (explicit so we can warm them) ---------- */
// NOTE: dashboard lives under src/student/dashboard/
const loadDashboard       = () => import('@student/dashboard/StudentDashboard.jsx')
const loadProfile         = () => import('@student-profile/Profile.jsx')
const loadChecklists      = () => import('@student/Checklists.jsx')
const loadPracticeTests   = () => import('@student/PracticeTests.jsx')
const loadWalkthrough     = () => import('@student-walkthrough/Walkthrough.jsx')
const loadFlashcards      = () => import('@student/Flashcards.jsx')

const loadTestEngineWrap  = () => import('@student-components/TestEngineWrapper.jsx')
const loadTestReviewWrap  = () => import('@student-components/TestReviewWrapper.jsx')
const loadTestResultsWrap = () => import('@student-components/TestResultsWrapper.jsx')

/* ---------- Lazy components ---------- */
const StudentDashboard  = lazy(loadDashboard)
const Profile           = lazy(loadProfile)
const Checklists        = lazy(loadChecklists)
const PracticeTests     = lazy(loadPracticeTests)
const Walkthrough       = lazy(loadWalkthrough)
const Flashcards        = lazy(loadFlashcards)

const TestEngineWrapper  = lazy(loadTestEngineWrap)
const TestReviewWrapper  = lazy(loadTestReviewWrap)
const TestResultsWrapper = lazy(loadTestResultsWrap)

/* ---------- Local loading UI ---------- */
function LoadingScreen({ text = 'Loading student page…' }) {
  return (
    <div
      className="loading-container"
      role="status"
      aria-live="polite"
      style={{ textAlign: 'center', marginTop: '4rem' }}
    >
      <div className="spinner" aria-hidden="true" />
      <p>{text}</p>
    </div>
  )
}

/* ---------- Scroll to top on path change ---------- */
function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation()
  useEffect(() => {
    // best-effort scroll reset without jank
    try {
      window.history.scrollRestoration = 'manual'
    } catch {}
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    } catch {
      window.scrollTo(0, 0)
    }
  }, [pathname])
  return null
}

/* ---------- Compact error boundary ---------- */
class StudentSectionError extends React.Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) { return { err } }
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
          style={{ padding: '3rem 1rem', textAlign: 'center' }}
        >
          <h2 style={{ marginBottom: 8 }}>Student area failed to load</h2>
          <p style={{ color: '#b22', margin: 0 }}>{String(this.state.err)}</p>
          <button
            className="btn"
            onClick={() => window.location.reload()}
            style={{ marginTop: 16 }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

/* ---------- Fallback route ---------- */
function StudentNotFound() {
  return <Navigate to="/student/dashboard" replace />
}

/* ---------- Router ---------- */
export default function StudentRouter() {
  // Warm common screens once this subtree mounts (respect Save-Data / slow networks)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const prefersReduced =
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection
    const saveData = !!conn?.saveData
    const isSlow = ['slow-2g', '2g'].includes(conn?.effectiveType || '')

    const warm = () => {
      if (prefersReduced || saveData || isSlow) return

      // Core bundle preloads (your existing helper)
      preloadStudentCore()?.catch(() => {})

      // Stagger preloads to avoid a single big burst
      const preloads = [
        loadProfile,
        loadChecklists,
        loadPracticeTests,
        loadWalkthrough,
        loadFlashcards,
        loadTestEngineWrap,
        loadTestReviewWrap,
        loadTestResultsWrap,
      ]

      preloads.forEach((fn, i) => {
        setTimeout(() => { fn().catch(() => {}) }, 150 * (i + 1))
      })
    }

    if ('requestIdleCallback' in window) {
      // @ts-expect-error: not in default TS lib
      const id = window.requestIdleCallback(warm, { timeout: 2000 })
      return () => window.cancelIdleCallback?.(id)
    }
    const t = setTimeout(warm, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <StudentSectionError>
      <ScrollToTopOnRouteChange />
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
    </StudentSectionError>
  )
}