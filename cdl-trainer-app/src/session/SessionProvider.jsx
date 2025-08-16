// src/session/SessionProvider.jsx
// Component-only file to satisfy react-refresh rule

import { useMemo, useRef } from 'react'

import SessionContext, { DEFAULT_SESSION } from './SessionContext.js'

/**
 * @typedef {{ loading?: any, isLoggedIn?: any, role?: any, user?: any }} SessionShape
 *
 * Props:
 * - value?: SessionShape      // { loading, isLoggedIn, role, user }
 * - children: React.ReactNode
 * - exposeDebug?: boolean     // in dev, mirror the latest session on window.__lastSession
 */

const __DEV__ = import.meta?.env?.MODE !== 'production'

/** Shallow equality for the 4 known keys */
function shallowEqualSession(a, b) {
  return (
    a.loading === b.loading &&
    a.isLoggedIn === b.isLoggedIn &&
    a.role === b.role &&
    a.user === b.user
  )
}

/** Normalize incoming value into a safe, canonical shape */
function normalize(value) {
  const v = value || {}
  return {
    loading: !!v.loading,
    isLoggedIn: !!v.isLoggedIn,
    role: v.role ?? null,
    user: v.user ?? null,
  }
}

export default function SessionProvider({
  value,
  children,
  exposeDebug = true,
}) {
  // Normalize once per render
  const next = normalize(value)

  // Keep a stable object identity when nothing changed to avoid re-renders
  const lastRef = useRef(DEFAULT_SESSION)
  const stableValue = useMemo(() => {
    if (!shallowEqualSession(lastRef.current, next)) {
      lastRef.current = next
    }
    return lastRef.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next.loading, next.isLoggedIn, next.role, next.user])

  // Dev-time safety: warn when no value passed or unexpected keys found
  if (__DEV__) {
    if (value == null) {
       
      console.warn('[SessionProvider] No value passed. Using DEFAULT_SESSION.')
    } else {
      const allowed = new Set(['loading', 'isLoggedIn', 'role', 'user'])
      for (const k of Object.keys(value)) {
        if (!allowed.has(k)) {
           
          console.warn(
            `[SessionProvider] Unexpected key "${k}" in value. Allowed keys: loading, isLoggedIn, role, user.`
          )
        }
      }
      if (
        value.loading != null &&
        typeof value.loading !== 'boolean'
      ) {
         
        console.warn(
          '[SessionProvider] "loading" should be a boolean; received:',
          typeof value.loading
        )
      }
      if (
        value.isLoggedIn != null &&
        typeof value.isLoggedIn !== 'boolean'
      ) {
         
        console.warn(
          '[SessionProvider] "isLoggedIn" should be a boolean; received:',
          typeof value.isLoggedIn
        )
      }
    }

    // Optional window debug mirror
    if (exposeDebug && typeof window !== 'undefined') {
      // Expose a read-only snapshot (helps when debugging outside React)
      window.__lastSession = Object.freeze({ ...stableValue })
    }
  }

  return (
    <SessionContext.Provider value={stableValue || DEFAULT_SESSION}>
      {children}
    </SessionContext.Provider>
  )
}