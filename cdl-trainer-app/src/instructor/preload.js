// ======================================================================
// Instructor — route preloader (pure; no JSX)
// - Standard API for global preloader:
//     * preloadAboveTheFold()  → light, high-use screens
//     * preloadAll()           → everything in Instructor area
//     * preloadRoute(key)      → targeted warm by key
// - Also keeps your convenience helpers (idle/soon/hover)
// - Safe in SSR and dev (Fast Refresh friendly)
// ======================================================================

// Small one-shot guard so we don't import the same chunk repeatedly
const _onceKeys = new Set()
async function _once(key, loader) {
  if (_onceKeys.has(key)) return
  _onceKeys.add(key)
  try { await loader() } catch { /* non-fatal */ }
}

// Respect reduced-motion users (be polite with aggressive preloads)
function prefersReducedMotion() {
  try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches } catch { return false }
}
export const isReducedMotion = prefersReducedMotion

// ---- Lazy entries (use aliases to mirror eslint/vite config) -------------
const _entries = {
  dashboard: () => import('@instructor/InstructorDashboard.jsx'),
  profile:   () => import('@instructor/InstructorProfile.jsx'),
  review:    () => import('@instructor/ChecklistReviewForInstructor.jsx'),
  student:   () => import('@instructor/StudentProfileForInstructor.jsx'),
  // add new screens here as you create them, e.g.:
  // attendance: () => import('@instructor/Attendance.jsx'),
}

// ---- Public API: above-the-fold (light set) -------------------------------
export async function preloadAboveTheFold() {
  if (typeof window === 'undefined') return
  await Promise.allSettled([
    _once('instructor:dashboard', _entries.dashboard),
    _once('instructor:profile',   _entries.profile),
    _once('instructor:review',    _entries.review),
  ])
}

// ---- Public API: full warm (everything instructor) -----------------------
export async function preloadAll() {
  if (typeof window === 'undefined') return
  await Promise.allSettled(Object.entries(_entries).map(([key, loader]) =>
    _once(`instructor:${key}`, loader)
  ))
}

// ---- Public API: targeted warm by logical key ----------------------------
/**
 * @param { 'dashboard'|'profile'|'review'|'student' | string } name
 */
export async function preloadRoute(name) {
  if (typeof window === 'undefined') return
  const key = String(name)
  const loader = _entries[key]
  if (loader) await _once(`instructor:${key}`, loader)
}

// ---- Back-compat aliases (matches your previous exports) -----------------
export const preloadInstructorCore = preloadAboveTheFold
export default preloadAboveTheFold

// ======================================================================
// Convenience helpers (hover/idle/soon) — unchanged behavior
// ======================================================================

/** Schedule a gentle idle warm-up of the Instructor area. */
export function warmInstructorOnIdle(timeout = 2000) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}

  const run = () => { preloadAboveTheFold().catch(() => {}) }

  if ('requestIdleCallback' in window) {
    // @ts-ignore: not in standard lib
    const id = window.requestIdleCallback(run, { timeout })
    return () => window.cancelIdleCallback?.(id)
  }
  const t = setTimeout(run, 300)
  return () => clearTimeout(t)
}

/** Kick preloading soon (after a short delay). Useful post-login. */
export function warmInstructorSoon(delay = 300) {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  const t = setTimeout(() => { preloadAboveTheFold().catch(() => {}) }, delay)
  return () => clearTimeout(t)
}

/**
 * One-shot hover/focus preloader. Pass a DOM node or a selector string.
 * Returns a cleanup to remove listeners.
 *
 * Example:
 *   useEffect(() => preloadInstructorOnHover('#instructor-link'), [])
 */
export function preloadInstructorOnHover(elOrSelector) {
  if (typeof window === 'undefined') return () => {}

  const el = typeof elOrSelector === 'string'
    ? document.querySelector(elOrSelector)
    : elOrSelector

  if (!el || typeof el.addEventListener !== 'function') return () => {}

  const handler = () => {
    preloadAboveTheFold().catch(() => {})
    cleanup()
  }

  el.addEventListener('pointerenter', handler, { once: true })
  el.addEventListener('focus', handler, { once: true, capture: true })

  function cleanup() {
    try {
      el.removeEventListener('pointerenter', handler, { capture: false })
      el.removeEventListener('focus', handler, { capture: true })
    } catch { /* noop */ }
  }

  return cleanup
}