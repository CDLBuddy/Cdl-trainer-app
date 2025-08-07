// src/instructor/InstructorRouter.jsx

import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RequireRole } from "../utils/RequireRole";

// === Lazy-load all instructor pages for performance ===
const InstructorDashboard         = lazy(() => import("./InstructorDashboard"));
const InstructorProfile           = lazy(() => import("./InstructorProfile"));
const InstructorStudentProfile    = lazy(() => import("./InstructorStudentProfile"));
const InstructorChecklistReview   = lazy(() => import("./InstructorChecklistReview"));
const InstructorChecklists        = lazy(() => import("./InstructorChecklists"));
// Expand as your instructor section grows:
// const InstructorFlashcards    = lazy(() => import("./InstructorFlashcards"));
// const InstructorWalkthrough   = lazy(() => import("./InstructorWalkthrough"));

// --- Optional: Error boundary fallback ---
function InstructorErrorFallback({ error }) {
  return (
    <div className="dashboard-card" style={{ maxWidth: 520, margin: "2em auto" }}>
      <h2>Something went wrong</h2>
      <p>{error?.message || "An unexpected error occurred."}</p>
      <button className="btn" onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}

// --- Main Instructor Router ---
export default function InstructorRouter() {
  // All routes here are protected--only accessible to users with "instructor" role
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
          <Route path="student-profile/:studentId" element={<InstructorStudentProfile />} />
          <Route path="checklist-review" element={<InstructorChecklistReview />} />
          <Route path="checklists" element={<InstructorChecklists />} />
          {/* Expand as you add more instructor features */}
          {/* <Route path="flashcards" element={<InstructorFlashcards />} /> */}
          {/* <Route path="walkthrough" element={<InstructorWalkthrough />} /> */}
          {/* Fallback for unknown subroutes */}
          <Route path="*" element={<Navigate to="/instructor/dashboard" replace />} />
        </Routes>
      </Suspense>
    </RequireRole>
  );
}

/*
================= USAGE NOTES =================
- All instructor routes are lazy loaded for speed.
- <RequireRole> ensures only instructors can access (blocks students, admins, etc).
- Add/expand new features (pages/widgets) easily--just add a lazy import and Route.
- URL params (like :studentId) are available via useParams in the component.
- Customize error fallback or Suspense UI as you like.
===============================================
*/