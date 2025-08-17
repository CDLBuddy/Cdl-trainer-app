// src/admin/billing/Billing.jsx
// ======================================================================
// Admin • Billing
// - Two tabs: Employer (company invoices) / Individual (student payments)
// - Search, status filters, CSV export, and local "reconcile/mark paid" UX
// - Clean, accessible tables with minimal inline styling (no new deps)
// - Firestore wiring marked with TODOs (mock data provided for now)
// ======================================================================

import React, { useEffect, useMemo, useState } from 'react'

import Shell from '@components/Shell.jsx'
import { useToast } from '@components/ToastContext.js'

/** @typedef {'unpaid'|'partial'|'paid'} InvoiceStatus */
/** @typedef {'pending'|'partial'|'paid'|'waived'} PaymentStatus */

export default function Billing() {
  const [tab, setTab] = useState('employer') // 'employer' | 'individual'
  return (
    <Shell title="Billing">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className={`btn ${tab === 'employer' ? '' : 'outline'}`}
          onClick={() => setTab('employer')}
          aria-pressed={tab === 'employer'}
        >
          Employer
        </button>
        <button
          className={`btn ${tab === 'individual' ? '' : 'outline'}`}
          onClick={() => setTab('individual')}
          aria-pressed={tab === 'individual'}
        >
          Individual
        </button>
      </div>

      {tab === 'employer' ? <EmployerTab /> : <IndividualTab />}
    </Shell>
  )
}

/* ------------------------------------------------------------------ */
/* Employer Tab                                                       */
/* ------------------------------------------------------------------ */

function EmployerTab() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState(() => mockEmployerInvoices())
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all') // all|unpaid|partial|paid

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        // TODO: Replace with Firestore query (group invoices by company).
        // const data = await fetchEmployerInvoices()
        const data = mockEmployerInvoices()
        if (!alive) return
        setRows(data)
      } catch {
        showToast('Failed to load employer invoices.', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [showToast])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(r => {
      const termOk = !term ||
        r.companyName.toLowerCase().includes(term) ||
        (r.poNumber || '').toLowerCase().includes(term)
      const statusOk = status === 'all' || r.status === status
      return termOk && statusOk
    })
  }, [rows, search, status])

  const markPaid = (id) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: 'paid' } : r))
    showToast('Invoice marked as paid.', 'success')
  }

  const exportCsv = () => {
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
  }

  return (
    <section aria-label="Employer Invoices">
      <header style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company or PO…"
          aria-label="Search employer invoices"
          style={{ padding: '6px 10px', border: '1px solid #dcdde2', borderRadius: 8, minWidth: 220 }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          style={{ padding: '6px 10px', border: '1px solid #dcdde2', borderRadius: 8 }}
        >
          <option value="all">All statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn outline" onClick={exportCsv}>Export CSV</button>
      </header>

      <div className="dashboard-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '1rem' }}>
            <div className="spinner" aria-label="Loading employer invoices…" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '1rem', color: '#6b7280' }}>No invoices found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: 860 }}>
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">PO #</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Issued</th>
                  <th scope="col">Due</th>
                  <th scope="col">Status</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>{r.companyName}</td>
                    <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                      {r.poNumber || '—'}
                    </td>
                    <td>{formatCurrency(r.amountCents)}</td>
                    <td>{fmtDate(r.issuedAt)}</td>
                    <td>{fmtDate(r.dueAt)}</td>
                    <td>
                      <StatusPill value={r.status} />
                    </td>
                    <td>{r.contactEmail || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn small"
                        disabled={r.status === 'paid'}
                        onClick={() => markPaid(r.id)}
                      >
                        Mark Paid
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>
        TODO: Attach invoices to companies in Firestore and surface PO / line items here.
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Individual Tab                                                     */
/* ------------------------------------------------------------------ */

function IndividualTab() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState(() => mockIndividualPayments())
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all') // all|pending|partial|paid|waived
  const [onlyUnreconciled, setOnlyUnreconciled] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        // TODO: Replace with Firestore query for students where billing.mode==='individual'
        // const data = await fetchIndividualPayments()
        const data = mockIndividualPayments()
        if (!alive) return
        setRows(data)
      } catch {
        showToast('Failed to load individual payments.', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [showToast])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(r => {
      const termOk = !term ||
        (r.name || '').toLowerCase().includes(term) ||
        (r.email || '').toLowerCase().includes(term) ||
        (r.course || '').toLowerCase().includes(term)
      const statusOk = status === 'all' || r.paymentStatus === status
      const recOk = !onlyUnreconciled || !r.reconciled
      return termOk && statusOk && recOk
    })
  }, [rows, search, status, onlyUnreconciled])

  const toggleReconciled = (email) => {
    setRows(prev => prev.map(r => r.email === email ? { ...r, reconciled: !r.reconciled } : r))
    showToast('Reconciliation updated.', 'success')
  }

  const exportCsv = () => {
    const headers = ['Name','Email','Course','Class','Payment Status','Reconciled','Receipt']
    const lines = filtered.map(r => [
      r.name || '',
      r.email,
      r.course || '',
      r.cdlClass || '',
      r.paymentStatus,
      r.reconciled ? 'yes' : 'no',
      r.paymentProofUrl ? r.paymentProofUrl : ''
    ])
    downloadCsv('individual-payments', headers, lines)
  }

  return (
    <section aria-label="Individual Payments">
      <header style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students…"
          aria-label="Search individual payments"
          style={{ padding: '6px 10px', border: '1px solid #dcdde2', borderRadius: 8, minWidth: 220 }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by payment status"
          style={{ padding: '6px 10px', border: '1px solid #dcdde2', borderRadius: 8 }}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="waived">Waived</option>
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
          <input
            type="checkbox"
            checked={onlyUnreconciled}
            onChange={(e) => setOnlyUnreconciled(e.target.checked)}
          />
          <span>Only unreconciled</span>
        </label>
        <div style={{ flex: 1 }} />
        <button className="btn outline" onClick={exportCsv}>Export CSV</button>
      </header>

      <div className="dashboard-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '1rem' }}>
            <div className="spinner" aria-label="Loading individual payments…" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '1rem', color: '#6b7280' }}>No students found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: 960 }}>
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Email</th>
                  <th scope="col">Course</th>
                  <th scope="col">Class</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Receipt</th>
                  <th scope="col">Reconciled</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.email}>
                    <td>{r.name || '—'}</td>
                    <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.email}</td>
                    <td>{r.course || '—'}</td>
                    <td>{r.cdlClass || '—'}</td>
                    <td><StatusPill value={r.paymentStatus} individual /></td>
                    <td>
                      {r.paymentProofUrl ? (
                        <a href={r.paymentProofUrl} target="_blank" rel="noreferrer">View</a>
                      ) : '—'}
                    </td>
                    <td>{r.reconciled ? 'Yes' : 'No'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn small" onClick={() => toggleReconciled(r.email)}>
                        {r.reconciled ? 'Unreconcile' : 'Mark Reconciled'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>
        TODO: Persist reconciliation flag to Firestore and add reviewed-by/at metadata.
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Shared UI bits                                                     */
/* ------------------------------------------------------------------ */

function StatusPill({ value, individual = false }) {
  const val = String(value || '').toLowerCase()
  let bg = '#e5e7eb', fg = '#374151'
  const label = val || '—'
  if (individual) {
    if (val === 'paid')   { bg = '#dcfce7'; fg = '#166534' }
    if (val === 'partial'){ bg = '#fffbeb'; fg = '#92400e' }
    if (val === 'pending'){ bg = '#fee2e2'; fg = '#991b1b' }
    if (val === 'waived') { bg = '#e0e7ff'; fg = '#3730a3' }
  } else {
    if (val === 'paid')   { bg = '#dcfce7'; fg = '#166534' }
    if (val === 'partial'){ bg = '#fffbeb'; fg = '#92400e' }
    if (val === 'unpaid') { bg = '#fee2e2'; fg = '#991b1b' }
  }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      background: bg,
      color: fg,
      fontSize: 12,
      textTransform: 'capitalize',
    }}>
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */

function formatCurrency(cents) {
  const n = Number.isFinite(cents) ? cents : 0
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n / 100)
}

