// Path: src/admin/companies/hooks/useCompanyNotes.js
// ======================================================================
// useCompanyNotes (admin)
// - Lightweight local notes manager (optimistic add)
// - Swap internals to Firestore later (centralized here)
// - SSR-safe, resilient to unmounts, pro-level polish
// ======================================================================

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * @typedef {{ id:string, text:string, author:string, createdAtLabel:string }} Note
 *
 * @typedef {Object} UseCompanyNotesReturn
 * @property {Note[]} notes
 * @property {boolean} loading
 * @property {string} error
 * @property {()=>Promise<void>} refresh
 * @property {(text:string)=>Promise<void>} add
 */

export default function useCompanyNotes(companyId) {
  const [notes, setNotes] = useState(/** @type {Note[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const aliveRef = useRef(true)

  // ----------------------------- I/O ------------------------------
  const refresh = useCallback(async () => {
    if (!companyId) {
      setNotes([])
      setError('')
      return
    }
    setLoading(true)
    setError('')
    try {
      // TODO: Replace with Firestore fetch
      await new Promise(r => setTimeout(r, 150))
      if (!aliveRef.current) return
      setNotes([]) // placeholder: return [] until Firestore implemented
    } catch (err) {
      console.error('[useCompanyNotes] load failed', err)
      if (!aliveRef.current) return
      setError('Failed to load notes.')
      setNotes([])
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    aliveRef.current = true
    refresh()
    return () => {
      aliveRef.current = false
    }
  }, [refresh])

  // Optimistic add (rollback on error later if needed)
  const add = useCallback(async text => {
    if (!text?.trim()) return
    const optimistic = {
      id: Math.random().toString(36).slice(2),
      text: text.trim(),
      author: 'Admin',
      createdAtLabel: new Date().toLocaleString(),
    }
    setNotes(prev => [optimistic, ...prev])
    try {
      // TODO: Firestore write
      await new Promise(r => setTimeout(r, 180))
    } catch (err) {
      console.error('[useCompanyNotes] add failed', err)
      setError('Failed to add note.')
      // Rollback: remove optimistic note
      setNotes(prev => prev.filter(n => n.id !== optimistic.id))
    }
  }, [])

  return { notes, loading, error, refresh, add }
}
