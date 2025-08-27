// src/admin/companies/add-student/hooks/useInstructorsList.js
// ============================================================================
// useInstructorsList
// - Live instructors list from /users where role === 'instructor'
// - Optional scoping by schoolId; falls back to admin's profile or localStorage
// - Options for activeOnly, max results, and whether to include "(Unassigned)"
// - Returns { instructors, loading, error }
// ============================================================================

import { useEffect, useMemo, useState } from 'react'
import { auth, db } from '@utils/firebase.js'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  limit as lim,
} from 'firebase/firestore'

/**
 * @param {{
 *   schoolId?: string,
 *   activeOnly?: boolean,
 *   max?: number,
 *   withUnassigned?: boolean
 * }} [opts]
 * @returns {{
 *   instructors: Array<{ value: string, label: string, name?: string, email?: string, status?: string }>,
 *   loading: boolean,
 *   error: string | null
 * }}
 */
export default function useInstructorsList(opts = {}) {
  const {
    schoolId: schoolIdProp,
    activeOnly = true,
    max = 200,
    withUnassigned = false,
  } = opts

  // best-effort initial value; refined via current admin profile if needed
  const [schoolId, setSchoolId] = useState(() => {
    if (schoolIdProp) return schoolIdProp
    try {
      return localStorage.getItem('schoolId') || ''
    } catch {
      return ''
    }
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])

  // Resolve schoolId from the current admin profile if not provided/found
  useEffect(() => {
    let cancelled = false
    async function resolveSchool() {
      if (schoolId || schoolIdProp) return
      try {
        const email = auth?.currentUser?.email
        if (!email) return
        const snap = await getDoc(doc(db, 'users', email))
        const sid = snap.exists() ? (snap.data()?.schoolId || '') : ''
        if (!cancelled && sid) {
          setSchoolId(sid)
          try { localStorage.setItem('schoolId', sid) } catch {}
        }
      } catch {
        // ignore; we’ll query without school scope
      }
    }
    resolveSchool()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, schoolIdProp])

  // Live query instructors (role === 'instructor', plus filters)
  useEffect(() => {
    setLoading(true)
    setError(null)

    const col = collection(db, 'users')
    const constraints = [where('role', '==', 'instructor')]
    if (schoolId) constraints.push(where('schoolId', '==', schoolId))
    if (activeOnly) constraints.push(where('status', '==', 'active'))

    const q = query(col, ...constraints, lim(Math.max(1, Math.min(max, 500))))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(d => {
          const u = d.data() || {}
          const name = (u.name || '').trim()
          const email = (u.email || d.id || '').trim()
          const status = (u.status || 'active').trim()
          // Prefer a human-friendly label; fallback to email
          const label = name || email || '(instructor)'
          return { value: d.id, label, name, email, status }
        })

        // Sort by name/label, then email — case-insensitive
        data.sort((a, b) => {
          const byLabel = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
          if (byLabel !== 0) return byLabel
          return (a.email || '').localeCompare(b.email || '', undefined, { sensitivity: 'base' })
        })

        setRows(data)
        setLoading(false)
      },
      (err) => {
        setError(err?.message || 'Failed to load instructors.')
        setRows([])
        setLoading(false)
      }
    )

    return () => unsub()
  }, [schoolId, activeOnly, max])

  const instructors = useMemo(() => {
    if (!withUnassigned) return rows
    // Prepend a neutral option for selects
    return [{ value: '', label: '(Unassigned)' }, ...rows]
  }, [rows, withUnassigned])

  return { instructors, loading, error }
}