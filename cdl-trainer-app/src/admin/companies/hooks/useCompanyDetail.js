// Path: src/admin/companies/hooks/useCompanyDetail.js
// ======================================================================
// useCompanyDetail (admin)
// - Minimal, SSR-safe detail loader for a single company
// - Exposes refresh + error states + derived stats
// - Designed to be composable with roster / assignments hooks
// ======================================================================

import { doc, getDoc } from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { db } from '@utils/firebase.js'

/**
 * @typedef {Object} CompanyStats
 * @property {number} activeStudents
 * @property {number} openEnrollments
 * @property {string} lastActivityLabel
 *
 * @typedef {Object} UseCompanyDetailReturn
 * @property {Object|null} company
 * @property {CompanyStats} stats
 * @property {boolean} loading
 * @property {string} error
 * @property {()=>Promise<void>} refresh
 */

/**
 * useCompanyDetail
 * @param {string|null|undefined} companyId
 * @returns {UseCompanyDetailReturn}
 */
export default function useCompanyDetail(companyId) {
  const [company, setCompany] = useState(/** @type {Object|null} */ (null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // --------------------------------------------------------------------
  // Fetch / refresh
  // --------------------------------------------------------------------
  const refresh = useCallback(async () => {
    if (!companyId) {
      setCompany(null)
      return
    }

    setLoading(true)
    setError('')
    try {
      const snap = await getDoc(doc(db, 'companies', String(companyId)))
      setCompany(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    } catch (err) {
      console.error('[useCompanyDetail] Failed to load', err)
      setError('Failed to load company.')
      setCompany(null)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // --------------------------------------------------------------------
  // Derived stats (safe defaults, overrideable later)
  // --------------------------------------------------------------------
  const stats = useMemo(
    () => ({
      activeStudents: company?.stats?.activeStudents ?? 0,
      openEnrollments: company?.stats?.openEnrollments ?? 0,
      lastActivityLabel: company?.stats?.lastActivityLabel ?? '',
    }),
    [company]
  )

  return { company, stats, loading, error, refresh }
}
