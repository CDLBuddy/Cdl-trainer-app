// Path: src/admin/dashboard/hooks/subhooks/useAuthSchoolGuard.js
// ============================================================================
// useAuthSchoolGuard (loop-safe, session-driven)
// - Verifies role via Session context (no redirects while role is null)
// - Resolves schoolId (Firestore users/<uid> first; fallback by email)
// - Safe in StrictMode (deduped redirects), path-deduped
// - Sends non-admins to *their* dashboard (prevents login bounce loops)
// - Admins without a school → /admin/settings?missing=school
// ============================================================================

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import useToast from '@components/useToast.js'
import { getDashboardRoute, normalizeRole as normRole } from '@navigation/navConfig.js'
import { __DEV__ } from '@utils/env.js'
import { db } from '@utils/firebase.js'

import { useSession } from '@session'

/** @typedef {'student'|'instructor'|'admin'|'superadmin'} Role */

const norm = (x) => String(x ?? '').trim().toLowerCase()

/**
 * @typedef {Object} GuardOptions
 * @property {Role}   [requireRole='admin']
 * @property {string} [redirectTo='/login']      // used only for unauthenticated users
 * @property {(r:'no-user'|'denied'|'error')=>void} [onDenied]
 * @property {boolean} [allowSuper=true]
 * @property {boolean} [skipFirestore=false]
 */

/** Normalize a URL-ish string to just the pathname (for equality checks). */
function pathOnly(input, fallback = '/login') {
  try {
    if (typeof input !== 'string') return fallback
    const base = (typeof window !== 'undefined' && window.location?.origin) || 'http://localhost'
    return new URL(input, base).pathname || fallback
  } catch {
    return fallback
  }
}

/**
 * Guard: ensure current user meets role requirement and resolve schoolId.
 * Loop-safe rules:
 *  - Wait for session.loading === false
 *  - If logged out → redirect to redirectTo
 *  - If logged in but role is null → WAIT (no redirect)
 *  - If wrong role → send to THEIR dashboard
 *  - If admin/superadmin but missing schoolId → send to settings/schools
 * @param {GuardOptions} [opts]
 * @returns {{ schoolId: string, loading: boolean }}
 */
export function useAuthSchoolGuard(opts = {}) {
  const {
    requireRole = 'admin',
    redirectTo = '/login',
    onDenied,
    allowSuper = true,
    skipFirestore = false,
  } = opts

  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const onDeniedRef = useRef(onDenied)
  useEffect(() => { onDeniedRef.current = onDenied }, [onDenied])

  const { loading: authLoading, isLoggedIn, role, user } = useSession()
  const [schoolId, setSchoolId] = useState('')
  const [loading, setLoading] = useState(true)

  // Prevent duplicate redirects across effect runs (incl. StrictMode)
  const redirectedRef = useRef(false)

  // Compute normalized paths once
  const redirectPath = useMemo(() => pathOnly(redirectTo, '/login'), [redirectTo])

  useEffect(() => {
    let alive = true
    async function run() {
      // 1) Wait for session to resolve
      if (authLoading) {
        setLoading(true)
        return
      }

      // 2) Not logged in → /login (once)
      if (!isLoggedIn || !user) {
        setLoading(false)
        if (!redirectedRef.current && pathOnly(location.pathname) !== redirectPath) {
          redirectedRef.current = true
          toastRef.current?.info?.('Please log in.')
          navigate(redirectPath, { replace: true, state: { from: location } })
          onDeniedRef.current?.('no-user')
        }
        return
      }

      // 3) Logged in but role not resolved yet → WAIT (no redirects)
      const current = normRole(role)
      if (!current) {
        if (__DEV__) console.warn('[admin guard] role not yet available; waiting.')
        setLoading(true)
        return
      }

      // 4) Role check
      const target = norm(requireRole)
      const isSuper = current === 'superadmin'
      const roleOk = current === target || (allowSuper && isSuper && target !== 'student')

      if (!roleOk) {
        const dest = getDashboardRoute(current)
        if (!redirectedRef.current && pathOnly(location.pathname) !== dest) {
          redirectedRef.current = true
          toastRef.current?.error?.('Access denied for this area.')
          navigate(dest, { replace: true })
          onDeniedRef.current?.('denied')
        }
        setLoading(false)
        return
      }

      // 5) Resolve schoolId (cache → Firestore users/<uid> → Firestore by email)
      //    NOTE: Do not redirect until we actually try to resolve it once.
      let sid = ''
      try {
        const getLS = (k) => {
          try { return localStorage.getItem(k) } catch { return null }
        }
        sid = getLS('schoolId') || ''

        if (!sid && !skipFirestore && db) {
          // Prefer users/<uid> doc
          const ref = doc(db, 'users', user.uid)
          const snap = await getDoc(ref)
          if (snap.exists()) {
            const data = snap.data() || {}
            sid = String(data.schoolId || (Array.isArray(data.assignedSchools) && data.assignedSchools[0]) || '')
          }

          // Fallback: query by email if still empty
          if (!sid && user.email) {
            const qy = query(collection(db, 'users'), where('email', '==', user.email))
            const res = await getDocs(qy)
            if (!res.empty) {
              const data = res.docs[0].data() || {}
              sid = String(data.schoolId || (Array.isArray(data.assignedSchools) && data.assignedSchools[0]) || '')
            }
          }

          // Warm cache
          try { if (sid) localStorage.setItem('schoolId', sid) } catch { /* ignore */ }
        }
      } catch (err) {
        if (__DEV__) console.warn('[admin guard] schoolId resolve failed:', err)
      }

      if (!alive) return

      if (sid) {
        setSchoolId(sid)
        setLoading(false)
        return
      }

      // 6) Admin (or super) but no school → send to settings/schools, not login
      const dest = current === 'superadmin'
        ? '/superadmin/schools?missing=school'
        : '/admin/settings?missing=school'

      if (!redirectedRef.current && pathOnly(location.pathname) !== dest) {
        redirectedRef.current = true
        toastRef.current?.warning?.('No school assigned yet. Please select or create your school.')
        navigate(dest, { replace: true })
        onDeniedRef.current?.('denied')
      }
      setLoading(false)
    }

    run().catch((err) => {
      if (__DEV__) console.error('[useAuthSchoolGuard] unexpected error:', err)
      if (!redirectedRef.current) {
        redirectedRef.current = true
        toastRef.current?.error?.('Unexpected error. Please try again.')
        navigate(redirectPath, { replace: true })
        onDeniedRef.current?.('error')
      }
      setLoading(false)
    })

    return () => { alive = false }
  // Keep deps stable to avoid effect thrash/loops
  }, [authLoading, isLoggedIn, role, user, requireRole, allowSuper, skipFirestore, location, navigate, redirectPath])

  return { schoolId, loading }
}

export default useAuthSchoolGuard
