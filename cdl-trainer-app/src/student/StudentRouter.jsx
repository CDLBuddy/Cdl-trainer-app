// src/student/StudentRouter.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RequireRole } from "../utils/RequireRole";

// Lazy imports for student pages
const StudentDashboard  = lazy(() => import("./StudentDashboard"));
const Profile           = lazy(() => import("./Profile"));
const Checklists        = lazy(() => import("./Checklists"));
const PracticeTests     = lazy(() => import("./PracticeTests"));
const TestEngineWrapper = lazy(() => import("./TestEngineWrapper"));
const TestReviewWrapper = lazy(() => import("./TestReviewWrapper"));
const TestResults       = lazy(() => import("./TestResults"));
const Walkthrough       = lazy(() => import("./Walkthrough"));
const Flashcards        = lazy(() => import("./Flashcards"));

// Loading screen (reusable)
function LoadingScreen({ text = "Loading…" }) {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

// Error fallback for student routes
function StudentErrorFallback({ error }) {
  return (
    <div className="dashboard-card" style={{ maxWidth: 520, margin: "2em auto" }}>
      <h2>⚠ Something went wrong</h2>
      <p>{error?.message || "An unexpected error occurred."}</p>
      <button className="btn" onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  );
}

// Optional: simple Not Found page
function StudentNotFound() {
  return (
    <div className="dashboard-card" style={{ maxWidth: 520, margin: "2em auto" }}>
      <h2>Page Not Found</h2>
      <p>The page you’re looking for doesn’t exist.</p>
      <button className="btn" onClick={() => (window.location.href = "/student/dashboard")}>
        ⬅ Back to Dashboard
      </button>
    </div>
  );
}

export default function StudentRouter() {
  return (
    <RequireRole role="student">
      <Suspense fallback={<LoadingScreen text="Loading student page…" />}>
        <Routes>
          <Route path="/" element={<StudentDashboard />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="checklists" element={<Checklists />} />
          <Route path="practice-tests" element={<PracticeTests />} />
          <Route path="test-engine/:testName" element={<TestEngineWrapper />} />
          <Route path="test-review/:testName" element={<TestReviewWrapper />} />
          <Route path="test-results" element={<TestResults />} />
          <Route path="walkthrough" element={<Walkthrough />} />
          <Route path="flashcards" element={<Flashcards />} />
          {/* Fallback */}
          <Route path="*" element={<StudentNotFound />} />
        </Routes>
      </Suspense>
    </RequireRole>
  );
}