// ======================================================================
// Student route preloader
// - Exposes the standard API the global preloader expects:
//     * preloadAboveTheFold()  → light, most-used screens
//     * preloadAll()           → everything student may touch
//     * preloadRoute(name)     → targeted warm by route key
// - Keeps your original names as aliases for compatibility
// - Pure module (no React imports, no side effects)
// ======================================================================

// ---- Pages (dynamic imports only run when called) ---------------------
const preloadStudentDashboard = () => import('@student/StudentDashboard.jsx')
const preloadProfile          = () => import('@student-profile/Profile.jsx')
const preloadChecklists       = () => import('@student/Checklists.jsx')
const preloadPracticeTests    = () => import('@student/PracticeTests.jsx')
const preloadWalkthrough      = () => import('@student-walkthrough/Walkthrough.jsx')
const preloadFlashcards       = () => import('@student/Flashcards.jsx')

// ---- Wrappers (via components barrel loader fns) ----------------------
// If these loader fns aren’t exported yet, you can safely swap to direct
// dynamic imports like: () => import('@student-components/TestEngineWrapper.jsx')
import {
  loadTestEngineWrapper,
  loadTestReviewWrapper,
  loadTestResultsWrapper,
} from '@student-components'

// ---- Above-the-fold (light set) --------------------------------------
export async function preloadAboveTheFold() {
  await Promise.allSettled([
    preloadStudentDashboard(),
    preloadProfile(),
    preloadChecklists(),
  ])
}

// ---- Full warm (everything student) -----------------------------------
export async function preloadAll() {
  await Promise.allSettled([
    // Core pages
    preloadStudentDashboard(),
    preloadProfile(),
    preloadChecklists(),
    preloadPracticeTests(),
    preloadWalkthrough(),
    preloadFlashcards(),
    // Test flow wrappers
    loadTestEngineWrapper(),
    loadTestReviewWrapper(),
    loadTestResultsWrapper(),
  ])
}

// ---- Targeted route warmers -------------------------------------------
/**
 * Preload a specific student route by key.
 * Keys are yours to choose; keep them consistent across app.
 *
 * Supported (suggested) keys:
 *  - 'dashboard' | 'profile' | 'checklists' | 'practice'
 *  - 'walkthrough' | 'flashcards'
 *  - 'test:engine' | 'test:review' | 'test:results'
 */
export async function preloadRoute(name) {
  switch (String(name)) {
    case 'dashboard':  return preloadStudentDashboard()
    case 'profile':    return preloadProfile()
    case 'checklists': return preloadChecklists()
    case 'practice':   return preloadPracticeTests()
    case 'walkthrough':return preloadWalkthrough()
    case 'flashcards': return preloadFlashcards()

    case 'test:engine':  return loadTestEngineWrapper()
    case 'test:review':  return loadTestReviewWrapper()
    case 'test:results': return loadTestResultsWrapper()

    default:
      // No-op for unknown keys; keep best-effort
      return
  }
}

// ---- Back-compat aliases (optional, keep if used elsewhere) -----------
/** Old name: warm everything student-related */
export const preloadStudentRoutes = preloadAll
/** Old name: warm a minimal core subset */
export const preloadStudentCore = preloadAboveTheFold