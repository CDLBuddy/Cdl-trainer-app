// src/session/SessionContext.js
// ======================================================================
// Central session context + defaults (no components)
// - Strong JSDoc types for IDEs
// - Frozen DEFAULT_SESSION to avoid accidental mutation
// - Tiny helpers: SESSION_KEYS, isSessionLike()
// ======================================================================

import { createContext } from 'react'

/**
 * @typedef {'student'|'instructor'|'admin'|'superadmin'|null} Role
 *
 * @typedef {Object} Session
 * @property {boolean} loading
 * @property {boolean} isLoggedIn
 * @property {Role}    role
 * @property {any|null} user
 */

/** The canonical key order for session objects (handy for validation/logging). */
export const SESSION_KEYS = /** @type {const} */ ([
  'loading',
  'isLoggedIn',
  'role',
  'user',
])

/** Default session shape used when not provided by a parent. */
export const DEFAULT_SESSION = Object.freeze(
  /** @type {Session} */ ({
    loading: false,
    isLoggedIn: false,
    role: null,
    user: null,
  })
)

/**
 * React context holding the current session.
 * The provider is defined in src/session/SessionProvider.jsx
 */
export const SessionContext = createContext(DEFAULT_SESSION)

/**
 * Lightweight runtime check (non-throwing).
 * @param {unknown} v
 * @returns {v is Session}
 */
export function isSessionLike(v) {
  if (v == null || typeof v !== 'object') return false
  const obj = /** @type {any} */ (v)
  // only check presence + basic types; tolerate extra fields
  const ok =
    'loading' in obj &&
    'isLoggedIn' in obj &&
    'role' in obj &&
    'user' in obj &&
    (typeof obj.loading === 'boolean') &&
    (typeof obj.isLoggedIn === 'boolean')
  return !!ok
}

export default SessionContext