// src/student/components/TestEngineWrapper.jsx
import React, { Suspense } from "react";
import { useLocation, useParams, useSearchParams, Link } from "react-router-dom";

// Lazy-load the actual engine that lives one folder up
const TestEngine = React.lazy(() => import("../TestEngine.jsx"));

/** Tiny error boundary so a bad testName doesn’t crash the whole app */
class TestEngineBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(err, info) {
    // eslint-disable-next-line no-console
    console.error("TestEngine error:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="screen-wrapper" style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
          <h2>Test couldn’t load</h2>
          <p style={{ color: "#b12" }}>
            {String(this.state.error?.message || "Unknown error")}
          </p>
          <Link className="btn outline" to="/student/practice-tests" style={{ marginTop: 10 }}>
            Back to Practice Tests
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Wrapper
 * Priority for test name:
 *   1) props.testName
 *   2) route param :testName
 *   3) location.state.testName or .test
 *   4) ?test= query
 *   5) "General Knowledge"
 * Also forwards optional passedUserEmail from props or route state.
 */
export default function TestEngineWrapper(props) {
  const { testName: paramTestName } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();

  const stateTestName =
    (location.state && (location.state.testName || location.state.test)) || null;

  const testName =
    props.testName ||
    paramTestName ||
    stateTestName ||
    params.get("test") ||
    "General Knowledge";

  const passedUserEmail =
    props.passedUserEmail ||
    (location.state && location.state.userEmail) ||
    null;

  return (
    <TestEngineBoundary>
      <Suspense
        fallback={
          <div className="screen-wrapper" style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
            <h2>Loading Test…</h2>
            <p>Please wait while we prepare your quiz.</p>
          </div>
        }
      >
        <TestEngine testName={testName} passedUserEmail={passedUserEmail} />
      </Suspense>
    </TestEngineBoundary>
  );
}