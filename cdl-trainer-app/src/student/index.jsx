// student/index.jsx (StudentRouter)
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import StudentDashboard from "../pages/StudentDashboard";
import Profile from "../pages/Profile";
import Checklists from "../pages/Checklists";
import PracticeTests from "../pages/PracticeTests";
import TestEngine from "../pages/TestEngine";
import TestReview from "../pages/TestReview";
import TestResults from "../pages/TestResults";
import Walkthrough from "../pages/Walkthrough";
import Flashcards from "../pages/Flashcards";

// --- Route param wrappers if needed (for dynamic test routes) ---
const StudentTestEngineWrapper = () => {
  // useParams is available via Route element render
  return <TestEngine />;
};
const StudentTestReviewWrapper = () => {
  return <TestReview />;
};

export default function StudentRouter() {
  return (
    <Routes>
      <Route path="/" element={<StudentDashboard />} />
      <Route path="dashboard" element={<StudentDashboard />} />
      <Route path="profile" element={<Profile />} />
      <Route path="checklists" element={<Checklists />} />
      <Route path="practice-tests" element={<PracticeTests />} />
      <Route path="test-engine/:testName" element={<StudentTestEngineWrapper />} />
      <Route path="test-review/:testName" element={<StudentTestReviewWrapper />} />
      <Route path="test-results" element={<TestResults />} />
      <Route path="walkthrough" element={<Walkthrough />} />
      <Route path="flashcards" element={<Flashcards />} />
      {/* 404 Fallback for unknown student sub-routes */}
      <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
    </Routes>
  );
}
