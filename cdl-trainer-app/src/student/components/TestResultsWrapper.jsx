// src/student/components/TestResultsWrapper.jsx
import React, { Suspense } from "react";
import { Link } from "react-router-dom";

const TestResults = React.lazy(() => import("../TestResults.jsx"));

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("[TestResultsWrapper] render error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="screen-wrapper" style={{ padding: 20, maxWidth: 720, margin: "0 auto" }} role="alert" aria-live="assertive">
          <h2>Results couldn’t load</h2>
          <p style={{ color: "#b12" }}>{String(this.state.error?.message || "Unknown error")}</p>
          <Link className="btn outline" to="/student/practice-tests" style={{ marginTop: 10 }}>
            Back to Practice Tests
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}

function Fallback() {
  return (
    <div className="screen-wrapper" style={{ padding: 20, maxWidth: 720, margin: "0 auto" }} role="status" aria-live="polite">
      <h2>Loading Results…</h2>
      <p>Please wait…</p>
    </div>
  );
}

export default function TestResultsWrapper(props) {
  return (
    <Boundary>
      <Suspense fallback={<Fallback />}>
        <TestResults {...props} />
      </Suspense>
    </Boundary>
  );
}