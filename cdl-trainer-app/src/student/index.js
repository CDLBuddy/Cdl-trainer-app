// ======================================================================
// STUDENT BARREL (pure)
// - Re-export student pages & role-scoped utilities
// - Keep this side-effect free (no JSX execution, CSS, or lazy() calls)
// ======================================================================

// ---- Pages -------------------------------------------------------------
export { default as StudentDashboard } from './StudentDashboard.jsx'

// Profile module via its barrel (lets you expose sections/ui later)
export { Profile } from './profile'          // named re-export from profile barrel
// If you prefer the original style instead, keep this instead of the line above:
// export { default as Profile } from './profile/Profile.jsx'

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