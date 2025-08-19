// Path: src/admin/billing/components/Individual/IndividualTab.jsx
import React, { useMemo, useState, useCallback } from 'react'
import IndividualFilters from './IndividualFilters.jsx'
import IndividualTable from './IndividualTable.jsx'
import { useBillingDashboard } from '@/admin/dashboard/hooks'
import { downloadCsv } from '../../utils'

export default function IndividualTab() {
  // Read once (avoid re-reading LS each render)
  const schoolId = useMemo(() => localStorage.getItem('schoolId') || '', [])

  // Live data + actions
  const { loading, individualPayments, handleToggleReconciled } =
    useBillingDashboard({ schoolId })

  // Local UI state
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all') // all|pending|partial|paid|waived
  const [onlyUnreconciled, setOnlyUnreconciled] = useState(false)

  // Derived filtering
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return individualPayments.filter(r => {
      const termOk =
        !term ||
        (r.name || '').toLowerCase().includes(term) ||
        (r.email || '').toLowerCase().includes(term) ||
        (r.course || '').toLowerCase().includes(term)
      const statusOk = status === 'all' || r.paymentStatus === status
      const recOk = !onlyUnreconciled || !r.reconciled
      return termOk && statusOk && recOk
    })
  }, [individualPayments, search, status, onlyUnreconciled])

  // Quick counts (optional)
  const counts = useMemo(() => {
    let pending = 0, partial = 0, paid = 0, waived = 0, unreconciled = 0
    for (const r of individualPayments) {
      if (r.paymentStatus === 'pending') pending++
      else if (r.paymentStatus === 'partial') partial++
      else if (r.paymentStatus === 'paid') paid++
      else if (r.paymentStatus === 'waived') waived++
      if (!r.reconciled) unreconciled++
    }
    return { pending, partial, paid, waived, unreconciled, total: individualPayments.length }
  }, [individualPayments])

  // CSV export
  const exportCsv = useCallback(() => {
    const headers = [
      'Name',
      'Email',
      'Course',
      'Class',
      'Payment Status',
      'Reconciled',
      'Receipt',
    ]
    const lines = filtered.map(r => [
      r.name || '',
      r.email,
      r.course || '',
      r.cdlClass || '',
      r.paymentStatus,
      r.reconciled ? 'yes' : 'no',
      r.paymentProofUrl || '',
    ])
    downloadCsv('individual-payments', headers, lines)
  }, [filtered])

  // Reconciliation toggle
  const onToggleReconciled = useCallback(
    email => {
      const row = filtered.find(r => r.email === email)
      if (!row) return
      handleToggleReconciled(email, !row.reconciled)
    },
    [filtered, handleToggleReconciled]
  )

  return (
    <section aria-label="Individual payments">
      <IndividualFilters
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        onlyUnreconciled={onlyUnreconciled}
        setOnlyUnreconciled={setOnlyUnreconciled}
        onExportCSV={exportCsv}
      />

      {/* Optional summary */}
      {individualPayments.length > 0 && (
        <div style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 8px' }}>
          Showing <b>{filtered.length}</b> of <b>{counts.total}</b> records
          {status !== 'all' && <> • status: <b>{status}</b></>}
          {onlyUnreconciled && <> • unreconciled only</>}
          {search.trim() && <> • search: <b>{search.trim()}</b></>}
        </div>
      )}

      <div className="dashboard-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '1rem' }}>
            <div className="spinner" aria-label="Loading individual payments…" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '1rem', color: '#6b7280' }}>
            No students found{search || status !== 'all' || onlyUnreconciled ? ' for the current filters' : ''}.
          </div>
        ) : (
          <IndividualTable rows={filtered} onToggleReconciled={onToggleReconciled} />
        )}
      </div>

      <p style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>
        TODO: Persist reconciliation flag to Firestore and add reviewed-by/at metadata.
      </p>
    </section>
  )
}