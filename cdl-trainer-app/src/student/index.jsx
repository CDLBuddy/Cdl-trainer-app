// src/student/index.jsx
// ===== STUDENT BARREL INDEX =====
// Central export hub for all student pages, components, hooks, and utilities
// Matches actual files in /student directory

import React, { lazy } from "react";

/* =========================
   ROUTE CONSTANTS
   ========================= */
export const STUDENT_BASE             = "/student";
export const STUDENT_ROUTE_DASH       = `${STUDENT_BASE}/dashboard`;
export const STUDENT_ROUTE_PROFILE    = `${STUDENT_BASE}/profile`;
export const STUDENT_ROUTE_CHECKLISTS = `${STUDENT_BASE}/checklists`;
export const STUDENT_ROUTE_TESTS      = `${STUDENT_BASE}/practice-tests`;
export const STUDENT_ROUTE_ENGINE     = `${STUDENT_BASE}/test-engine/:testName`;
export const STUDENT_ROUTE_REVIEW     = `${STUDENT_BASE}/test-review/:testName`;
export const STUDENT_ROUTE_RESULTS    = `${STUDENT_BASE}/test-results`;
export const STUDENT_ROUTE_WALKTHROUGH= `${STUDENT_BASE}/walkthrough`;
export const STUDENT_ROUTE_FLASHCARDS = `${STUDENT_BASE}/flashcards`;
export const STUDENT_ROUTE_AICOACH    = `${STUDENT_BASE}/ai-coach`;

/* =========================
   LAZY-LOADED PAGES (for Router)
   ========================= */
export const LazyStudentDashboard = lazy(() => import("./StudentDashboard"));
export const LazyProfile          = lazy(() => import("./Profile"));
export const LazyChecklists       = lazy(() => import("./Checklists"));
export const LazyPracticeTests    = lazy(() => import("./PracticeTests"));
export const LazyTestEngine       = lazy(() => import("./TestEngine"));
export const LazyTestReview       = lazy(() => import("./TestReview"));
export const LazyTestResults      = lazy(() => import("./TestResults"));
export const LazyWalkthrough      = lazy(() => import("./Walkthrough"));
export const LazyFlashcards       = lazy(() => import("./Flashcards"));
export const LazyAICoach          = lazy(() => import("./AICoach"));

/* =========================
   DIRECT (NON-LAZY) EXPORTS
   ========================= */
export { default as StudentDashboard } from "./StudentDashboard";
export { default as Profile }          from "./Profile";
export { default as Checklists }       from "./Checklists";
export { default as PracticeTests }    from "./PracticeTests";
export { default as TestEngine }       from "./TestEngine";
export { default as TestReview }       from "./TestReview";
export { default as TestResults }      from "./TestResults";
export { default as Walkthrough }      from "./Walkthrough";
export { default as Flashcards }       from "./Flashcards";
export { default as AICoach }          from "./AICoach";

/* =========================
   ROUTE REGISTRY (optional)
   ========================= */
export const STUDENT_ROUTES = [
  { key: "dashboard",  path: STUDENT_ROUTE_DASH,        element: <LazyStudentDashboard /> },
  { key: "profile",    path: STUDENT_ROUTE_PROFILE,     element: <LazyProfile /> },
  { key: "checklists", path: STUDENT_ROUTE_CHECKLISTS,  element: <LazyChecklists /> },
  { key: "tests",      path: STUDENT_ROUTE_TESTS,       element: <LazyPracticeTests /> },
  { key: "engine",     path: STUDENT_ROUTE_ENGINE,      element: <LazyTestEngine /> },
  { key: "review",     path: STUDENT_ROUTE_REVIEW,      element: <LazyTestReview /> },
  { key: "results",    path: STUDENT_ROUTE_RESULTS,     element: <LazyTestResults /> },
  { key: "walkthrough",path: STUDENT_ROUTE_WALKTHROUGH, element: <LazyWalkthrough /> },
  { key: "flashcards", path: STUDENT_ROUTE_FLASHCARDS,  element: <LazyFlashcards /> },
  { key: "aiCoach",    path: STUDENT_ROUTE_AICOACH,     element: <LazyAICoach /> },
];

/* =========================
   HOOKS & HELPERS
   ========================= */
export * from "../hooks/useStudentData";
export * from "../utils/student-helpers";

/* =========================
   CONTEXT PROVIDERS (optional)
   ========================= */
// export { StudentProvider } from "../context/StudentContext";