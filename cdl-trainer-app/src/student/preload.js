// src/student/preload.js
// ======================================================================
// Student route preloader
// - Warm up page and wrapper bundles before navigation
// - Safe to call on hover/focus from nav links
// - Does not export any React components
// ======================================================================

// ---- Pages -------------------------------------------------------------
const preloadStudentDashboard = () => import('@student/StudentDashboard.jsx')
const preloadProfile           = () => import('@student-profile/Profile.jsx')
const preloadChecklists        = () => import('@student/Checklists.jsx')
const preloadPracticeTests     = () => import('@student/PracticeTests.jsx')
const preloadWalkthrough       = () => import('@student-walkthrough/Walkthrough.jsx')
const preloadFlashcards        = () => import('@student/Flashcards.jsx')

// ---- Wrappers (via barrel loader fns) ----------------------------------
// Using loader fns means Vite won't actually pull the module until called
import {
  loadTestEngineWrapper,
  loadTestReviewWrapper,
  loadTestResultsWrapper,
} from '@student-components'

// ---- Public API --------------------------------------------------------
/**
 * Preload all student-related routes + test wrappers.
 * Call this before navigating (e.g., on hover) to reduce perceived latency.
 */
export async function preloadStudentRoutes() {
  await Promise.allSettled([
    preloadStudentDashboard(),
    preloadProfile(),
    preloadChecklists(),
    preloadPracticeTests(),
    preloadWalkthrough(),
    preloadFlashcards(),
    loadTestEngineWrapper(),
    loadTestReviewWrapper(),
    loadTestResultsWrapper(),
  ])
}

/**
 * Preload a minimal set of core routes (lighter, faster).
 * Useful if you only want the most-used pages warmed.
 */
export async function preloadStudentCore() {
  await Promise.allSettled([
    preloadStudentDashboard(),
    preloadProfile(),
    preloadChecklists(),
  ])
}