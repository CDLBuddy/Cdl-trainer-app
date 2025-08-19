// Path: src/admin/dashboard/hooks/subhooks/useUsersQuery.js
// ============================================================================
// useUsersQuery
// - Fetches dashboard users for a school (students/instructors/admins)
// - Safe defaults, name-sorted, progress clamped
// - Stable API: { users, setUsers, loading } + non-breaking { refresh }
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@utils/firebase.js'
import { useToast } from '@components/ToastContext.js'
import { clampPct } from '../../utils'

/** Roles visible on the admin dashboard */
const DASHBOARD_ROLES = ['student', 'instructor', 'admin']

/** Map Firestore doc → dashboard row (with safe defaults) */
function mapUserDoc(docSnap) {
  const d = docSnap.data() || {}
  return {
    id: docSnap.id,
    name: d.name || 'User',
    email: d.email,
    phone: d.phone || '',
    role: d.role || 'student',
    assignedInstructor: d.assignedInstructor || '',
    assignedCompany: d.assignedCompany || '',
    profileProgress: clampPct(d.profileProgress),
    permitExpiry: d.permitExpiry || '',
    medCardExpiry: d.medCardExpiry || '',
    paymentStatus: d.paymentStatus || '',
    compliance: d.compliance || '',
  }
}

/**
 * Query all dashboard users for a school (students/instructors/admins).
 * @param {{ schoolId: string }} params
 * @returns {{ users: Array<any>, setUsers: Function, loading: boolean, refresh: () => Promise<void> }}
 */
export function useUsersQuery({ schoolId }) {
  const { showToast } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    try {
      const snap = await getDocs(
        query(
          collection(db, 'users'),
          where('schoolId', '==', schoolId),
          where('role', 'in', DASHBOARD_ROLES)
        )
      )

      // Map → sort by name (case-insensitive) → assign
      const rows = snap.docs
        .map(mapUserDoc)
        .sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }))

      setUsers(rows)
    } catch (err) {
      console.error('useUsersQuery refresh error:', err)
      showToast('Error fetching users.', 'error')
    } finally {
      setLoading(false)
    }
  }, [schoolId, showToast])

  useEffect(() => {
    if (!schoolId) {
      setUsers([])
      setLoading(false)
      return
    }
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const snap = await getDocs(
          query(
            collection(db, 'users'),
            where('schoolId', '==', schoolId),
            where('role', 'in', DASHBOARD_ROLES)
          )
        )
        if (!alive) return
        const rows = snap.docs
          .map(mapUserDoc)
          .sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }))
        setUsers(rows)
      } catch (err) {
        if (!alive) return
        console.error('useUsersQuery initial load error:', err)
        showToast('Error fetching users.', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [schoolId, showToast])

  return { users, setUsers, loading, refresh }
}