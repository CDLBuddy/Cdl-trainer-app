// ======================================================================
// STUDENT BARREL (pure)
// - Re-export student pages & role-scoped utilities
// - Keep this side-effect free (no JSX execution, CSS, or lazy() calls)
// ======================================================================

// ---- Pages -------------------------------------------------------------
export { DashboardPage as StudentDashboard } from './dashboard'
export { Profile } from './profile'
export { default as Checklists }    from './Checklists.jsx'
export { default as PracticeTests } from './PracticeTests.jsx'
export { default as Walkthrough }   from './walkthrough/Walkthrough.jsx'
export { default as Flashcards }    from './Flashcards.jsx'
export { default as TestEngine }    from './TestEngine.jsx'
export { default as TestReview }    from './TestReview.jsx'
export { default as TestResults }   from './TestResults.jsx'

// ---- Wrappers (route shells) ------------------------------------------
export { default as TestEngineWrapper }  from './components/TestEngineWrapper.jsx'
export { default as TestReviewWrapper }  from './components/TestReviewWrapper.jsx'
export { default as TestResultsWrapper } from './components/TestResultsWrapper.jsx'

// ---- Preloader (used by StudentRouter idle warm-up) --------------------
export { preloadStudentCore } from './preload.js'

// Optional: surface more from sub-barrels (keep side-effect free)
// export * from './components'
// export * from './profile'