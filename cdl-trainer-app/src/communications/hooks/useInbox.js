// src/communications/hooks/useInbox.js
/**
 * Recipient inbox hook (students/instructors/admins).
 * - Infers role/scope from window/session when not provided
 * - Fetches announcements/messages via listInAppForUser()
 * - Exposes { items, loading, error, empty, role, refetch, lastLoadedAt }
 *
 * @param {Object} [opts]
 * @param {'student'|'instructor'|'admin'|'superadmin'} [opts.role]
 * @param {string|null} [opts.schoolId]
 * @param {string|null} [opts.companyId]
 * @param {number} [opts.take=20]              Max results to return
 * @param {number} [opts.pollMs=0]             Optional polling interval (ms). 0 = off
 * @param {(err:Error)=>void} [opts.onError]   Optional onError callback
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAuth } from 'firebase/auth'
import { listInAppForUser } from '../services/inboxApi.js'

const noop = () => {}

/** Basic error normalizer so UI has a consistent message */
function toError(e, fallback = 'Failed to load announcements') {
  if (!e) return new Error(fallback)
  if (e instanceof Error) return e
  try { return new Error(typeof e === 'string' ? e : JSON.stringify(e)) }
  catch { return new Error(fallback) }
}

export function useInbox({
  role,
  schoolId,
  companyId,
  take = 20,
  pollMs = 0,
  onError = noop,
} = {}) {
  const [items, setItems] = useState(() => /** @type {any[]} */([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {Error|null} */(null))
  const [lastLoadedAt, setLastLoadedAt] = useState(/** @type {Date|null} */(null))

  // Guard for SSR
  const hasWindow = typeof window !== 'undefined'

  // Infer role/scope once per change in inputs
  const inferred = useMemo(() => {
    if (!hasWindow) {
      return { role: (role || 'student'), schoolId: schoolId ?? null, companyId: companyId ?? null }
    }
    try {
      const u = getAuth()?.currentUser
      // Optional globals your app already places on window
      const inferredRole =
        role ||
        window?.currentUserRole ||
        window?.__lastSession?.role ||
        'student'
      return {
        role: String(inferredRole).toLowerCase(),
        schoolId: schoolId ?? window?.currentSchoolId ?? null,
        companyId: companyId ?? window?.currentCompanyId ?? null,
        uid: u?.uid ?? null,
      }
    } catch {
      return { role: (role || 'student'), schoolId: schoolId ?? null, companyId: companyId ?? null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, schoolId, companyId, hasWindow])

  // Keep an AbortController for in-flight fetches (prevents late state updates)
  const abortRef = useRef(/** @type {AbortController|null} */(null))

  const fetchOnce = useCallback(async () => {
    abortRef.current?.abort()
    const ctl = new AbortController()
    abortRef.current = ctl

    setLoading(true)
    setError(null)

    try {
      const data = await listInAppForUser(
        { role: inferred.role, schoolId: inferred.schoolId, companyId: inferred.companyId, take },
        ctl.signal // if your service ignores it, no harm
      )

      if (ctl.signal.aborted) return

      // Defensive: ensure array + shallow normalize some fields
      const next = Array.isArray(data) ? data : []
      setItems(next)
      setLastLoadedAt(new Date())
    } catch (e) {
      if (ctl.signal.aborted) return
      const err = toError(e)
      setError(err)
      onError?.(err)
    } finally {
      if (!abortRef.current?.signal.aborted) setLoading(false)
    }
  }, [inferred.role, inferred.schoolId, inferred.companyId, take, onError])

  // Initial + dependency-driven load
  useEffect(() => {
    fetchOnce()
    return () => abortRef.current?.abort()
  }, [fetchOnce])

  // Optional polling
  useEffect(() => {
    if (!pollMs || pollMs <= 0) return
    const id = setInterval(fetchOnce, Math.max(1500, pollMs))
    return () => clearInterval(id)
  }, [pollMs, fetchOnce])

  const refetch = fetchOnce
  const empty = !loading && !error && items.length === 0

  return {
    items,
    loading,
    error,
    empty,
    role: inferred.role,
    lastLoadedAt,
    refetch,
  }
}