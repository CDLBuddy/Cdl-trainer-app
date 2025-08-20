// Path: src/admin/billing/hooks/internal/useIndividualBilling.js
// ============================================================================
// Admin • Billing • Individual hook (pure React)
// - Loads payments (mocks if USE_BILLING_MOCKS=true)
// - Client-side search + status + "only unreconciled" filter
// - CSV export helper
// - Extras: countsByStatus, reconciledCount, unreconciledCount, resetFilters
// - Uses internal services only; expose any public summary via hooks/public/*
// ============================================================================

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  USE_BILLING_MOCKS,
  mockIndividualPayments,
  fetchIndividualPayments,
  setPaymentReconciled,
} from '../../services'
import { downloadCsv } from '../../utils'

/** @typedef {'pending'|'partial'|'paid'|'waived'} PaymentStatus */
/**
 * @typedef {Object} IndividualPayment
 * @property {string} id
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
 * @param {{
 *   schoolId?: string,
 *   showToast?: (msg:string, tone?:
 *     'success'|'error'|'info'|'warning') => void
 * }} params
 */
export default function useIndividualBilling({ schoolId, showToast = () => {} } = {}) {
  const [loading, setLoading] = useState(true)
  /** @type {[IndividualPayment[], (rows:IndividualPayment[])=>void]} */
  const [rows, setRows] = useState(() => (USE_BILLING_MOCKS ? mockIndividualPayments() : []))
  const [search, setSearch] = useState('')
  /** @type {[('all'|PaymentStatus), (v:'all'|PaymentStatus)=>void]} */
  const [status, setStatus] = useState('all') // all|pending|partial|paid|waived
  const [onlyUnreconciled, setOnlyUnreconciled] = useState(false)

  // Load (mocks or Firestore)
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const data = USE_BILLING_MOCKS
          ? mockIndividualPayments()
          : await fetchIndividualPayments({ schoolId })
        if (alive) setRows(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('[useIndividualBilling] load failed', err)
        showToast('Failed to load individual payments.', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [schoolId, showToast])

  // Derived: filtered + stable sort (status asc, then name/email)
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const out = rows.filter(r => {
      const termOk =
        !term ||
        String(r.name || '').toLowerCase().includes(term) ||
        String(r.email || '').toLowerCase().includes(term) ||
        String(r.course || '').toLowerCase().includes(term)
      const statusOk = status === 'all' || r.paymentStatus === status
      const recOk = !onlyUnreconciled || !r.reconciled
      return termOk && statusOk && recOk
    })
    out.sort(
      (a, b) =>
        String(a.paymentStatus).localeCompare(String(b.paymentStatus)) ||
        String(a.name || a.email).localeCompare(String(b.name || b.email))
    )
    return out
  }, [rows, search, status, onlyUnreconciled])

  // Derived: handy stats
  const countsByStatus = useMemo(() => {
    /** @type {Record<PaymentStatus, number>} */
    const counts = { pending: 0, partial: 0, paid: 0, waived: 0 }
    for (const r of rows) counts[r.paymentStatus] = (counts[r.paymentStatus] || 0) + 1
    return counts
  }, [rows])

  const reconciledCount = useMemo(
    () => rows.reduce((n, r) => n + (r.reconciled ? 1 : 0), 0),
    [rows]
  )
  const unreconciledCount = useMemo(() => rows.length - reconciledCount, [rows.length, reconciledCount])

  // Actions
  const toggleReconciled = useCallback(
    async (idOrEmail) => {
      // Resolve target row by id (preferred) or fallback to email
      const findIndex = (arr) => {
        let idx = arr.findIndex(r => r.id === idOrEmail)
        if (idx === -1) idx = arr.findIndex(r => r.email === idOrEmail)
        return idx
      }

      setRows(prev => {
        const next = [...prev]
        const idx = findIndex(next)
        if (idx !== -1) next[idx] = { ...next[idx], reconciled: !next[idx].reconciled }
        return next
      })
      showToast('Reconciliation updated.', 'success')

      if (!USE_BILLING_MOCKS) {
        try {
          const current = rows[findIndex(rows)]
          if (current) {
            await setPaymentReconciled({ paymentId: current.id, next: !current.reconciled, schoolId })
          }
        } catch (err) {
          console.error('[useIndividualBilling] toggleReconciled failed', err)
          showToast('Failed to update reconciliation.', 'error')
        }
      }
    },
    [rows, schoolId, showToast]
  )

  const exportCsv = useCallback(() => {
    const headers = ['Name', 'Email', 'Course', 'Class', 'Payment Status', 'Reconciled', 'Receipt']
    const lines = filtered.map(r => [
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