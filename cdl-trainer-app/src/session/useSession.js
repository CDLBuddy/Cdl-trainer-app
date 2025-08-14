// src/session/useSession.js
// Hooks + helpers (no components). Import where needed.
//
import { useContext, useRef, useDebugValue } from 'react'
import SessionContext, { DEFAULT_SESSION } from './SessionContext.js'

const __DEV__ = (import.meta?.env?.MODE !== 'production')

/**
 * useSession()
 * Returns the current session shape:
 *   { loading:boolean, isLoggedIn:boolean, role:string|null, user:object|null }
 * In dev, warns if used outside the provider (falls back to DEFAULT_SESSION).
 */
export function useSession() {
  const ctx = useContext(SessionContext)
  if (__DEV__ && (ctx === DEFAULT_SESSION || ctx == null)) {
    // eslint-disable-next-line no-console
    console.warn('[useSession] Used outside <SessionProvider>. Returning default (logged out).')
  }
  const value = ctx || DEFAULT_SESSION
  useDebugValue(value, s =>
    `Session{ loading:${!!s.loading}, isLoggedIn:${!!s.isLoggedIn}, role:${s.role ?? 'null'} }`
  )
  return value
}

/**
 * useSessionSelector(selector, isEqual?)
 * Select a slice of session state with memoized return to avoid
 * downstream re-renders when the selected value is referentially equal.
 *
 * @param {(session:any)=>any} selector
 * @param {(a:any,b:any)=>boolean} [isEqual=Object.is] Custom equality function
 * @example
 *   const email = useSessionSelector(s => s.user?.email)
 *   const user  = useSessionSelector(s => s.user, shallowEqual)
 */
export function useSessionSelector(selector, isEqual = Object.is) {
  const session = useSession()
  const prevRef = useRef()

  let selected
  try {
    selected = typeof selector === 'function' ? selector(session) : session
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[useSessionSelector] Selector threw:', e)
    }
    selected = undefined
  }

  // Keep previous reference if equal (prevents child updates / effect churn)
  if (isEqual(selected, prevRef.current)) return prevRef.current
  prevRef.current = selected
  return selected
}

/** A simple shallow equal you can pass into useSessionSelector when selecting objects */
export function shallowEqual(a, b) {
  if (Object.is(a, b)) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (let i = 0; i < aKeys.length; i++) {
    const k = aKeys[i]
    if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k])) return false
  }
  return true
}

/** Convenience helpers */
export function useUser()       { return useSessionSelector(s => s.user) }
export function useRole()       { return useSessionSelector(s => s.role) }
export function useIsLoggedIn() { return useSessionSelector(s => s.isLoggedIn) }
export function useIsLoading()  { return useSessionSelector(s => s.loading) }

/**
 * Role utilities (client-only checks)
 * - useHasRole('admin')
 * - useHasAnyRole(['admin','superadmin'])
 */
export function useHasRole(role) {
  const current = useRole()
  return current === role
}
export function useHasAnyRole(roles = []) {
  const current = useRole()
  if (!Array.isArray(roles) || roles.length === 0) return false
  return roles.includes(current)
}

/**
 * Fallback accessors (handy during early boot / outside React)
 */
export function getCurrentUserEmailFallback() {
  const last = (typeof window !== 'undefined' && window.__lastSession) || {}
  const ctx = safePeekContext()
  return (
    last?.user?.email ||
    ctx?.user?.email ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('currentUserEmail')) ||
    null
  )
}
export function getCurrentRoleFallback() {
  const last = (typeof window !== 'undefined' && window.__lastSession) || {}
  const ctx = safePeekContext()
  return (
    last?.role ||
    ctx?.role ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('userRole')) ||
    null
  )
}

/**
 * Optional: expose the latest session on window for debugging.
 * Call once where you compute session (e.g., in main.jsx after memo).
 */
export function syncSessionDebug(sessionValue) {
  if (__DEV__ && typeof window !== 'undefined') {
    window.__lastSession = sessionValue
  }
}

/**
 * peekSession()
 * Non-hook, safe peek at current context (SSR/test/utility code).
 * Returns DEFAULT_SESSION if unavailable.
 */
export function peekSession() {
  return safePeekContext()
}

/** Internal: best-effort peek for fallbacks (no crash if unavailable). */
function safePeekContext() {
  try {
    // React sets _currentValue on contexts in modern builds.
    return SessionContext?._currentValue || DEFAULT_SESSION
  } catch {
    return DEFAULT_SESSION
  }
}

// Optional default export for ergonomics
export default useSession