// src/student/components/TestEngineWrapper.jsx
// ======================================================================
// Student → TestEngine wrapper
// - Resolves testName from (props | :param | location.state | ?test | default)
// - Forwards optional passedUserEmail
// - Local error boundary + Suspense fallback
// ======================================================================

import React, { Suspense } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'

// Lazy-load the actual engine (kept outside components/ to avoid cycles)
const TestEngine = React.lazy(() => import('../TestEngine.jsx'))

/** Small boundary so a bad testName can fail softly */
class TestEngineBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) {
    return { err }
  }
  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
       
      console.error('[TestEngineWrapper] render error:', error, info)
    }
  }
  render() {
    const { err } = this.state
    if (err) {
      return (
        <div className="screen-wrapper" role="alert" aria-live="assertive" style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}>
          <h2>Test couldn’t load</h2>
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

/**
 * Priority for test name:
 *   1) props.testName
 *   2) route param :testName
 *   3) location.state.testName || location.state.test
 *   4) ?test=<name>
 *   5) "General Knowledge"
 */
export default function TestEngineWrapper({ testName: propName, passedUserEmail: propEmail }) {
  const { testName: paramName } = useParams()
  const [qs] = useSearchParams()
  const location = useLocation()

  const state = (location && location.state) || {}
  const testName =
    propName ||
    paramName ||
    state.testName ||
    state.test ||
    qs.get('test') ||
    'General Knowledge'

  const passedUserEmail = propEmail || state.userEmail || null

  return (
    <TestEngineBoundary>
      <Suspense
        fallback={
          <div className="screen-wrapper" role="status" aria-live="polite" style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}>
            <div className="spinner" />
            <p>Loading test…</p>
          </div>
        }
      >
        <TestEngine testName={testName} passedUserEmail={passedUserEmail} />
      </Suspense>
    </TestEngineBoundary>
  )
}