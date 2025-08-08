// src/instructor/index.jsx
// ===== INSTRUCTOR BARREL INDEX =====
// Central hub for instructor pages/components. No <Routes> logic here.

import React, { lazy } from "react";

/* =========================
   ROUTE CONSTANTS
   ========================= */
export const INSTRUCTOR_BASE                 = "/instructor";
export const INSTRUCTOR_ROUTE_DASH           = `${INSTRUCTOR_BASE}/dashboard`;
export const INSTRUCTOR_ROUTE_PROFILE        = `${INSTRUCTOR_BASE}/profile`;
export const INSTRUCTOR_ROUTE_CHECKLIST_REVIEW = `${INSTRUCTOR_BASE}/checklist-review`;
export const INSTRUCTOR_ROUTE_STUDENT_PROFILE  = `${INSTRUCTOR_BASE}/student-profile/:studentId`;
// (Add more later as files exist, e.g. `${INSTRUCTOR_BASE}/checklists`)

/* =========================
   LAZY-LOADED PAGES (for Router)
   ========================= */
export const LazyInstructorDashboard          = lazy(() => import("./InstructorDashboard"));
export const LazyInstructorProfile            = lazy(() => import("./InstructorProfile"));
export const LazyChecklistReviewForInstructor = lazy(() => import("./ChecklistReviewForInstructor"));
export const LazyStudentProfileForInstructor  = lazy(() => import("./StudentProfileForInstructor"));

/* =========================
   DIRECT (NON-LAZY) EXPORTS
   ========================= */
export { default as InstructorDashboard }          from "./InstructorDashboard";
export { default as InstructorProfile }            from "./InstructorProfile";
export { default as ChecklistReviewForInstructor } from "./ChecklistReviewForInstructor";
export { default as StudentProfileForInstructor }  from "./StudentProfileForInstructor";

/* =========================
   ROUTER EXPORT (so top-level routers can import cleanly)
   ========================= */
export { default as InstructorRouter } from "./InstructorRouter";

/* =========================
   ROUTE REGISTRY (optional DRY map)
   ========================= */
export const INSTRUCTOR_ROUTES = [
  { key: "dashboard",      path: INSTRUCTOR_ROUTE_DASH,            element: <LazyInstructorDashboard /> },
  { key: "profile",        path: INSTRUCTOR_ROUTE_PROFILE,         element: <LazyInstructorProfile /> },
  { key: "checklistReview",path: INSTRUCTOR_ROUTE_CHECKLIST_REVIEW,element: <LazyChecklistReviewForInstructor /> },
  { key: "studentProfile", path: INSTRUCTOR_ROUTE_STUDENT_PROFILE, element: <LazyStudentProfileForInstructor /> },
];

/* =========================
   HOOKS & HELPERS (optional)
   ========================= */
export * from "../hooks/useInstructorData";   // if present
export * from "../utils/instructor-helpers";  // if present

/* =========================
   CONTEXT (optional)
   ========================= */
// export { InstructorProvider } from "../context/InstructorContext";