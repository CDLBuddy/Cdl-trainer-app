// Path: src/admin/dashboard/hooks/subhooks/useUsersQuery.js
// ============================================================================
// useUsersQuery
// - Fetches users scoped to a school (students/instructors/admins)
// - Tries modern shape (assignedSchools: array-contains) then falls back to legacy schoolId
// - Safe mapping with defaults; numeric clamping for profile progress
// - Non-breaking return: { users, setUsers, loading, error, reload }
// ============================================================================

import { collection, getDocs, query, where } from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useToast } from '@components/useToast.js'
import { db } from '@utils/firebase.js'

// roles we care about for the dashboard
const ROLES = ['student', 'instructor', 'admin']

// clamp 0..100 safely
function clampPct(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

// Firestore → app row (defensive)
function mapUserDoc(docSnap) {
  const d = docSnap.data() || {}
  return {
    id: docSnap.id,
    name: d.name || 'User',
    email: d.email || docSnap.id,
    phone: d.phone || '',
    role: d.role || 'student',
    assignedInstructor: d.assignedInstructor || '',
    assignedCompany: d.assignedCompany || '',
    profileProgress: clampPct(d.profileProgress),
    permitExpiry: d.permitExpiry || '',
    medCardExpiry: d.medCardExpiry || d.medCard || '',
    paymentStatus: d.paymentStatus || '',
    compliance: d.compliance || '',
    // keep both identifiers around
    schoolId: d.schoolId || '',
    assignedSchools: Array.isArray(d.assignedSchools) ? d.assignedSchools : [],
  }
}

/**
 * Fetch users one time for a school id.
 * Tries assignedSchools first; if no docs, falls back to schoolId.
 */
async function fetchUsersOnce(schoolId) {
  if (!schoolId) return []

  // Modern: assignedSchools contains sid
  const modernSnap = await getDocs(
    query(
      collection(db, 'users'),
      where('role', 'in', ROLES),
      where('assignedSchools', 'array-contains', schoolId)
    )
  )
  if (!modernSnap.empty) return modernSnap.docs.map(mapUserDoc)

  // Legacy: schoolId equals sid
  const legacySnap = await getDocs(
    query(
      collection(db, 'users'),
      where('role', 'in', ROLES),
      where('schoolId', '==', schoolId)
    )
  )
  return legacySnap.docs.map(mapUserDoc)
}

/**
 * @param {{ schoolId: string }} params
 * @returns {{ users: any[], setUsers: React.Dispatch<React.SetStateAction<any[]>>, loading: boolean, error: string, reload: () => Promise<void> }}
 */
export function useUsersQuery({ schoolId }) {
  const { showToast } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!schoolId) {
      setUsers([])
      setError('')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const rows = await fetchUsersOnce(schoolId)
      // stable alpha sort by name (case-insensitive)
      rows.sort((a, b) =>
        String(a.name).localeCompare(String(b.name), undefined, {
          sensitivity: 'base',
        })
      )
      setUsers(rows)
    } catch (err) {
      console.error('[useUsersQuery] fetch error:', err)
      const msg = 'Error fetching users.'
      setError(msg)
      showToast?.(msg, 'error')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [schoolId, showToast])

  // initial + school changes
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!alive) return
      await reload()
    })()
    return () => {
      alive = false
    }
  }, [reload])

  // Small derived helpers (optional to consume)
  // Memoized counts are handy if you ever want them here
  const counts = useMemo(() => {
    const acc = { student: 0, instructor: 0, admin: 0 }
    for (const u of users) {
      if (u.role === 'student') acc.student++
      else if (u.role === 'instructor') acc.instructor++
      else if (u.role === 'admin') acc.admin++
    }
    return acc
  }, [users])

  return { users, setUsers, loading, error, reload, counts }
}

export default useUsersQuery
