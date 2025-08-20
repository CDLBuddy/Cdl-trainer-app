// Path: src/admin/billing/hooks/internal/useEmployerBilling.js
// ============================================================================
// Admin • Billing • Employer hook (pure React)
// - Loads invoices (mocks if USE_BILLING_MOCKS=true)
// - Client-side search + status filter
// - CSV export helper
// - Extras: countsByStatus, totalAmount, resetFilters
// - Uses internal services only; expose a public summary via hooks/public/*
// ============================================================================

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  USE_BILLING_MOCKS,
  mockEmployerInvoices,
  fetchEmployerInvoices,
  markEmployerInvoicePaid,
} from '../../services'
import { downloadCsv, formatCurrency, fmtDate } from '../../utils'

/** @typedef {'unpaid'|'partial'|'paid'} InvoiceStatus */
/**
 * @typedef {Object} EmployerInvoice
 * @property {string} id
 * @property {string} companyName
 * @property {string=} poNumber
 * @property {number} amountCents
 * @property {string} issuedAt   // YYYY-MM-DD
 * @property {string} dueAt      // YYYY-MM-DD
 * @property {InvoiceStatus} status
 * @property {string=} contactEmail
 */

/**
 * Hook for Employer billing tab.
 * @param {{ schoolId?: string, showToast?: (msg:string, tone?:
 *   'success'|'error'|'info'|'warning') => void }} params
 */
export default function useEmployerBilling({ schoolId, showToast = () => {} } = {}) {
  const [loading, setLoading] = useState(true)
  /** @type {[EmployerInvoice[], (rows:EmployerInvoice[])=>void]} */
  const [rows, setRows] = useState(() => (USE_BILLING_MOCKS ? mockEmployerInvoices() : []))
  const [search, setSearch] = useState('')
  /** @type {[('all'|InvoiceStatus), (v:'all'|InvoiceStatus)=>void]} */
  const [status, setStatus] = useState('all') // all|unpaid|partial|paid

  // Load (mocks or Firestore)
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const data = USE_BILLING_MOCKS
          ? mockEmployerInvoices()
          : await fetchEmployerInvoices({ schoolId })
        if (alive) setRows(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('[useEmployerBilling] load failed', err)
        showToast('Failed to load employer invoices.', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [schoolId, showToast])

  // Derived: filtered list
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(r => {
      const termOk =
        !term ||
        r.companyName.toLowerCase().includes(term) ||
        String(r.poNumber || '').toLowerCase().includes(term)
      const statusOk = status === 'all' || r.status === status
      return termOk && statusOk
    })
  }, [rows, search, status])

  // Derived: handy stats (non-breaking extras)
  const countsByStatus = useMemo(() => {
    /** @type {Record<InvoiceStatus, number>} */
    const counts = { unpaid: 0, partial: 0, paid: 0 }
    for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1
    return counts
  }, [rows])

  const totalAmount = useMemo(
    () =>
      filtered.reduce(
        (sum, r) => sum + (Number.isFinite(r.amountCents) ? r.amountCents : 0),
        0
      ),
    [filtered]
  )

  // Actions
  const markPaid = useCallback(
    async id => {
      try {
        // Optimistic update
        setRows(prev => prev.map(r => (r.id === id ? { ...r, status: 'paid' } : r)))
        showToast('Invoice marked as paid.', 'success')
        if (!USE_BILLING_MOCKS) {
          await markEmployerInvoicePaid({ invoiceId: id, schoolId })
        }
      } catch (err) {
        console.error('[useEmployerBilling] markPaid failed', err)
        showToast('Failed to mark invoice as paid.', 'error')
      }
    },
    [schoolId, showToast]
  )

  const exportCsv = useCallback(() => {
    const headers = ['Company', 'PO Number', 'Amount', 'Issued', 'Due', 'Status', 'Contact']
    const lines = filtered.map(r => [
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
    // required by existing callers
    loading,
    filtered,
    search,
    setSearch,
    status,
    setStatus,
    markPaid,
    exportCsv,

    // extras
    countsByStatus,
    totalAmount, // cents (number)
    resetFilters,
  }
}