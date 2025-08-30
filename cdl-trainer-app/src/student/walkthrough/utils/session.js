// Path: src/student/walkthrough/utils/session.js
// @ts-check
// ======================================================================
// Session utils (no Firebase import here)
// - Robust fallbacks for reading/writing current user email + schoolId
// - SSR-safe (guards window/localStorage)
// - Normalizes email casing
// - Tiny event API so callers can react if you later emit updates
//   (doesn't require anything today; just future-proof)
// ======================================================================

/** Internal: safe window ref (SSR-safe) */
const _win =
  typeof window !== 'undefined' && window ? /** @type {Window & typeof globalThis & { currentUserEmail?: string, schoolId?: string }} */ (window) : undefined

/** Storage keys used elsewhere in the app */
const KEY_EMAIL = 'currentUserEmail'
const KEY_SCHOOL = 'schoolId'

/** Normalize an email (lowercase/trim). */
function normalizeEmail(e) {
  return e ? String(e).trim().toLowerCase() : ''
}

/** Safe localStorage get. */
function _getLS(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
  } catch {
    return null
  }
}

/** Safe localStorage set. */
function _setLS(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      if (val == null) localStorage.removeItem(key)
      else localStorage.setItem(key, String(val))
    }
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Get the current user's email from the most reliable known places.
 * Order:
 *   1) window.currentUserEmail (mirrored by SessionRoot)
 *   2) localStorage.currentUserEmail
 *   3) window.auth?.currentUser?.email (if your auth attaches here)
 * Returns `null` if not available.
 */
export function getCurrentUserEmail() {
  // window mirror (preferred)
  const fromWin = _win?.currentUserEmail || null
  if (fromWin) return normalizeEmail(fromWin) || null

  // local storage (legacy)
  const fromLS = _getLS(KEY_EMAIL)
  if (fromLS) return normalizeEmail(fromLS) || null

  // optional: some apps expose auth globally (we avoid importing Firebase here)
  const maybeAuthEmail =
    /** @type {any} */ (_win)?.auth?.currentUser?.email || null
  if (maybeAuthEmail) return normalizeEmail(maybeAuthEmail) || null

  return null
}

/**
 * Persist the current user email to window + localStorage.
 * Pass `null`/empty to clear.
 */
export function setCurrentUserEmail(email) {
  const e = normalizeEmail(email || '')
  if (_win) _win.currentUserEmail = e || undefined
  _setLS(KEY_EMAIL, e || null)
  // fire a tiny custom event for any live listeners (optional)
  try {
    _win?.dispatchEvent?.(
      new CustomEvent('session:email', { detail: e || null })
    )
  } catch {
    /* no-op */
  }
}

/** Get current schoolId from window/localStorage (lowercase trimmed). */
export function getCurrentSchoolId() {
  const fromWin = _win?.schoolId || null
  const fromLS = _getLS(KEY_SCHOOL)
  const val = (fromWin || fromLS || '').toString().trim()
  return val || ''
}

/** Persist schoolId to window + localStorage (pass empty to clear). */
export function setCurrentSchoolId(id) {
  const v = (id || '').toString().trim()
  if (_win) _win.schoolId = v || undefined
  _setLS(KEY_SCHOOL, v || null)
  try {
    _win?.dispatchEvent?.(new CustomEvent('session:schoolId', { detail: v || '' }))
  } catch {
    /* no-op */
  }
}

/**
 * Optional: subscribe to session email changes.
 * Returns an unsubscribe function. Safe to call even if window is undefined.
 */
export function onSessionEmailChange(cb) {
  if (!_win?.addEventListener) return () => {}
  const handler = (e) => {
    try {
      // @ts-ignore
      cb?.(e?.detail ?? getCurrentUserEmail())
    } catch {
      /* ignore */
    }
  }
  _win.addEventListener('session:email', handler)
  return () => {
    try {
      _win.removeEventListener('session:email', handler)
    } catch {
      /* ignore */
    }
  }
}

export default getCurrentUserEmail