// src/student/index.jsx
import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

// --- Import all student pages (adjust paths as needed) ---
import StudentDashboard from "../pages/StudentDashboard";
import Profile from "../pages/Profile";
import Checklists from "../pages/Checklists";
import PracticeTests from "../pages/PracticeTests";
import TestEngine from "../pages/TestEngine";
import TestReview from "../pages/TestReview";
import TestResults from "../pages/TestResults";
import Walkthrough from "../pages/Walkthrough";
import Flashcards from "../pages/Flashcards";

// --- (Optional) Student-specific layout wrapper ---
function StudentLayout() {
  // You could add sidebar, topbar, etc. here for students only
  return (
    <div className="student-layout">
      {/* Example: <StudentSidebar /> */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

// --- Route param wrappers for dynamic routes, if you need to use useParams, etc. ---
const TestEngineWrapper = () => <TestEngine />;
const TestReviewWrapper = () => <TestReview />;

// --- Main student router (used for /student/*) ---
export default function StudentRouter() {
  return (
    <Routes>
      {/* Optionally wrap all with a StudentLayout */}
      <Route element={<StudentLayout />}>
        {/* Main dashboard */}
        <Route index element={<StudentDashboard />} />
        <Route path="dashboard" element={<StudentDashboard />} />

        {/* Student sub-pages */}
        <Route path="profile" element={<Profile />} />
        <Route path="checklists" element={<Checklists />} />
        <Route path="practice-tests" element={<PracticeTests />} />
        <Route path="test-results" element={<TestResults />} />
        <Route path="walkthrough" element={<Walkthrough />} />
        <Route path="flashcards" element={<Flashcards />} />

        {/* Dynamic test engine/review pages */}
        <Route path="test-engine/:testName" element={<TestEngineWrapper />} />
        <Route path="test-review/:testName" element={<TestReviewWrapper />} />

        {/* Fallback: unknown subroute -> dashboard */}
        <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
      </Route>
    </Routes>
  );
}