function fmtDate(val) {
  if (!val) return '—'
  try {
    const d = typeof val === 'string' ? new Date(val) : (val?.toDate?.() ?? new Date(val))
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString()
  } catch {
    return '—'
  }
}

function downloadCsv(name, headers, rows) {
  const lines = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}-${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/* Mock data (replace with Firestore later)                           */
/* ------------------------------------------------------------------ */

function mockEmployerInvoices() {
  /** @type {Array<{id:string,companyName:string,poNumber?:string,amountCents:number,issuedAt:any,dueAt:any,status:InvoiceStatus,contactEmail?:string}>} */
  return [
    {
      id: 'inv_001', companyName: 'Acme Logistics', poNumber: 'PO-1042',
      amountCents: 320000, issuedAt: '2025-07-01', dueAt: '2025-07-31',
      status: 'unpaid', contactEmail: 'ap@acmelogistics.com'
    },
    {
      id: 'inv_002', companyName: 'RoadRunner Freight', poNumber: 'PO-1045',
      amountCents: 185000, issuedAt: '2025-07-10', dueAt: '2025-08-10',
      status: 'partial', contactEmail: 'billing@roadrunner.com'
    },
    {
      id: 'inv_003', companyName: 'Blue Sky Haulers', poNumber: 'PO-1048',
      amountCents: 257500, issuedAt: '2025-06-15', dueAt: '2025-07-15',
      status: 'paid', contactEmail: 'ap@bluesky.com'
    },
  ]
}

function mockIndividualPayments() {
  /** @type {Array<{email:string,name?:string,course?:string,cdlClass?:string,paymentStatus:PaymentStatus,paymentProofUrl?:string,reconciled:boolean}>} */
  return [
    {
      email: 'sam@example.com', name: 'Sam Lopez', course: 'ELDT Class B',
      cdlClass: 'B', paymentStatus: 'paid',
      paymentProofUrl: 'https://example.com/receipt-sam.jpg', reconciled: true
    },
    {
      email: 'alex@example.com', name: 'Alex Jordan', course: 'ELDT Class A',
      cdlClass: 'A', paymentStatus: 'partial',
      paymentProofUrl: '', reconciled: false
    },
    {
      email: 'riley@example.com', name: 'Riley Chen', course: 'Passenger Bus',
      cdlClass: 'PASSENGER-BUS', paymentStatus: 'pending',
      paymentProofUrl: '', reconciled: false
    },
    {
      email: 'morgan@example.com', name: 'Morgan Yu', course: 'ELDT Class A',
      cdlClass: 'A', paymentStatus: 'waived',
      paymentProofUrl: '', reconciled: true
    },
  ]
}
