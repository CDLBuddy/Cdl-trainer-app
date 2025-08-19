// Path: src/admin/billing/components/Employer/EmployerTable.jsx
import React, { memo, useCallback } from 'react'
import { StatusPill } from '..'
import { formatCurrency, fmtDate } from '../../utils'

function EmployerTableBase({ rows = [], onMarkPaid = () => {} }) {
  const hasRows = Array.isArray(rows) && rows.length > 0

  const handleMarkPaid = useCallback(
    (id, isPaid) => {
      if (isPaid) return
      onMarkPaid(id)
    },
    [onMarkPaid]
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ width: '100%', minWidth: 860 }}>
        {/* Optional widths for better readability on wide screens */}
        <colgroup>
          <col /> {/* Company */}
          <col style={{ width: 120 }} /> {/* PO */}
          <col style={{ width: 120 }} /> {/* Amount */}
          <col style={{ width: 120 }} /> {/* Issued */}
          <col style={{ width: 120 }} /> {/* Due */}
          <col style={{ width: 120 }} /> {/* Status */}
          <col /> {/* Contact */}
          <col style={{ width: 140 }} /> {/* Actions */}
        </colgroup>

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
          {!hasRows ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', color: '#6b7280' }}>
                No invoices to display.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const isPaid = String(r?.status ?? '').toLowerCase() === 'paid'
              const company = r?.companyName || '—'
              const po = r?.poNumber || '—'
              const issued = fmtDate(r?.issuedAt)
              const due = fmtDate(r?.dueAt)
              const amount = formatCurrency(r?.amountCents)
              const contact = r?.contactEmail || ''

              return (
                <tr key={r.id}>
                  {/* Use scope="row" so screen readers anchor the row by company */}
                  <th scope="row" style={{ fontWeight: 600 }}>{company}</th>

                  <td
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                    title={po !== '—' ? `PO: ${po}` : undefined}
                  >
                    {po !== '—' ? <code>{po}</code> : '—'}
                  </td>

                  <td title={amount}>{amount}</td>
                  <td title={issued}>{issued}</td>
                  <td title={due}>{due}</td>

                  <td title={`Status: ${r?.status ?? '—'}`}>
                    <StatusPill value={r?.status} />
                  </td>

                  <td>
                    {contact ? (
                      <a href={`mailto:${contact}`} title={`Email ${contact}`}>
                        {contact}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      className="btn small"
                      disabled={isPaid}
                      aria-disabled={isPaid ? 'true' : 'false'}
                      title={isPaid ? 'Already paid' : 'Mark this invoice as paid'}
                      onClick={() => handleMarkPaid(r.id, isPaid)}
                      data-status={r?.status || 'unknown'}
                    >
                      {isPaid ? 'Paid' : 'Mark Paid'}
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export default memo(EmployerTableBase)