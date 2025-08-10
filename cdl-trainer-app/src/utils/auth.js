// src/utils/auth.js
// Simple auth utilities + status hook (Firebase Auth)

import { useEffect, useState } from 'react'

import { auth } from './firebase'

/**
 * SSR/test-safe read of the current role.
 * Falls back to "student" if nothing is set.
 */
export function getUserRole() {
  if (typeof window === 'undefined') return 'student'
  try {
    return (
      localStorage.getItem('userRole') || window.currentUserRole || 'student'
    )
  } catch {
    return 'student'
  }
}

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

/**
 * Synchronous boolean for "is a user currently attached".
 * (Will be false during the split second before onAuthStateChanged fires.)
 */
export function isLoggedInSync() {
  return !!auth.currentUser
}

/**
 * React hook that tracks Firebase auth state and a simple role.
 * Role currently comes from localStorage/window to match your app;
 * you can later swap this to custom claims or a Firestore lookup.
 */
export function useAuthStatus() {
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [role, setRole] = useState(null)
  const [user, setUser] = useState(null) // handy if you need uid/displayName in components

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      setUser(u || null)
      setIsLoggedIn(!!u)
      setRole(getUserRole()) // swap later for claims/Firestore if desired
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return { loading, isLoggedIn, role, user }
}

/**
 * Promise that resolves once Firebase has determined auth state.
 * Useful in non-React contexts (e.g., one-off scripts).
 */
export function waitForAuthReady() {
  return new Promise(resolve => {
    const unsub = auth.onAuthStateChanged(() => {
      unsub()
      resolve(auth.currentUser || null)
    })
  })
}

/**
 * Subscribe to auth changes without React.
 * Returns an unsubscribe function.
 */
export function onAuthChange(callback) {
  return auth.onAuthStateChanged(u => callback(u || null))
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
