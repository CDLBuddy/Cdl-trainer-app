// src/student/components/TestReviewWrapper.jsx
// ======================================================================
// Student → TestReview wrapper
// - Resolves testName from (props | :param | location.state | ?test)
// - Normalizes legacy query-string links to route-param form
// - Local error boundary + Suspense fallback
// ======================================================================

import React, { Suspense } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'

// Lazy-load the actual review screen (lives one folder up)
const TestReview = React.lazy(() => import('../TestReview.jsx'))

/** Small boundary so a failed import/render doesn’t nuke the app */
class Boundary extends React.Component {
  constructor(p) {
    super(p)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) {
    return { err }
  }
  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[TestReviewWrapper] render error:', error, info)
    }
  }
  render() {
    const { err } = this.state
    if (err) {
      return (
        <div
          className="screen-wrapper"
          style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}
          role="alert"
          aria-live="assertive"
        >
          <h2>Review couldn’t load</h2>
          <p style={{ color: '#b12' }}>{String(err?.message || err || 'Unknown error')}</p>
          <Link className="btn outline" to="/student/practice-tests" style={{ marginTop: 10 }}>
            Back to Practice Tests
          </Link>
        </div>
      )
    }
    return this.props.children
  }
}

/** Fallback UI while the chunk loads */
function Fallback() {
  return (
    <div
      className="screen-wrapper"
      style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}
      role="status"
      aria-live="polite"
    >
      <div className="spinner" />
      <p>Loading review…</p>
    </div>
  )
}

/**
 * Priority for test name:
 *   1) props.testName
 *   2) route param :testName
 *   3) location.state.testName || location.state.test
 *   4) ?test=<name> (legacy; normalized to param)
 */
export default function TestReviewWrapper({ testName: propName, ...rest }) {
  const { testName: paramName } = useParams()
  const [qs] = useSearchParams()
  const location = useLocation()

  const state = (location && location.state) || {}
  const queryName = qs.get('test') || null

  // Normalize legacy query-string links to the param route your app expects
  if (!paramName && queryName) {
    return (
      <Navigate
        to={`/student/test-review/${encodeURIComponent(queryName)}`}
        replace
        state={state}
      />
    )
  }

  const testName =
    propName ||
    paramName ||
    state.testName ||
    state.test ||
    queryName ||
    'General Knowledge'

  return (
    <Boundary>
      <Suspense fallback={<Fallback />}>
        {/* Pass through the resolved testName explicitly (and any extra props) */}
        <TestReview testName={testName} {...rest} />
      </Suspense>
    </Boundary>
  )
}