// ===== STUDENT BARREL (pure) =====
// Re-export student pages & role-scoped utilities.
// Keep this side-effect free (no JSX, no CSS, no lazy imports).

export { default as StudentDashboard } from './StudentDashboard.jsx'

// Profile (in ./profile/)
export { default as Profile } from './profile/Profile.jsx'

export { default as Checklists } from './Checklists.jsx'
export { default as PracticeTests } from './PracticeTests.jsx'
export { default as Walkthrough } from './walkthrough/Walkthrough.jsx'
export { default as Flashcards } from './Flashcards.jsx'

// Wrappers (in ./components)
export { default as TestEngineWrapper } from './components/TestEngineWrapper.jsx'
export { default as TestReviewWrapper } from './components/TestReviewWrapper.jsx'
export { default as TestResultsWrapper } from './components/TestResultsWrapper.jsx'

// Optional alias for legacy imports
export { default as TestResults } from './components/TestResultsWrapper.jsx'