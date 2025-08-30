// Path: src/student/index.js
// ======================================================================
// STUDENT BARREL (pure)
// - Re-export student pages & role-scoped utilities
// - Side-effect free (no JSX execution, CSS, or lazy() calls)
// - Use explicit file paths to avoid resolver ambiguity
// ======================================================================

// ---- Pages -------------------------------------------------------------
// Dashboard lives under src/student/dashboard; export named to avoid path coupling
export { DashboardPage, StudentDashboard } from './dashboard/index.js'

// Profile: explicitly reference the file with a default export
export { default as Profile } from './profile/Profile.jsx'

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

// Keep this file side-effect free.
// export * from './components'
// export * from './profile'