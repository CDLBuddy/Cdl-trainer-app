// /src/admin/companies/add-student/services/getInstructors.js
// -----------------------------------------------------------------------------
// getInstructors({ schoolId?, max? })
// - Fetches instructors from /users where role == 'instructor' (and schoolId if provided)
// - Returns [{ id, name, email }] sorted by name (best effort)
// - Designed for use in AddStudentDrawer's datalist
// -----------------------------------------------------------------------------

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore'

import { db, auth } from '@utils/firebase.js'

/**
 * @param {{ schoolId?: string, max?: number }} [opts]
 * @returns {Promise<Array<{ id:string, name:string, email:string }>>}
 */
export async function getInstructors(opts = {}) {
  const { schoolId: explicitSchoolId, max = 50 } = opts
  const fallbackSchoolId =
    explicitSchoolId ||
    // keep this defensive/flexible
    localStorage.getItem('currentSchoolId') ||
    localStorage.getItem('schoolId') ||
    undefined

  const col = collection(db, 'users')
  const clauses = [where('role', '==', 'instructor')]
  if (fallbackSchoolId) clauses.push(where('schoolId', '==', fallbackSchoolId))

  // Try to order by name; if the index is missing we'll retry without orderBy.
  try {
    const q = query(
      col,
      ...clauses,
      orderBy('name', 'asc'),
      limit(Math.max(1, Math.min(200, max)))
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => {
      const v = d.data() || {}
      return {
        id: d.id,
        name: v.name || v.displayName || v.email || 'Instructor',
        email: v.email || '',
      }
    })
  } catch (_e) {
    const q = query(col, ...clauses, limit(Math.max(1, Math.min(200, max))))
    const snap = await getDocs(q)
    // sort client-side as a fallback
    return snap.docs
      .map(d => {
        const v = d.data() || {}
        return {
          id: d.id,
          name: v.name || v.displayName || v.email || 'Instructor',
          email: v.email || '',
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }
}
