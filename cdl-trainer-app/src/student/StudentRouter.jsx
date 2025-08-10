// src/student/StudentRouter.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

/* Pages (in /student) */
const StudentDashboard = lazy(() => import("./StudentDashboard.jsx"));
const Profile          = lazy(() => import("./Profile.jsx"));
const Checklists       = lazy(() => import("./Checklists.jsx"));
const PracticeTests    = lazy(() => import("./PracticeTests.jsx"));
const Walkthrough      = lazy(() => import("./Walkthrough.jsx"));
const Flashcards       = lazy(() => import("./Flashcards.jsx"));

/* Wrappers (in /student/components) */
const TestEngineWrapper  = lazy(() => import("./components/TestEngineWrapper.jsx"));
const TestReviewWrapper  = lazy(() => import("./components/TestReviewWrapper.jsx"));
const TestResultsWrapper = lazy(() => import("./components/TestResultsWrapper.jsx"));

function LoadingScreen({ text = "Loading…" }) {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

function StudentNotFound() {
  return <Navigate to="/student/dashboard" replace />;
}

export default function StudentRouter() {
  return (
    <Suspense fallback={<LoadingScreen text="Loading student page…" />}>
      <Routes>
        {/* /student */}
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
  );
}