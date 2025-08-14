// src/student/StudentRouter.jsx
// ======================================================================
// Student Router (nested under /student/*)
// - Lazy-loads student-area pages and wrappers
// - Local Suspense fallback (keeps app-level fallback clean)
// - Lightweight error boundary for unexpected render errors
// - Preload helper updated to warm the new profile bundle
// ======================================================================

import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// If you prefer the global splash here, import and swap in the fallback below:
// import SplashScreen from '@components/SplashScreen.jsx'

// ---- Lazy pages (in /student) -----------------------------------------
const StudentDashboard = lazy(() => import('@student/StudentDashboard.jsx'))

// ✅ NEW path: profile entry moved under /student/profile/Profile.jsx
const Profile          = lazy(() => import('@student/profile/Profile.jsx'))

const Checklists       = lazy(() => import('@student/Checklists.jsx'))
const PracticeTests    = lazy(() => import('@student/PracticeTests.jsx'))
const Walkthrough      = lazy(() => import('@student/Walkthrough.jsx'))
const Flashcards       = lazy(() => import('@student/Flashcards.jsx'))

// ---- Lazy wrappers (in /student/components) ----------------------------
const TestEngineWrapper  = lazy(() => import('@student-components/TestEngineWrapper.jsx'))
const TestReviewWrapper  = lazy(() => import('@student-components/TestReviewWrapper.jsx'))
const TestResultsWrapper = lazy(() => import('@student-components/TestResultsWrapper.jsx'))

// ---- Local loading UI (accessible) -------------------------------------
function LoadingScreen({ text = 'Loading student page…' }) {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  )
}

// ---- Small, contained error boundary (render-time safety net) ----------
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
        <div className="error-overlay" role="alert" aria-live="assertive" style={{ padding: '3rem 1rem' }}>
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

// ---- Fallback route: normalize unknown paths back to /student/dashboard -
function StudentNotFound() {
  return <Navigate to="/student/dashboard" replace />
}

// ---- (Optional) sub-route preloader for hover-based warming ------------
export async function preloadStudentRoutes() {
  await Promise.allSettled([
    import('@student/StudentDashboard.jsx'),
    // ✅ Warm the new profile bundle entry:
    import('@student/profile/Profile.jsx'),
    import('@student/Checklists.jsx'),
    import('@student/PracticeTests.jsx'),
    import('@student/Walkthrough.jsx'),
    import('@student/Flashcards.jsx'),
    import('@student-components/TestEngineWrapper.jsx'),
    import('@student-components/TestReviewWrapper.jsx'),
    import('@student-components/TestResultsWrapper.jsx'),
  ])
}

// ---- Router component ---------------------------------------------------
export default function StudentRouter() {
  return (
    <StudentSectionErrorBoundary>
      <Suspense
        fallback={
          // Keep this local so app chrome stays responsive
          <LoadingScreen text="Loading student area…" />
          // Or use the global splash:
          // <SplashScreen message="Loading student area…" showTip={false} />
        }
      >
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