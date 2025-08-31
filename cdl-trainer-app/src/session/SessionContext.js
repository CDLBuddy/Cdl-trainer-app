// src/session/SessionContext.js
// ======================================================================
// Central session context + defaults (no components)
// - Strong JSDoc types for IDEs
// - Frozen DEFAULT_SESSION to avoid accidental mutation
// - Tiny helpers: ROLES, SESSION_KEYS, isSessionLike(), normalizeSession()
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

/** Allowed role values (handy for validation/UI). */
export const ROLES = /** @type {const} */ ([
  'student',
  'instructor',
  'admin',
  'superadmin',
])

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
 * Normalize any partial/unknown value into a safe Session shape.
 * Useful outside the provider (tests, utilities).
 * @param {Partial<Session>|null|undefined} value
 * @returns {Session}
 */
export function normalizeSession(value) {
  const v = value || {}
  /** @type {any} */
  const roleRaw = v.role
  const role =
    roleRaw == null
      ? null
      : String(roleRaw).trim().toLowerCase() || null

  return {
    loading: !!v.loading,
    isLoggedIn: !!v.isLoggedIn,
    role:
      role === null || ROLES.includes(/** @type {any} */ (role))
        ? /** @type {Role} */ (role)
        : null,
    user: v.user ?? null,
  }
}

/**
 * React context holding the current session.
 * The provider is defined in src/session/SessionProvider.jsx
 */
export const SessionContext = createContext(DEFAULT_SESSION)
SessionContext.displayName = 'SessionContext'

/**
 * Lightweight runtime check (non-throwing).
 * Tolerates extra fields; verifies presence and basic types.
 * @param {unknown} v
 * @returns {v is Session}
 */
export function isSessionLike(v) {
  if (v == null || typeof v !== 'object') return false
  const obj = /** @type {any} */ (v)
  const hasKeys =
    SESSION_KEYS.every(k => Object.prototype.hasOwnProperty.call(obj, k)) &&
    typeof obj.loading === 'boolean' &&
    typeof obj.isLoggedIn === 'boolean'
  if (!hasKeys) return false

  // role may be null or one of allowed values
  const r =
    obj.role == null ? null : String(obj.role).trim().toLowerCase()
  if (r !== null && !ROLES.includes(r)) return false

  // user can be anything (object/null most common), so we don't enforce
  return true
}

export default SessionContext