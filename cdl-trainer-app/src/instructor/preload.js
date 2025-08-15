// ======================================================================
// Instructor — preload utilities (pure; no JSX)
// - Preload core instructor screens on demand / hover / idle
// - Safe in SSR and in dev (Fast Refresh friendly)
// - Small helpers you can call from routers/nav
// ======================================================================

/** Respect users with reduced-motion preferences (skip aggressive preloads). */
function prefersReducedMotion() {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  } catch {
    return false
  }
}

/** List of lazy chunks to warm for the Instructor area. */
function getInstructorEntries() {
  return [
    () => import('./InstructorDashboard.jsx'),
    () => import('./InstructorProfile.jsx'),
    () => import('./StudentProfileForInstructor.jsx'),
    () => import('./ChecklistReviewForInstructor.jsx'),
    // (Optional future screens — leave commented until they exist)
    // () => import('./components/SomePopover.jsx'),
  ]
}

/**
 * Preload the core Instructor routes right away.
 * Returns a promise that always resolves (errors are swallowed).
 */
export async function preloadInstructorCore() {
  if (typeof window === 'undefined') return
  const entries = getInstructorEntries()
  await Promise.allSettled(entries.map((fn) => {
    try { return fn() } catch { return Promise.resolve() }
  }))
}
export default preloadInstructorCore

/**
 * Schedule a gentle idle warm-up of the Instructor area.
 * Returns a cleanup function to cancel the scheduled work.
 */
export function warmInstructorOnIdle(timeout = 2000) {
  if (typeof window === 'undefined') return () => {}
  if (prefersReducedMotion()) return () => {}

  const run = () => { preloadInstructorCore().catch(() => {}) }

  if ('requestIdleCallback' in window) {
    // @ts-ignore - not in TS lib by default
    const id = window.requestIdleCallback(run, { timeout })
    return () => window.cancelIdleCallback?.(id)
  }
  const t = setTimeout(run, 300)
  return () => clearTimeout(t)
}

/**
 * Kick preloading soon (after a small delay). Useful right after login
 * or when you land on a role-neutral screen.
 */
export function warmInstructorSoon(delay = 300) {
  if (typeof window === 'undefined') return () => {}
  if (prefersReducedMotion()) return () => {}
  const t = setTimeout(() => { preloadInstructorCore().catch(() => {}) }, delay)
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
    preloadInstructorCore().catch(() => {})
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

/** Handy export if you need to branch in UI code. */
export const isReducedMotion = prefersReducedMotion