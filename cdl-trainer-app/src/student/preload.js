// src/student/preload.js
// ======================================================================
// Student route preloader
// - Exposes a standard API the global preloader expects:
//     * preloadAboveTheFold()  → light, most-used screens
//     * preloadAll()           → everything a student may touch
//     * preloadRoute(name)     → targeted warm by route key
// - Keeps original names as aliases for compatibility
// - Pure module (no React imports, no side effects)
// ======================================================================

// ---------- Dynamic import fns (run only when called) ------------------
const loadDashboard = () => import('@student/StudentDashboard.jsx')
const loadProfile = () => import('@student-profile/Profile.jsx')
const loadChecklists = () => import('@student/Checklists.jsx')
const loadPracticeTests = () => import('@student/PracticeTests.jsx')
const loadWalkthrough = () => import('@student-walkthrough/Walkthrough.jsx')
const loadFlashcards = () => import('@student/Flashcards.jsx')

// Test flow wrappers
const loadTestEngineWrap = () =>
  import('@student-components/TestEngineWrapper.jsx')
const loadTestReviewWrap = () =>
  import('@student-components/TestReviewWrapper.jsx')
const loadTestResultsWrap = () =>
  import('@student-components/TestResultsWrapper.jsx')

// ---------- Route key → loader map ------------------------------------
const LOADERS = {
  dashboard: loadDashboard,
  profile: loadProfile,
  checklists: loadChecklists,
  practice: loadPracticeTests,
  walkthrough: loadWalkthrough,
  flashcards: loadFlashcards,

  'test:engine': loadTestEngineWrap,
  'test:review': loadTestReviewWrap,
  'test:results': loadTestResultsWrap,
}

// Small helper to swallow prefetch failures (best-effort)
const warm = fn => {
  try {
    const p = fn?.()
    // allow both promise and non-promise returns (for safety)
    if (p && typeof p.then === 'function') p.catch(() => {})
  } catch {
    /* ignore */
  }
}

// ---------- Above-the-fold (light set) ---------------------------------
export async function preloadAboveTheFold() {
  await Promise.allSettled([loadDashboard(), loadProfile(), loadChecklists()])
}

// ---------- Full warm (everything student) -----------------------------
export async function preloadAll() {
  // Call all known loaders; Promise.allSettled keeps it resilient
  await Promise.allSettled(Object.values(LOADERS).map(fn => fn()))
}

// ---------- Targeted route warmer --------------------------------------
/**
 * Preload a specific student route by key.
 * Supported keys:
 *  - 'dashboard' | 'profile' | 'checklists' | 'practice'
 *  - 'walkthrough' | 'flashcards'
 *  - 'test:engine' | 'test:review' | 'test:results'
 */
export async function preloadRoute(name) {
  const key = String(name)
  const fn = LOADERS[key]
  if (!fn) return
  try {
    await fn()
  } catch {
    // best-effort: ignore preload errors
  }
}

// ---------- Back-compat aliases ----------------------------------------
/** Old name: warm everything student-related */
export const preloadStudentRoutes = preloadAll
/** Old name: warm a minimal core subset */
export const preloadStudentCore = preloadAboveTheFold

// ---------- Optional: granular named exports (if you want them) --------
// export { loadDashboard as preloadStudentDashboard }
// export { loadProfile as preloadProfile }
// export { loadChecklists as preloadChecklists }
// export { loadPracticeTests as preloadPracticeTests }
// export { loadWalkthrough as preloadWalkthrough }
// export { loadFlashcards as preloadFlashcards }
// export {
//   loadTestEngineWrap as loadTestEngineWrapper,
//   loadTestReviewWrap as loadTestReviewWrapper,
//   loadTestResultsWrap as loadTestResultsWrapper,
// }
