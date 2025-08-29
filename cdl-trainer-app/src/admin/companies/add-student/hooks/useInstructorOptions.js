// src/admin/companies/add-student/hooks/useInstructorOptions.js
// -----------------------------------------------------------------------------
// Loads instructors for the current school as <select> options
// Safe fallbacks, minimal assumptions, sorts by name/email.
// -----------------------------------------------------------------------------

import { collection, getDocs, query, where } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'

import { db } from '@utils/firebase.js'

export default function useInstructorOptions({ schoolId }) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const sid = useMemo(
    () => schoolId || window.schoolId || localStorage.getItem('schoolId') || '',
    [schoolId]
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const usersRef = collection(db, 'users')

        // Filter by role; also by school if available
        // NOTE: Firestore may ask for a composite index: follow its link once.
        const q = sid
          ? query(
              usersRef,
              where('role', '==', 'instructor'),
              where('schoolId', '==', sid)
            )
          : query(usersRef, where('role', '==', 'instructor'))

        const snap = await getDocs(q)
        if (!alive) return

        const rows = snap.docs.map(d => {
          const u = d.data() || {}
          const name = (u.name || '').trim()
          const email = (u.email || '').trim()
          const label = name ? `${name} — ${email}` : email || d.id
          return { value: d.id, label, name, email }
        })

        rows.sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
        )
        setOptions(rows)
      } catch (e) {
        console.error('[useInstructorOptions]', e)
        setError('Failed to load instructors.')
        setOptions([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [sid])

  return { options, loading, error }
}
