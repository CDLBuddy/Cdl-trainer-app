// Path: src/admin/billing/components/Employer/EmployerTab.jsx
import React, { useMemo, useState, useCallback } from 'react'

import { useBillingDashboard } from '@admin/billing/hooks/public/index.js'

import { downloadCsv, formatCurrency, fmtDate } from '../../utils'

import EmployerFilters from './EmployerFilters.jsx'
import EmployerTable from './EmployerTable.jsx'

export default function EmployerTab() {
  // Read once (avoids re-reading localStorage every render)
  const schoolId = useMemo(() => localStorage.getItem('schoolId') || '', [])

  // Live data + actions (mock-backed until you flip billingApi)
  const { loading, employerInvoices, handleMarkInvoicePaid } =
    useBillingDashboard({ schoolId })

  // Local UI state
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all') // all|unpaid|partial|paid

  // Filtered view (search + status)
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return employerInvoices.filter(r => {
      const termOk =
        !term ||
        r.companyName?.toLowerCase().includes(term) ||
        (r.poNumber || '').toLowerCase().includes(term)
      const statusOk = status === 'all' || r.status === status
      return termOk && statusOk
    })
  }, [employerInvoices, search, status])

  // (Optional) quick metrics you can render near the filters if desired
  const counts = useMemo(() => {
    let unpaid = 0, partial = 0, paid = 0
    for (const r of employerInvoices) {
      if (r.status === 'unpaid') unpaid++
      else if (r.status === 'partial') partial++
      else if (r.status === 'paid') paid++
    }
    return { unpaid, partial, paid, total: employerInvoices.length }
  }, [employerInvoices])

  // Stable wrapper (prevents re-renders of table rows relying on referential equality)
  const onMarkPaid = useCallback(
    (id) => handleMarkInvoicePaid?.(id),
    [handleMarkInvoicePaid]
  )

  // CSV export
  const exportCsv = useCallback(() => {
    const headers = ['Company','PO Number','Amount','Issued','Due','Status','Contact']
    const lines = filtered.map(r => [
      r.companyName,
      r.poNumber || '',
      formatCurrency(r.amountCents),
      fmtDate(r.issuedAt),
      fmtDate(r.dueAt),
      r.status,
      r.contactEmail || ''
    ])
    downloadCsv('employer-invoices', headers, lines)
  }, [filtered])

  return (
    <section aria-label="Employer invoices">
      <EmployerFilters
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        onExportCSV={exportCsv}
      />

      {/* Optional tiny summary (safe to remove if you don’t want it) */}
      {employerInvoices.length > 0 && (
        <div style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 8px' }}>
          Showing <b>{filtered.length}</b> of <b>{counts.total}</b> invoices
          {status !== 'all' ? <> • status: <b>{status}</b></> : null}
          {search.trim() ? <> • search: <b>{search.trim()}</b></> : null}
        </div>
      )}

      <div className="dashboard-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '1rem' }}>
            <div className="spinner" aria-label="Loading employer invoices…" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '1rem', color: '#6b7280' }}>
            No invoices found{search || status !== 'all' ? ' for the current filters' : ''}.
          </div>
        ) : (
          <EmployerTable rows={filtered} onMarkPaid={onMarkPaid} />
        )}
      </div>

      <p style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>
        TODO: Attach invoices to companies in Firestore and surface PO / line items here.
      </p>
    </section>
  )
}