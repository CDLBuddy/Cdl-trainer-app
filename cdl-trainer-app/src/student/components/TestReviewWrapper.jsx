// src/student/components/TestReviewWrapper.jsx
import React, { Suspense } from 'react'
import {
  useLocation,
  useParams,
  useSearchParams,
  Navigate,
  Link,
} from 'react-router-dom'

// Make sure this path matches your file location
const TestReview = React.lazy(() => import('../TestReview.jsx'))

/** Small error boundary so a failed import/render doesn’t nuke the app */
class Boundary extends React.Component {
  constructor(p) {
    super(p)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[TestReviewWrapper] error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="screen-wrapper"
          style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}
          role="alert"
          aria-live="assertive"
        >
          <h2>Review couldn’t load</h2>
          <p style={{ color: '#b12' }}>
            {String(this.state.error?.message || 'Unknown error')}
          </p>
          <Link
            className="btn outline"
            to="/student/practice-tests"
            style={{ marginTop: 10 }}
          >
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
      <h2>Loading Review…</h2>
      <p>Please wait…</p>
    </div>
  )
}

/**
 * Wrapper notes:
 * - Your router defines: /student/test-review/:testName
 * - If a legacy link hits /student/test-review?test=xyz, normalize to the param form.
 */
export default function TestReviewWrapper(props) {
  const { testName: paramTestName } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const queryTest = searchParams.get('test')

  // Normalize legacy query-string links to the param route your app expects
  if (!paramTestName && queryTest) {
    return (
      <Navigate
        to={`/student/test-review/${encodeURIComponent(queryTest)}`}
        replace
        state={location.state}
      />
    )
  }

  return (
    <Boundary>
      <Suspense fallback={<Fallback />}>
        <TestReview {...props} />
      </Suspense>
    </Boundary>
  )
}
