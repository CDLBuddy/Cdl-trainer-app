// src/utils/auth.js
// Simple auth utilities + status hook (Firebase Auth)

import { useEffect, useMemo, useState } from 'react'
import { auth } from './firebase' // assumes you've initialized Firebase Auth here

/* =========================================================================
   Role helpers
   ========================================================================= */

/** @typedef {'student'|'instructor'|'admin'|'superadmin'} AppRole */

export function normalizeRole(role) {
  const r = String(role ?? '').trim().toLowerCase()
  return /** @type {AppRole} */ (
    r === 'student' || r === 'instructor' || r === 'admin' || r === 'superadmin'
      ? r
      : 'student'
  )
}

/**
 * SSR/test-safe read of the current role.
 * Falls back to "student" if nothing is set.
 */
export function getUserRole() {
  if (typeof window === 'undefined') return 'student'
  try {
    return normalizeRole(
      localStorage.getItem('userRole') || window.currentUserRole || 'student'
    )
  } catch {
    return 'student'
  }
}

/** Persist role locally (handy after login / school switch). */
export function setUserRole(role) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('userRole', normalizeRole(role))
    window.currentUserRole = normalizeRole(role)
  } catch {
    /* no-op */
  }
}

/** Clear local auth artifacts (role/email/etc.). */
export function clearStoredAuth() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('userRole')
    localStorage.removeItem('currentUserEmail')
    delete window.currentUserRole
    delete window.currentUserEmail
  } catch {
    /* no-op */
  }
}

/* =========================================================================
   User helpers
   ========================================================================= */

/**
 * SSR/test-safe read of the current user's email.
 */
export function getCurrentUserEmail() {
  if (typeof window === 'undefined') return null
  try {
    return (
      auth.currentUser?.email ||
      window.currentUserEmail ||
      localStorage.getItem('currentUserEmail') ||
      null
    )
  } catch {
    return null
  }
}

/** Synchronous boolean for "is a user currently attached". */
export function isLoggedInSync() {
  try {
    return !!auth.currentUser
  } catch {
    return false
  }
}

/* =========================================================================
   React hook: auth status
   ========================================================================= */

/**
 * React hook that tracks Firebase auth state and a simple role.
 * Role currently comes from localStorage/window to match your app;
 * you can later swap to custom claims or Firestore lookup (see below).
 */
export function useAuthStatus() {
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [role, setRole] = useState(/** @type {AppRole|null} */(null))
  const [user, setUser] = useState(null) // includes uid/displayName/email/photoURL

  useEffect(() => {
    let mounted = true

    // 1) Auth state changes (login/logout)
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      if (!mounted) return
      setUser(u || null)
      setIsLoggedIn(!!u)

      // Current role strategy: localStorage/window (fast)
      const localRole = getUserRole()

      // OPTIONAL: load from custom claims instead of localStorage:
      // try {
      //   if (u) {
      //     const { claims } = await u.getIdTokenResult(true)
      //     const claimedRole = claims.role // e.g., 'student'
      //     setRole(normalizeRole(claimedRole || localRole))
      //   } else {
      //     setRole(null)
      //   }
      // } catch { setRole(!!u ? localRole : null) }

      setRole(!!u ? localRole : null)
      setLoading(false)
    })

    // 2) Token changes (refresh / claims updates)
    const unsubToken = auth.onIdTokenChanged(() => {
      // Intentionally light; the onAuthStateChanged handler above drives state.
      // You could re-pull claims here if you move role to claims.
    })

    // 3) Refresh tokens when tab regains focus (helps keep sessions alive)
    const onVisible = () => {
      try { auth.currentUser?.getIdToken(true) } catch { /* no-op */ }
    }
    document.addEventListener('visibilitychange', onVisible, { passive: true })

    return () => {
      mounted = false
      try { unsubAuth() } catch {}
      try { unsubToken() } catch {}
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Stable object identity so consumers don’t rerender unnecessarily.
  return useMemo(
    () => ({ loading, isLoggedIn, role, user }),
    [loading, isLoggedIn, role, user]
  )
}

/* =========================================================================
   Non-React utilities
   ========================================================================= */

/**
 * Promise that resolves once Firebase has determined auth state.
 * Useful in non-React contexts (e.g., one-off scripts).
 */
export function waitForAuthReady() {
  return new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged(() => {
      try { unsub() } catch {}
      resolve(auth.currentUser || null)
    })
  })
}

/**
 * Subscribe to auth changes without React. Returns an unsubscribe function.
 */
export function onAuthChange(callback) {
  return auth.onAuthStateChanged((u) => callback(u || null))
}

/**
 * Get an ID token (JWT) for the current user, or null if logged out.
 * Pass forceRefresh=true to bypass cache.
 */
export async function getIdToken(forceRefresh = false) {
  const user = auth.currentUser
  if (!user) return null
  try {
    return await user.getIdToken(forceRefresh)
  } catch {
    return null
  }
}

/** Like getIdToken, but returns the full token result incl. claims. */
export async function getIdTokenResult(forceRefresh = false) {
  const user = auth.currentUser
  if (!user) return null
  try {
    return await user.getIdTokenResult(forceRefresh)
  } catch {
    return null
  }
}

/** Convenience: build an Authorization header if logged in. */
export async function getAuthHeader() {
  const token = await getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Sign out and clear local artifacts. */
export async function logout() {
  try {
    await auth.signOut()
  } finally {
    clearStoredAuth()
  }
}