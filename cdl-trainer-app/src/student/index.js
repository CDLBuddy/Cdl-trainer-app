// src/student/index.js
// ======================================================================
// STUDENT BARREL (pure)
// - Re-export student pages & role-scoped utilities
// - Keep this side-effect free (no JSX execution, CSS, or lazy() calls)
// - Avoid importing this barrel inside modules it re-exports to prevent cycles
// ======================================================================

// ---- Pages -------------------------------------------------------------
// Dashboard lives under src/student/dashboard; re-export named to avoid path coupling
export { DashboardPage, StudentDashboard } from './dashboard'

// Profile module exposes a default export via its own barrel
export { default as Profile } from './profile'

// Legacy top-level pages (default exports)
export { default as Checklists } from './Checklists.jsx'
export { default as Flashcards } from './Flashcards.jsx'
export { default as PracticeTests } from './PracticeTests.jsx'
export { default as TestEngine } from './TestEngine.jsx'
export { default as TestResults } from './TestResults.jsx'
export { default as TestReview } from './TestReview.jsx'
export { default as Walkthrough } from './walkthrough/Walkthrough.jsx'

// ---- Wrappers (route shells) ------------------------------------------
export { default as TestEngineWrapper } from './components/TestEngineWrapper.jsx'
export { default as TestResultsWrapper } from './components/TestResultsWrapper.jsx'
export { default as TestReviewWrapper } from './components/TestReviewWrapper.jsx'

// ---- Preloader (used by StudentRouter idle warm-up) --------------------
export { preloadStudentCore } from './preload.js'

// (Optional) expose more sub-barrels later, but keep this file side-effect free.
// export * from './components'
// export * from './profile'
