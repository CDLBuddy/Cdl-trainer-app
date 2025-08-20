// Path: src/admin/dashboard/hooks/subhooks/useAuthSchoolGuard.js
// ============================================================================
// useAuthSchoolGuard
// - Verifies the current user meets a role requirement and resolves schoolId
// - Fast path via localStorage; confirms via Firestore when possible
// - Safe in StrictMode (no double redirects) and SSR
// - Back-compat return shape: { schoolId, loading }
// - Options:
//     * requireRole  : 'admin' | 'instructor' | 'student' | 'superadmin' (default 'admin')
//     * redirectTo   : string (default '/login')
//     * onDenied     : (reason: 'no-user' | 'denied' | 'error') => void
//     * allowSuper   : boolean — allow 'superadmin' to pass even if requireRole !== 'superadmin' (default true)
//     * skipFirestore: boolean — trust cache only (default false)
// ============================================================================

import { collection, getDocs, query, where } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '@components/ToastContext.js'
import { db } from '@utils/firebase.js'

/** @typedef {'student'|'instructor'|'admin'|'superadmin'} Role */

function norm(x) {
  return String(x ?? '').trim().toLowerCase()
}

/**
 * @typedef {Object} GuardOptions
 * @property {Role}   [requireRole='admin']
 * @property {string} [redirectTo='/login']
 * @property {(r:'no-user'|'denied'|'error')=>void} [onDenied]
 * @property {boolean} [allowSuper=true]
 * @property {boolean} [skipFirestore=false]
 */

/**
 * Guard: ensure current user meets role requirement and resolve schoolId.
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
  const { showToast } = useToast()

  const [schoolId, setSchoolId] = useState('')
  const [loading, setLoading] = useState(true)

  // Prevent duplicate redirects (StrictMode/re-renders)
  const redirectedRef = useRef(false)

  useEffect(() => {
    let alive = true

    async function guard() {
      setLoading(true)

      // ---------- SSR / safety ----------
      const hasWindow = typeof window !== 'undefined'
      const getLS = (k) => {
        try { return hasWindow ? localStorage.getItem(k) : null } catch { return null }
      }

      // ---------- Fast path: session + local cache ----------
      const currentUserEmail =
        (hasWindow && (/** @type any */(window)).currentUserEmail) ||
        getLS('currentUserEmail') ||
        null

      if (!currentUserEmail) {
        if (!redirectedRef.current) {
          redirectedRef.current = true
          showToast('No user found. Please log in again.', 'error')
          try { hasWindow && (/** @type any */(window)).handleLogout?.() } catch { /* ignore logout errors */ }
          navigate(redirectTo, { replace: true })
          onDenied?.('no-user')
        }
        return
      }

      let role = norm(getLS('userRole'))
      let sid  = getLS('schoolId') || '' // single school cache

      // ---------- Authoritative check via Firestore (optional) ----------
      if (!skipFirestore && db) {
        try {
          const usersRef = collection(db, 'users')
          const qy = query(usersRef, where('email', '==', currentUserEmail))
          const snap = await getDocs(qy)

          if (!snap.empty) {
            const profile = snap.docs[0].data() || {}
            role = norm(profile.role || role)
            // Support both shapes: single schoolId or an array assignedSchools
            const fromArray = Array.isArray(profile.assignedSchools) && profile.assignedSchools[0]
            sid = String(profile.schoolId || fromArray || sid || '')
            // keep cache warm
            if (role) { try { localStorage.setItem('userRole', role) } catch { /* ignore localStorage errors */ } }
            if (sid)  { try { localStorage.setItem('schoolId', sid) } catch { /* ignore localStorage errors */ } }
          }
        } catch (err) {
          // Non-fatal: proceed with cache
          if (import.meta?.env?.DEV) {
            // eslint-disable-next-line no-console
            console.debug('[useAuthSchoolGuard] Firestore lookup failed:', err)
          }
        }
      }

      // ---------- Authorization logic ----------
      const target = norm(requireRole)
      const isSuper = role === 'superadmin'
      const roleOk =
        role === target || (allowSuper && isSuper && target !== 'student') // super can view admin/instructor areas

      if (!roleOk || !sid) {
        if (!redirectedRef.current) {
          redirectedRef.current = true
          showToast('Access denied. Please log in with the correct role.', 'error')
          try { hasWindow && (/** @type any */(window)).handleLogout?.() } catch { /* ignore logout errors */ }
          navigate(redirectTo, { replace: true })
          onDenied?.('denied')
        }
        return
      }

      if (!alive) return
      setSchoolId(sid)
      setLoading(false)
    }

    guard().catch((err) => {
      if (import.meta?.env?.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[useAuthSchoolGuard] unexpected error:', err)
      }
      if (!redirectedRef.current) {
        redirectedRef.current = true
        showToast('Unexpected error. Please log in again.', 'error')
        try { (/** @type any */(window)).handleLogout?.() } catch { /* ignore logout errors */ }
        navigate(redirectTo, { replace: true })
        onDenied?.('error')
      }
    })

    return () => { alive = false }
  }, [requireRole, redirectTo, onDenied, showToast, navigate, allowSuper, skipFirestore])

  return { schoolId, loading }
}

export default useAuthSchoolGuard