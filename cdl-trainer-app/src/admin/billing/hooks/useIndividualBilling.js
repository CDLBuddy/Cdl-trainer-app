// Path: src/admin/billing/hooks/useIndividualBilling.js
// ============================================================================
// Admin • Billing • Individual hook (pure React)
// - Loads payments (mock for now)
// - Client-side search + status + "only unreconciled" filter
// - CSV export helper
// - Non-breaking extras: countsByStatus, reconciledCount, unreconciledCount, resetFilters
// ============================================================================

import { useEffect, useMemo, useState, useCallback } from 'react'
import { fetchIndividualPaymentsMock } from '../services'
import { downloadCsv } from '../utils'

/** @typedef {'pending'|'partial'|'paid'|'waived'} PaymentStatus */
/**
 * @typedef {Object} IndividualPayment
 * @property {string} email
 * @property {string=} name
 * @property {string=} course
 * @property {string=} cdlClass
 * @property {PaymentStatus} paymentStatus
 * @property {string=} paymentProofUrl
 * @property {boolean} reconciled
 */

/**
 * Hook for Individual billing tab.
 * @param {{ showToast: (msg:string, tone?:
 *   'success'|'error'|'info'|'warning') => void }} params
 */
export function useIndividualBilling({ showToast }) {
  const [loading, setLoading] = useState(true)
  /** @type {[IndividualPayment[], Function]} */
  const [rows, setRows] = useState(() => fetchIndividualPaymentsMock())
  const [search, setSearch] = useState('')
  /** @type {[('all'|PaymentStatus), Function]} */
  const [status, setStatus] = useState('all') // all|pending|partial|paid|waived
  const [onlyUnreconciled, setOnlyUnreconciled] = useState(false)

  // Load (mock) — TODO: swap to Firestore
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const data = fetchIndividualPaymentsMock()
        if (alive) setRows(data)
      } catch {
        showToast('Failed to load individual payments.', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [showToast])

  // Derived: filtered list
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((r) => {
      const termOk =
        !term ||
        (r.name || '').toLowerCase().includes(term) ||
        (r.email || '').toLowerCase().includes(term) ||
        (r.course || '').toLowerCase().includes(term)
      const statusOk = status === 'all' || r.paymentStatus === status
      const recOk = !onlyUnreconciled || !r.reconciled
      return termOk && statusOk && recOk
    })
  }, [rows, search, status, onlyUnreconciled])

  // Derived: handy stats (non-breaking extras)
  const countsByStatus = useMemo(() => {
    /** @type {Record<PaymentStatus, number>} */
    const counts = { pending: 0, partial: 0, paid: 0, waived: 0 }
    for (const r of rows) counts[r.paymentStatus]++
    return counts
  }, [rows])

  const reconciledCount = useMemo(
    () => rows.reduce((n, r) => n + (r.reconciled ? 1 : 0), 0),
    [rows]
  )
  const unreconciledCount = useMemo(() => rows.length - reconciledCount, [rows.length, reconciledCount])

  // Actions
  const toggleReconciled = useCallback(
    (email) => {
      setRows((prev) =>
        prev.map((r) => (r.email === email ? { ...r, reconciled: !r.reconciled } : r))
      )
      showToast('Reconciliation updated.', 'success')
    },
    [showToast]
  )

  const exportCsv = useCallback(() => {
    const headers = ['Name', 'Email', 'Course', 'Class', 'Payment Status', 'Reconciled', 'Receipt']
    const lines = filtered.map((r) => [
      r.name || '',
      r.email,
      r.course || '',
      r.cdlClass || '',
      r.paymentStatus,
      r.reconciled ? 'yes' : 'no',
      r.paymentProofUrl ? r.paymentProofUrl : '',
    ])
    downloadCsv('individual-payments', headers, lines)
  }, [filtered])

  const resetFilters = useCallback(() => {
    setSearch('')
    setStatus('all')
    setOnlyUnreconciled(false)
  }, [])

  return {
    // required by existing callers (backwards compatible)
    loading,
    filtered,
    search,
    setSearch,
    status,
    setStatus,
    onlyUnreconciled,
    setOnlyUnreconciled,
    toggleReconciled,
    exportCsv,

    // nice-to-haves (safe additions)
    countsByStatus,
    reconciledCount,
    unreconciledCount,
    resetFilters,
  }
}