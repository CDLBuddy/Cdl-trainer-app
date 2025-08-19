// Path: src/admin/billing/hooks/useEmployerBilling.js
// ============================================================================
// Admin • Billing • Employer hook (pure React)
// - Loads invoices (mock for now)
// - Client-side search + status filter
// - CSV export helper
// - Non-breaking extras: countsByStatus, totalAmount, resetFilters
// ============================================================================

import { useEffect, useMemo, useState, useCallback } from 'react'
import { fetchEmployerInvoicesMock } from '../services'
import { downloadCsv, formatCurrency, fmtDate } from '../utils'

/** @typedef {'unpaid'|'partial'|'paid'} InvoiceStatus */
/**
 * @typedef {Object} EmployerInvoice
 * @property {string} id
 * @property {string} companyName
 * @property {string=} poNumber
 * @property {number} amountCents
 * @property {any} issuedAt
 * @property {any} dueAt
 * @property {InvoiceStatus} status
 * @property {string=} contactEmail
 */

/**
 * Hook for Employer billing tab.
 * @param {{ showToast: (msg:string, tone?:
 *   'success'|'error'|'info'|'warning') => void }} params
 */
export function useEmployerBilling({ showToast }) {
  const [loading, setLoading] = useState(true)
  /** @type {[EmployerInvoice[], Function]} */
  const [rows, setRows] = useState(() => fetchEmployerInvoicesMock())
  const [search, setSearch] = useState('')
  /** @type {[('all'|InvoiceStatus), Function]} */
  const [status, setStatus] = useState('all') // all|unpaid|partial|paid

  // Load (mock) — TODO: swap to Firestore
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const data = fetchEmployerInvoicesMock()
        if (alive) setRows(data)
      } catch {
        showToast('Failed to load employer invoices.', 'error')
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
        r.companyName.toLowerCase().includes(term) ||
        (r.poNumber || '').toLowerCase().includes(term)
      const statusOk = status === 'all' || r.status === status
      return termOk && statusOk
    })
  }, [rows, search, status])

  // Derived: handy stats (non-breaking extras)
  const countsByStatus = useMemo(() => {
    /** @type {Record<InvoiceStatus, number>} */
    const counts = { unpaid: 0, partial: 0, paid: 0 }
    for (const r of rows) counts[r.status]++
    return counts
  }, [rows])

  const totalAmount = useMemo(
    () => filtered.reduce((sum, r) => sum + (Number.isFinite(r.amountCents) ? r.amountCents : 0), 0),
    [filtered]
  )

  // Actions
  const markPaid = useCallback(
    (id) => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'paid' } : r)))
      showToast('Invoice marked as paid.', 'success')
    },
    [showToast]
  )

  const exportCsv = useCallback(() => {
    const headers = ['Company', 'PO Number', 'Amount', 'Issued', 'Due', 'Status', 'Contact']
    const lines = filtered.map((r) => [
      r.companyName,
      r.poNumber || '',
      formatCurrency(r.amountCents),
      fmtDate(r.issuedAt),
      fmtDate(r.dueAt),
      r.status,
      r.contactEmail || '',
    ])
    downloadCsv('employer-invoices', headers, lines)
  }, [filtered])

  const resetFilters = useCallback(() => {
    setSearch('')
    setStatus('all')
  }, [])

  return {
    // required by existing callers (backwards compatible)
    loading,
    filtered,
    search,
    setSearch,
    status,
    setStatus,
    markPaid,
    exportCsv,

    // nice-to-haves (safe additions)
    countsByStatus,
    totalAmount,     // in cents (number)
    resetFilters,
  }
}