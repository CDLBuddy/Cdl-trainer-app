// ============================================================================
// Admin • Billing • Employer hook (pure React, loop-safe)
// - Loads invoices (mocks if USE_BILLING_MOCKS=true)
// - Client-side search + status filter
// - CSV export helper
// - Extras: countsByStatus, totalAmount, resetFilters, refresh
// - Avoids re-render loops: no effects depending on unstable callbacks
// ============================================================================

// @ts-check

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  fetchEmployerInvoices,
  markEmployerInvoicePaid,
  mockEmployerInvoices,
  USE_BILLING_MOCKS,
} from '../../services'
import { downloadCsv, fmtDate, formatCurrency } from '../../utils'

/** @typedef {'unpaid'|'partial'|'paid'|'void'} InvoiceStatus */
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
 * @param {{ schoolId?: string, showToast?: (msg:string, tone?: 'success'|'error'|'info'|'warning') => void }} [params]
 */
export default function useEmployerBilling({ schoolId, showToast } = {}) {
  const [loading, setLoading] = useState(false)
  // 👇 Type the initializer instead of the tuple
  const [rows, setRows] = useState(
    /** @type {EmployerInvoice[]} */ (
      USE_BILLING_MOCKS ? mockEmployerInvoices() : []
    )
  )
  const [search, setSearch] = useState('')
  /** @type {[('all'|InvoiceStatus), React.Dispatch<React.SetStateAction<'all'|InvoiceStatus>>]} */
  const [status, setStatus] = useState(
    /** @type {'all'|InvoiceStatus} */ ('all')
  ) // all|unpaid|partial|paid|void

  // Local error state must exist before we reference setError in refresh()
  const [error, setError] = useState(/** @type {Error|null} */ (null))

  // Keep showToast stable via ref so effects don't depend on it
  const toastRef = useRef(showToast)
  useEffect(() => {
    toastRef.current = showToast
  }, [showToast])

  // Fetch control (abort + stale guard)
  const reqIdRef = useRef(0)

  const refresh = useCallback(async () => {
    // No scope and not in mocks → present empty dataset, do not hammer services
    if (!schoolId && !USE_BILLING_MOCKS) {
      setRows([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const id = ++reqIdRef.current
    const ctrl = new AbortController()

    try {
      const data = USE_BILLING_MOCKS
        ? mockEmployerInvoices()
        : await fetchEmployerInvoices({ schoolId, signal: ctrl.signal })

      // ignore stale responses
      if (id !== reqIdRef.current) return

      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      if (/** @type {any} */ (err)?.name === 'AbortError') return
      console.error('[useEmployerBilling] load failed', err)
      toastRef.current?.('Failed to load employer invoices.', 'error')
      if (id === reqIdRef.current) setRows([])
      setError(
        err instanceof Error
          ? err
          : new Error('Failed to load employer invoices')
      )
    } finally {
      if (id === reqIdRef.current) setLoading(false)
    }

    return () => ctrl.abort()
    // NOTE: depend ONLY on schoolId so this effect isn't retriggered by unstable callbacks
  }, [schoolId])

  // Initial & scope-change load
  useEffect(() => {
    let cancelled = false
    const reqAtMount = reqIdRef.current
    ;(async () => {
      await refresh()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
      // Invalidate any in-flight response
      reqIdRef.current = reqAtMount + 1
    }
  }, [refresh])

  // Derived: filtered list (NO setState here)
  const filtered = useMemo(() => {
    /** @type {EmployerInvoice[]} */
    let out = rows

    const term = search.trim().toLowerCase()
    if (term) {
      out = out.filter(
        r =>
          (r.companyName || '').toLowerCase().includes(term) ||
          String(r.poNumber || '')
            .toLowerCase()
            .includes(term) ||
          (r.id || '').toLowerCase().includes(term)
      )
    }

    if (status !== 'all') {
      out = out.filter(
        r =>
          r.status === status || (status === 'unpaid' && r.status === 'partial')
      )
    }

    // Default newest first by issuedAt (fallback to id)
    out = [...out].sort((a, b) => {
      const ad = new Date(a.issuedAt || 0).getTime()
      const bd = new Date(b.issuedAt || 0).getTime()
      if (ad !== bd) return bd - ad
      return String(b.id).localeCompare(String(a.id))
    })

    return out
  }, [rows, search, status])

  // Derived: handy stats
  const countsByStatus = useMemo(() => {
    /** @type {Record<InvoiceStatus, number>} */
    const counts = { unpaid: 0, partial: 0, paid: 0, void: 0 }
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
        setRows(prev =>
          prev.map(r => (r.id === id ? { ...r, status: 'paid' } : r))
        )
        toastRef.current?.('Invoice marked as paid.', 'success')
        if (!USE_BILLING_MOCKS) {
          await markEmployerInvoicePaid({ invoiceId: id, schoolId })
        }
      } catch (err) {
        console.error('[useEmployerBilling] markPaid failed', err)
        toastRef.current?.('Failed to mark invoice as paid.', 'error')
        // Best-effort revert: re-fetch
        refresh().catch(() => {})
      }
    },
    [schoolId, refresh]
  )

  const exportCsv = useCallback(() => {
    const headers = [
      'Company',
      'PO Number',
      'Amount',
      'Issued',
      'Due',
      'Status',
      'Contact',
    ]
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
    totalAmount, // cents
    resetFilters,
    error,
    refresh,
    all: rows, // raw list (if needed)
  }
}
