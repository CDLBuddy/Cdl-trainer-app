// src/utils/RequireRole.jsx
// ======================================================================
// Role gate for routes/components with Firebase-backed resolution.
// - Sources: custom claims, users/<uid>, users by email (configurable)
// - Per-tab sessionStorage cache with TTL
// - Accepts role string | string[] | predicate(role) => boolean
// - Optional router preload hook (warms role router bundle)
// - FIX: avoid update-depth loops by making callbacks stable via refs
// - FIX: no redirects/denials while authed but role is still null
// ======================================================================

import { getIdTokenResult, onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import SplashScreen from '@components/SplashScreen.jsx'
import { __DEV__ } from '@utils/env.js'
import { auth, db } from '@utils/firebase.js'
import { preloadRoutesForRole } from '@utils/route-preload.js'

/* -------------------------------- Config --------------------------------- */

/** Resolution order for role lookups (override via props if needed). */
const DEFAULT_ROLE_SOURCES = /** @type {const} */ ([
  'customClaims', // token.claims.role OR token.claims.roles[0]
  'userDocByUid', // Firestore: users/<uid> { role }
  'userDocByEmail', // Firestore: users where email == currentUser.email
])

/** Session cache key (per tab) */
const CACHE_KEY = 'roleCache_v1'

/** Normalize to one of our known roles, else null. */
function normalizeRole(role) {
  const r = String(role ?? '')
    .trim()
    .toLowerCase()
  return r === 'student' ||
    r === 'instructor' ||
    r === 'admin' ||
    r === 'superadmin'
    ? r
    : null
}

/* -------------------------------- Hook ----------------------------------- */

/**
 * useUserRole
 * - Subscribes to Firebase auth
 * - Resolves role via sources (claims / Firestore)
 * - Caches result in sessionStorage with TTL
 * - Uses refs for callbacks to avoid effect thrash
 */
export function useUserRole(options = {}) {
  const {
    sources = DEFAULT_ROLE_SOURCES,
    cacheTtlSec = 300, // 5 min
    onResolved, // (user, role) => void
    onRoleChange, // (prev, next) => void
  } = options

  const [state, setState] = useState(() => ({
    loading: true,
    error: null,
    user: null,
    role: null,
    email: null,
  }))

  // Keep callbacks in refs so the auth subscription effect doesn't depend on
  // their identity (fixes update-depth loops).
  const onResolvedRef = useRef(onResolved)
  const onRoleChangeRef = useRef(onRoleChange)
  useEffect(() => {
    onResolvedRef.current = onResolved
  }, [onResolved])
  useEffect(() => {
    onRoleChangeRef.current = onRoleChange
  }, [onRoleChange])

  // Stable key for sources (arrays often change identity).
  const sourcesKey = useMemo(() => {
    return Array.isArray(sources) ? sources.join('|') : 'custom'
  }, [sources])

  const prevRoleRef = useRef(null)

  useEffect(() => {
    let mounted = true

    const unsub = onAuthStateChanged(auth, async user => {
      if (!mounted) return
      try {
        if (!user) {
          sessionStorage.removeItem(CACHE_KEY)
          prevRoleRef.current = null
          setState({
            loading: false,
            error: null,
            user: null,
            role: null,
            email: null,
          })
          onResolvedRef.current?.(null, null)
          return
        }

        const email = user.email || null

        // 1) Cache (fast path)
        const cached = safeGetCache(user.uid, email)
        if (cached) {
          const role = normalizeRole(cached.role)
          maybeNotifyRoleChange(prevRoleRef, role, onRoleChangeRef.current)
          setState({ loading: false, error: null, user, role, email })
          onResolvedRef.current?.(user, role)
          return
        }

        // 2) Resolve live, then normalize
        const rawRole = await resolveRoleFromSources(user, email, sources)
        const role = normalizeRole(rawRole)

        // Cache (cache null briefly to avoid hammering)
        safeSetCache(user.uid, email, role, role ? cacheTtlSec : 30)

        // Optional back-compat
        if (role) {
          try {
            window.currentUserRole = role
            localStorage.setItem('userRole', role)
          } catch {
            /* ignore */
          }
        }

        maybeNotifyRoleChange(prevRoleRef, role, onRoleChangeRef.current)
        setState({ loading: false, error: null, user, role, email })
        onResolvedRef.current?.(user, role)
      } catch (err) {
        setState(s => ({
          ...s,
          loading: false,
          error: err || new Error('Role check failed'),
        }))
      }
    })

    return () => {
      mounted = false
      try {
        unsub()
      } catch {
        /* ignore */
      }
    }
    // IMPORTANT: do NOT depend on function props here — we use refs above.
  }, [cacheTtlSec, sourcesKey, sources])

  return state
}

/* ------------------------------- Component ------------------------------- */

/**
 * RequireRole
 * - requiredRole (preferred) | role (legacy): string | string[] | (role) => boolean
 * - redirectTo: path for unauthenticated users
 * - fallback: ReactNode while checking
 * - onDeny: ReactNode when authed but not authorized
 * - preload: boolean | (role) => void  (preload role router chunks)
 * - sources: override role resolution order
 *
 * Loop-safety rules:
 * - While loading → show fallback.
 * - If authed but role is still null → show "finalizing role" loader (NO redirects).
 * - Only redirect when user is NOT signed in.
 * - Only deny when a concrete role is known and doesn’t satisfy the requirement.
 */
export function RequireRole({
  requiredRole,
  role: legacyRole,
  children,
  redirectTo = '/login',
  fallback = <DefaultLoader text="Checking permissions…" />,
  onDeny = <DefaultAccessDenied />,
  preload = true,
  sources = DEFAULT_ROLE_SOURCES,
}) {
  const location = useLocation()
  const preloadedRef = useRef(new Set()) // once-per-role guard

  const {
    loading,
    user,
    role: currentRole,
  } = useUserRole({
    sources,
    onResolved: (u, r) => {
      if (!u || !r) return
      if (preload === true) {
        if (!preloadedRef.current.has(r)) {
          preloadedRef.current.add(r)
          preloadRoutesForRole?.(r)?.catch?.(() => {})
        }
      } else if (typeof preload === 'function') {
        try {
          preload(r)
        } catch {
          /* ignore */
        }
      }
    },
  })

  // Prefer the new prop; fall back to the legacy prop name
  const required = requiredRole ?? legacyRole
  const normalizedCurrent = normalizeRole(currentRole)

  // 4) With a concrete role, evaluate requirement
  const allowed = useMemo(() => {
    if (!required) return true // only requires sign-in
    if (typeof required === 'function') return !!required(normalizedCurrent)
    if (Array.isArray(required))
      return required.map(normalizeRole).includes(normalizedCurrent)
    return normalizeRole(required) === normalizedCurrent
  }, [required, normalizedCurrent])

  // 1) Not signed in → send to login, preserve "from"
  if (!loading && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // 2) Still determining auth/role → loader
  if (loading) return fallback

  // 3) Signed in, but role is not yet resolved → WAIT here (no redirects / no deny)
  if (user && !normalizedCurrent) {
    if (__DEV__)
      console.warn(
        '[RequireRole] user authenticated, role not resolved yet — holding.'
      )
    return <DefaultLoader text="Finalizing your role…" />
  }

  // 5) Signed in but not authorized (role is known and mismatched)
  if (!allowed) return onDeny

  return <>{children}</>
}

/**
 * Route wrapper variant:
 * <Route element={<RequireRoleRoute requiredRole="admin" />}>
 *   <Route path="..." element={<AdminPage/>} />
 * </Route>
 */
export function RequireRoleRoute(props) {
  return (
    <RequireRole {...props}>
      <Outlet />
    </RequireRole>
  )
}

/* ------------------------------- Defaults -------------------------------- */

export function DefaultLoader({ text = 'Loading…' }) {
  return <SplashScreen message={text} showTip={false} />
}

export function DefaultAccessDenied() {
  return (
    <div
      className="dashboard-card"
      style={{ maxWidth: 560, margin: '2em auto', textAlign: 'center' }}
    >
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

/* -------------------------------- Helpers -------------------------------- */

async function resolveRoleFromSources(user, email, sources) {
  for (const source of sources) {
    try {
      switch (source) {
        case 'customClaims': {
          // Force refresh once after sign-in to reduce stale-claim reads.
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
        default: {
          if (typeof source === 'function') {
            const role = await source({ user, email })
            if (role) return role
          }
        }
      }
    } catch {
      // ignore and try next
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
      role: normalizeRole(role),
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
      try {
        cb(prev, next)
      } catch {
        /* ignore */
      }
    }
  }
}

export default RequireRole
