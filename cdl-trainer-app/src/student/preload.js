// src/student/preload.js
// ======================================================================
// Student route preloader (pure module; no React; no side effects)
// - Standard API the global preloader can call:
//     * preloadAboveTheFold()  → light, most-used screens
//     * preloadAll()           → everything a student may touch
//     * preloadRoute(name)     → targeted warm by route key
// - Extras: preloadLearning(), preloadTests()
// - Dedupes in-flight loads; resilient to errors
// - Back-compat aliases exported at bottom
// ======================================================================

// ---------- Dynamic import fns (lazy; evaluated when called) ------------
const loadDashboard     = () => import('@student/dashboard/StudentDashboard.jsx')
const loadProfile       = () => import('@student/profile/Profile.jsx')
const loadChecklists    = () => import('@student/Checklists.jsx')
const loadPracticeTests = () => import('@student/PracticeTests.jsx')
const loadWalkthrough   = () => import('@student/walkthrough/Walkthrough.jsx')
const loadFlashcards    = () => import('@student/Flashcards.jsx')

// Test flow wrappers (ensure these exist under src/student/components)
const loadTestEngineWrap  = () => import('@student-components/TestEngineWrapper.jsx')
const loadTestReviewWrap  = () => import('@student-components/TestReviewWrapper.jsx')
const loadTestResultsWrap = () => import('@student-components/TestResultsWrapper.jsx')

// ---------- Route key → loader map ------------------------------------
/** @type {Record<string, () => Promise<any>>} */
const LOADERS = Object.freeze({
  dashboard: loadDashboard,
  profile: loadProfile,
  checklists: loadChecklists,
  practice: loadPracticeTests,
  walkthrough: loadWalkthrough,
  flashcards: loadFlashcards,

  'test:engine': loadTestEngineWrap,
  'test:review': loadTestReviewWrap,
  'test:results': loadTestResultsWrap,
})

// ---------- Small utilities --------------------------------------------
const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  !!import.meta.env.DEV

/** @type {Map<string, Promise<any>>} */
const inflight = new Map()

function once(key, loader) {
  if (inflight.has(key)) return inflight.get(key)
  const p = loader().catch(err => {
    inflight.delete(key) // allow retries after failure
    if (IS_DEV) console.warn(`[preload] failed: ${key}`, err)
    throw err
  })
  inflight.set(key, p)
  return p
}

async function tryLoad(key, loader, timeoutMs = 0) {
  const p = once(key, loader)
  if (!timeoutMs) return p
  return Promise.race([
    p,
    new Promise((_, r) => setTimeout(() => r(new Error('preload-timeout')), timeoutMs)),
  ]).catch(() => undefined)
}

const conn = (typeof navigator !== 'undefined' && navigator.connection) || null
const SAVE_DATA = !!(conn && 'saveData' in conn && conn.saveData)

// ---------- Above-the-fold (light set) ---------------------------------
export async function preloadAboveTheFold() {
  await Promise.allSettled([
    tryLoad('dashboard',  LOADERS.dashboard),
    tryLoad('profile',    LOADERS.profile),
    tryLoad('checklists', LOADERS.checklists),
  ])
}

// ---------- Focused groups (nice ergonomics) ---------------------------
export async function preloadLearning() {
  await Promise.allSettled([
    tryLoad('practice',    LOADERS.practice),
    tryLoad('walkthrough', LOADERS.walkthrough),
    tryLoad('flashcards',  LOADERS.flashcards),
  ])
}

export async function preloadTests() {
  await Promise.allSettled([
    tryLoad('test:engine',  LOADERS['test:engine']),
    tryLoad('test:review',  LOADERS['test:review']),
    tryLoad('test:results', LOADERS['test:results']),
  ])
}

// ---------- Full warm (everything student) -----------------------------
export async function preloadAll() {
  if (SAVE_DATA) {
    if (IS_DEV) console.info('[preload] Data Saver on → skipping preloadAll()')
    return
  }
  await Promise.allSettled(
    Object.entries(LOADERS).map(([k, fn]) => tryLoad(k, fn))
  )
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
  const key = String(name || '').toLowerCase()
  const fn = LOADERS[key]
  if (!fn) {
    if (IS_DEV) console.warn('[preload] unknown route key:', name)
    return
  }
  await tryLoad(key, fn)
}

// ---------- Back-compat aliases ----------------------------------------
export const preloadStudentRoutes = preloadAll
export const preloadStudentCore = preloadAboveTheFold