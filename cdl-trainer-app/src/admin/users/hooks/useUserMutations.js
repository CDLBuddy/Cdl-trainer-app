// Path: src/admin/dashboard/hooks/subhooks/useUserMutations.js
// ============================================================================
// useUserMutations
// - Create / Update / Remove users with optimistic UI
// - Syncs to Firestore: `users` + `userRoles` collections
// - Safe defaults, basic validation, helpful toasts, and rollbacks
// ============================================================================

import { useCallback } from 'react'
import {
  setDoc,
  deleteDoc,
  getDoc,
  doc as firestoreDoc,
} from 'firebase/firestore'
import { db } from '@utils/firebase.js'
import { useToast } from '@components/ToastContext.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * @param {{ schoolId:string, setUsers: React.Dispatch<React.SetStateAction<any[]>> }} params
 */
export function useUserMutations({ schoolId, setUsers }) {
  const { showToast } = useToast()

  /**
   * CREATE a user (optimistic add + Firestore write).
   * - Validates email
   * - Prevents accidental overwrite (checks if doc already exists)
   * - Writes both `users` and `userRoles`
   * - Adds to UI list immediately, rolls back on failure
   *
   * @param {{
   *   email: string,
   *   name?: string,
   *   role?: 'student'|'instructor'|'admin',
   *   assignedCompany?: string,
   *   assignedInstructor?: string,
   *   extra?: Record<string, any>,
   *   actor?: string,       // optional: who performed the action (for metadata)
   * }} input
   */
  const createUser = useCallback(
    async ({
      email,
      name = '',
      role = 'student',
      assignedCompany = '',
      assignedInstructor = '',
      extra = {},
      actor = 'admin',
    }) => {
      const normalizedEmail = String(email || '').trim().toLowerCase()
      if (!EMAIL_RE.test(normalizedEmail)) {
        showToast('Please provide a valid email.', 'error')
        return
      }
      if (!schoolId) {
        showToast('Missing schoolId; cannot create user.', 'error')
        return
      }

      const userRef = firestoreDoc(db, 'users', normalizedEmail)

      // Avoid overwriting an existing user
      try {
        const existing = await getDoc(userRef)
        if (existing.exists()) {
          showToast('A user with that email already exists.', 'error')
          return
        }
      } catch (err) {
        console.error('Failed checking existing user:', err)
        // Non-fatal; continue but we’ll still create optimistically below
      }

      const now = new Date().toISOString()
      const newUser = {
        // core
        email: normalizedEmail,
        name: name || 'User',
        role,
        schoolId,

        // assignments
        assignedCompany,
        assignedInstructor,

        // sensible defaults for dashboard fields
        profileProgress: 0,
        permitExpiry: '',
        medCardExpiry: '',
        paymentStatus: '',

        // metadata
        createdAt: now,
        createdBy: actor,
        updatedAt: now,
        updatedBy: actor,

        // any extras (e.g., phone, compliance, billing, etc.)
        ...extra,
      }

      // ---- Optimistic UI (prepend new user) ----
      let rolledBack = false
      setUsers(prev => [newUser, ...prev])

      try {
        // ---- Firestore writes ----
        await setDoc(userRef, newUser, { merge: true })
        await setDoc(
          firestoreDoc(db, 'userRoles', normalizedEmail),
          { role, schoolId },
          { merge: true }
        )

        showToast(`✅ User created: ${normalizedEmail}`, 'success')
      } catch (err) {
        console.error('createUser failed:', err)
        // ---- Rollback UI ----
        rolledBack = true
        setUsers(prev => prev.filter(u => u.email !== normalizedEmail))
        showToast('❌ Failed to create user.', 'error')
      }
    },
    [schoolId, setUsers, showToast]
  )

  /**
   * UPDATE a user (optimistic UI + Firestore write)
   */
  const updateUser = useCallback(
    async (email, changes) => {
      if (!email) return
      let snapshot = null

      try {
        // ---- Optimistic UI ----
        setUsers(prev => {
          const next = prev.map(u => {
            if (u.email === email) {
              snapshot = snapshot || { ...u } // keep original for rollback
              return { ...u, ...changes }
            }
            return u
          })
          return next
        })

        // ---- Firestore writes ----
        await setDoc(
          firestoreDoc(db, 'users', email),
          { ...changes, schoolId },
          { merge: true }
        )

        if (Object.prototype.hasOwnProperty.call(changes, 'role')) {
          await setDoc(
            firestoreDoc(db, 'userRoles', email),
            { role: changes.role, schoolId },
            { merge: true }
          )
        }

        showToast(`✅ Updated user: ${email}`, 'success')
      } catch (err) {
        console.error('updateUser failed:', err)
        // ---- Rollback ----
        if (snapshot) {
          setUsers(prev => prev.map(u => (u.email === email ? snapshot : u)))
        }
        showToast('❌ Failed to update user.', 'error')
      }
    },
    [schoolId, setUsers, showToast]
  )

  /**
   * REMOVE a user (with confirm + optimistic removal)
   */
  const removeUser = useCallback(
    async (email) => {
      if (!email) return
      const ok = window.confirm(
        `Remove user: ${email}?\n\nThis cannot be undone.`
      )
      if (!ok) return

      let snapshot = null

      try {
        // ---- Optimistic UI ----
        setUsers(prev => {
          snapshot = prev // keep full list for rollback
          return prev.filter(u => u.email !== email)
        })

        // ---- Firestore deletes ----
        await deleteDoc(firestoreDoc(db, 'users', email))
        await deleteDoc(firestoreDoc(db, 'userRoles', email))

        showToast(`🗑️ User ${email} removed`, 'success')
      } catch (err) {
        console.error('removeUser failed:', err)
        // ---- Rollback ----
        if (snapshot) setUsers(snapshot)
        showToast('❌ Failed to remove user.', 'error')
      }
    },
    [setUsers, showToast]
  )

  return { createUser, updateUser, removeUser }
}