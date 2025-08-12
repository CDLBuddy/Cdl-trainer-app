// src/session/useSession.js
// Hooks + helpers (no components). Import these where needed.

import { useContext, useRef, useDebugValue } from 'react'
import SessionContext, { DEFAULT_SESSION } from './SessionContext.js'

const __DEV__ = (import.meta?.env?.MODE !== 'production')

/**
 * Use the full session object.
 * Warns (in dev) if used outside a provider.
 */
export function useSession() {
  const ctx = useContext(SessionContext)
  if (__DEV__ && (ctx === DEFAULT_SESSION || ctx == null)) {
    // eslint-disable-next-line no-console
    console.warn('[useSession] Used outside <SessionProvider>. Returning default (logged out).')
  }
  useDebugValue(ctx || DEFAULT_SESSION, s =>
    `Session{ loading:${!!s?.loading}, isLoggedIn:${!!s?.isLoggedIn}, role:${s?.role ?? 'null'} }`
  )
  return ctx || DEFAULT_SESSION
}

/**
 * Select a slice of session state with memoized return.
 * Prevents downstream re-renders if the selected value is referentially equal.
 *
 * Example:
 *   const email = useSessionSelector(s => s.user?.email)
 *   const user  = useSessionSelector(s => s.user, (a,b) => a?.id === b?.id)
 *
 * @param {(session:any)=>any} selector
 * @param {(a:any,b:any)=>boolean} [isEqual=Object.is] - equality to keep prior value
 */
export function useSessionSelector(selector, isEqual = Object.is) {
  const session = useSession()
  const prevRef = useRef()
  const selected = (() => {
    try {
      return selector ? selector(session) : session
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[useSessionSelector] Selector threw:', e)
      }
      return undefined
    }
  })()

  // If equal to previous selection, return the same reference to avoid
  // downstream updates (e.g., useEffect deps, memoized components).
  if (isEqual(selected, prevRef.current)) {
    return prevRef.current
  }
  prevRef.current = selected
  return selected
}

/** Convenience helpers */
export function useUser() {
  return useSessionSelector(s => s.user)
}
export function useRole() {
  return useSessionSelector(s => s.role)
}
export function useIsLoggedIn() {
  return useSessionSelector(s => s.isLoggedIn)
}
export function useIsLoading() {
  return useSessionSelector(s => s.loading)
}

/**
 * Role utilities (client-only checks).
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
  const set = new Set(roles)
  return set.has(current)
}

/**
 * Safe accessors with localStorage / debug fallbacks (useful during early boot).
 */
export function getCurrentUserEmailFallback() {
  const last = (typeof window !== 'undefined' && window.__lastSession) || {}
  const ctx = safePeekContext()
  // Check in order: window debug → live context → localStorage
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
 * Call this once where you compute the session (e.g., in main.jsx after memo).
 * Example:
 *   if (import.meta.env.DEV) syncSessionDebug(sessionValue)
 */
export function syncSessionDebug(sessionValue) {
  if (__DEV__ && typeof window !== 'undefined') {
    window.__lastSession = sessionValue
  }
}

/** Internal: best-effort peek for fallbacks (no crash if unavailable). */
function safePeekContext() {
  try {
    // This peeks the current value without a hook; fine for debug/fallbacks.
    // React sets _currentValue on contexts in modern builds.
    return SessionContext?._currentValue || DEFAULT_SESSION
  } catch {
    return DEFAULT_SESSION
  }
}

// Optional default export for ergonomics
export default useSession