// src/utils/RequireRole.jsx
// ======================================================================
// Role gate for routes/components with Firebase-backed resolution.
// - Supports role sources: custom claims, users/<uid>, users by email
// - Caches per-tab in sessionStorage with TTL
// - Accepts role string | string[] | predicate(role) => boolean
// - Optional router preload hook
// ======================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'

import { auth, db } from './firebase'
import SplashScreen from '@components/SplashScreen.jsx'
import { preloadRoutesForRole } from '@utils/route-preload'

// --------------------------- Config -----------------------------------

/** Where to look for the role, in order. Override via props if needed. */
const DEFAULT_ROLE_SOURCES = /** @type {const} */ ([
  'customClaims',    // token.claims.role OR token.claims.roles[0]
  'userDocByUid',    // Firestore: users/<uid> { role }
  'userDocByEmail',  // Firestore: users where email == currentUser.email
])

/** Session cache key (per tab) */
const CACHE_KEY = 'roleCache_v1'

/** Normalize app roles */
function normalizeRole(role) {
  const r = String(role ?? '').trim().toLowerCase()
  return r === 'student' ||
    r === 'instructor' ||
    r === 'admin' ||
    r === 'superadmin'
    ? r
    : null
}

// --------------------------- Hook -------------------------------------

/**
 * useUserRole
 * - Subscribes to Firebase auth
 * - Resolves role via sources (claims/Firestore)
 * - Caches in sessionStorage (TTL)
 */
export function useUserRole(options = {}) {
  const {
    sources = DEFAULT_ROLE_SOURCES,
    cacheTtlSec = 300, // 5 min
    onResolved,        // (user, role) => void
    onRoleChange,      // (prev, next) => void
  } = options

  const [state, setState] = useState(() => ({
    loading: true,
    error: null,
    user: null,
    role: null,
    email: null,
  }))
  const prevRoleRef = useRef(null)

  useEffect(() => {
    let mounted = true

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return
      try {
        if (!user) {
          sessionStorage.removeItem(CACHE_KEY)
          prevRoleRef.current = null
          setState({ loading: false, error: null, user: null, role: null, email: null })
          if (typeof onResolved === 'function') onResolved(null, null)
          return
        }

        const email = user.email || null

        // 1) Cache
        const cached = safeGetCache(user.uid, email)
        if (cached) {
          const role = normalizeRole(cached.role)
          maybeNotifyRoleChange(prevRoleRef, role, onRoleChange)
          setState({ loading: false, error: null, user, role, email })
          if (typeof onResolved === 'function') onResolved(user, role)
          return
        }

        // 2) Resolve live
        const role = normalizeRole(await resolveRoleFromSources(user, email, sources))
        // Cache (allow caching null briefly to prevent hammering)
        safeSetCache(user.uid, email, role, role ? cacheTtlSec : 30)

        // Back-compat with code that reads from window/localStorage
        if (role) {
          try {
            window.currentUserRole = role
            localStorage.setItem('userRole', role)
          } catch {}
        }

        maybeNotifyRoleChange(prevRoleRef, role, onRoleChange)
        setState({ loading: false, error: null, user, role, email })
        if (typeof onResolved === 'function') onResolved(user, role)
      } catch (err) {
        setState(s => ({ ...s, loading: false, error: err || new Error('Role check failed') }))
      }
    })

    return () => { mounted = false; try { unsub() } catch {} }
  }, [cacheTtlSec, onResolved, onRoleChange, sources])

  return state
}

// --------------------------- Component --------------------------------

/**
 * RequireRole
 * - role: string | string[] | (role) => boolean
 * - redirectTo: path for unauthenticated users
 * - fallback: ReactNode while checking
 * - onDeny: ReactNode when authed but not authorized
 * - preload: boolean | (role) => void  (preload role router chunks)
 * - sources: override role resolution order
 */
export function RequireRole({
  role,
  children,
  redirectTo = '/login',
  fallback = <DefaultLoader text="Checking permissions…" />,
  onDeny = <DefaultAccessDenied />,
  preload = true,
  sources = DEFAULT_ROLE_SOURCES,
}) {
  const location = useLocation()
  const { loading, user, role: currentRole } = useUserRole({
    sources,
    onResolved: (u, r) => {
      if (!u || !r) return
      // Optional preload of role-specific routes
      if (preload === true) preloadRoutesForRole(r).catch(() => {})
      else if (typeof preload === 'function') {
        try { preload(r) } catch {}
      }
    },
  })

  const allowed = useMemo(() => {
    if (!role) return true // only requires sign-in
    if (typeof role === 'function') return !!role(currentRole)
    if (Array.isArray(role)) return role.map(normalizeRole).includes(currentRole)
    return normalizeRole(role) === currentRole
  }, [role, currentRole])

  // Not signed in → send to login, preserve "from"
  if (!loading && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Still determining
  if (loading) return fallback

  // Signed in but not authorized
  if (!allowed) return onDeny

  return <>{children}</>
}

// --------------------------- Defaults ---------------------------------

export function DefaultLoader({ text = 'Loading…' }) {
  return <SplashScreen message={text} showTip={false} />
}

export function DefaultAccessDenied() {
  return (
    <div className="dashboard-card" style={{ maxWidth: 560, margin: '2em auto', textAlign: 'center' }}>
      <h2>Access Denied</h2>
      <p style={{ opacity: 0.85 }}>
        Your account doesn’t have permission to view this page.
      </p>
      <div style={{ marginTop: 14 }}>
        <button className="btn" onClick={() => (window.location.href = '/')}>
          Go Home
        </button>
      </div>
    </div>
  )
}

// --------------------------- Helpers ----------------------------------

async function resolveRoleFromSources(user, email, sources) {
  for (const source of sources) {
    try {
      switch (source) {
        case 'customClaims': {
          const token = await getIdTokenResult(user, true)
          const claimRole = token?.claims?.role || token?.claims?.roles?.[0]
          if (claimRole) return claimRole
          break
        }
        case 'userDocByUid': {
          const ref = doc(db, 'users', user.uid)
          const snap = await getDoc(ref)
          if (snap.exists()) {
            const role = snap.data()?.role
            if (role) return role
          }
          break
        }
        case 'userDocByEmail': {
          if (!email) break
          const q = query(collection(db, 'users'), where('email', '==', email))
          const res = await getDocs(q)
          if (!res.empty) {
            const role = res.docs[0].data()?.role
            if (role) return role
          }
          break
        }
        default:
          // allow custom resolvers via function
          if (typeof source === 'function') {
            const role = await source({ user, email })
            if (role) return role
          }
      }
    } catch {
      // ignore and try next source
    }
  }
  return null
}

// Cache structure: { [uidOrEmail]: { role, exp: timestampMillis } }
function safeGetCache(uid, email) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const key = uid || email
    const entry = key ? data[key] : null
    if (!entry) return null
    if (Date.now() > entry.exp) return null
    return { role: entry.role }
  } catch {
    return null
  }
}

function safeSetCache(uid, email, role, ttlSeconds = 300) {
  try {
    const key = uid || email
    if (!key) return
    const raw = sessionStorage.getItem(CACHE_KEY)
    const data = raw ? JSON.parse(raw) : {}
    data[key] = {
      role,
      exp: Date.now() + ttlSeconds * 1000,
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

function maybeNotifyRoleChange(ref, next, cb) {
  const prev = ref.current
  if (prev !== next) {
    ref.current = next
    if (typeof cb === 'function') {
      try { cb(prev, next) } catch {}
    }
  }
}

export default RequireRole