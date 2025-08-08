// src/instructor/InstructorRouter.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RequireRole } from "../utils/RequireRole";

// === Lazy-load existing instructor pages ===
const InstructorDashboard           = lazy(() => import("./InstructorDashboard"));
const InstructorProfile             = lazy(() => import("./InstructorProfile"));
const StudentProfileForInstructor   = lazy(() => import("./StudentProfileForInstructor"));
const ChecklistReviewForInstructor  = lazy(() => import("./ChecklistReviewForInstructor"));
// NOTE: Only add this back when the file exists
// const InstructorChecklists       = lazy(() => import("./InstructorChecklists"));

export default function InstructorRouter() {
  return (
    <RequireRole role="instructor">
      <Suspense
        fallback={
          <div style={{ textAlign: "center", marginTop: "4em" }}>
            <div className="spinner" />
            <p>Loading instructor page…</p>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<InstructorDashboard />} />
          <Route path="dashboard" element={<InstructorDashboard />} />
          <Route path="profile" element={<InstructorProfile />} />
          <Route path="student-profile/:studentId" element={<StudentProfileForInstructor />} />
          <Route path="checklist-review" element={<ChecklistReviewForInstructor />} />
          {/* Uncomment when the page exists */}
          {/* <Route path="checklists" element={<InstructorChecklists />} /> */}
          <Route path="*" element={<Navigate to="/instructor/dashboard" replace />} />
        </Routes>
      </Suspense>
    </RequireRole>
  );
}