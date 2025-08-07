// src/student/StudentRouter.jsx

import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RequireRole } from "../utils/RequireRole"; // Role-guard component

// === Lazy imports for all student pages/views via barrel index ===
const StudentDashboard      = lazy(() => import("./StudentDashboard"));
const Profile               = lazy(() => import("./Profile"));
const Checklists            = lazy(() => import("./Checklists"));
const PracticeTests         = lazy(() => import("./PracticeTests"));
const TestEngineWrapper     = lazy(() => import("./TestEngineWrapper"));
const TestReviewWrapper     = lazy(() => import("./TestReviewWrapper"));
const TestResults           = lazy(() => import("./TestResults"));
const Walkthrough           = lazy(() => import("./Walkthrough"));
const Flashcards            = lazy(() => import("./Flashcards"));

// --- Optional: Error boundary for all student routes ---
function StudentErrorFallback({ error }) {
  return (
    <div className="dashboard-card" style={{ maxWidth: 520, margin: "2em auto" }}>
      <h2>Something went wrong</h2>
      <p>{error?.message || "An unexpected error occurred."}</p>
      <button className="btn" onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}

// --- Main Student Router ---
export default function StudentRouter() {
  // All routes below are *only for student users* (role-guarded at this level)
  return (
    <RequireRole role="student">
      <Suspense
        fallback={
          <div style={{ textAlign: "center", marginTop: "4em" }}>
            <div className="spinner" />
            <p>Loading student page…</p>
          </div>
        }
      >
        {/* You can wrap with an error boundary here if you have a utility */}
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
          {/* 404 fallback for unknown subroutes */}
          <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
        </Routes>
      </Suspense>
    </RequireRole>
  );
}

/*
======== How it works ========
- All student pages are code-split (lazy loaded) for speed.
- Role protection ensures only students can access.
- Suspense fallback gives a nice loading UI for any route.
- Easily add new student pages here as your app grows.
- Customize error handling by adding an error boundary (React 18+).
*/