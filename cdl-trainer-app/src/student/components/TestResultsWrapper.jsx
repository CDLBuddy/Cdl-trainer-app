// src/student/components/TestResultsWrapper.jsx
// ======================================================================
// Student → TestResults wrapper
// - Local error boundary so a bad render/import doesn’t crash the app
// - Suspense fallback while the results chunk is fetched
// ======================================================================

import React, { Suspense } from 'react'
import { Link } from 'react-router-dom'

// Lazy-load the actual results screen (lives one folder up)
const TestResults = React.lazy(() => import('../TestResults.jsx'))

/** Small boundary to keep failures contained to this section */
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
      console.error('[TestResultsWrapper] render error:', error, info)
    }
  }
  render() {
    if (this.state.err) {
      return (
        <div
          className="screen-wrapper"
          style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}
          role="alert"
          aria-live="assertive"
        >
          <h2>Results couldn’t load</h2>
          <p style={{ color: '#b12' }}>
            {String(this.state.err?.message || this.state.err || 'Unknown error')}
          </p>
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
      <p>Loading results…</p>
    </div>
  )
}

export default function TestResultsWrapper(props) {
  return (
    <Boundary>
      <Suspense fallback={<Fallback />}>
        <TestResults {...props} />
      </Suspense>
    </Boundary>
  )
}