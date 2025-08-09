// src/student/StudentRouter.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Lazy imports for student pages
const StudentDashboard  = lazy(() => import("./StudentDashboard.jsx"));
const Profile           = lazy(() => import("./Profile.jsx"));
const Checklists        = lazy(() => import("./Checklists.jsx"));
const PracticeTests     = lazy(() => import("./PracticeTests.jsx"));
const TestEngineWrapper = lazy(() => import("./TestEngineWrapper.jsx"));
const TestReviewWrapper = lazy(() => import("./TestReviewWrapper.jsx"));
const TestResults       = lazy(() => import("./TestResults.jsx"));
const Walkthrough       = lazy(() => import("./Walkthrough.jsx"));
const Flashcards        = lazy(() => import("./Flashcards.jsx"));

// Loading screen (reusable)
function LoadingScreen({ text = "Loading…" }) {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

// 404 inside student namespace
function StudentNotFound() {
  return <Navigate to="/student/dashboard" replace />;
}

export default function StudentRouter() {
  return (
    <Suspense fallback={<LoadingScreen text="Loading student page…" />}>
      <Routes>
        {/* Index renders at /student */}
        <Route index element={<StudentDashboard />} />
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
  );
}