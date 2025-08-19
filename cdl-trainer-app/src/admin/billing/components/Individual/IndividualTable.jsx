// Path: src/admin/billing/components/Individual/IndividualTable.jsx
import React, { useCallback, memo } from 'react'
import { StatusPill } from '..'

function IndividualTableBase({
  rows = [],
  onToggleReconciled = () => {},
}) {
  const handleToggle = useCallback(
    (email) => {
      // Defensive: ignore if email missing
      if (!email) return
      onToggleReconciled(email)
    },
    [onToggleReconciled]
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ width: '100%', minWidth: 960 }}>
        {/* Hidden caption improves SR context without visual noise */}
        <caption className="visually-hidden">
          Individual payments table. Columns: Student, Email, Course, Class, Payment, Receipt, Reconciled, Actions.
        </caption>

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
          {rows.map((r) => {
            const name = r.name || '—'
            const email = r.email || ''
            const reconciled = Boolean(r.reconciled)

            return (
              <tr key={email || name}>
                <td>{name}</td>

                <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {email ? (
                    <a href={`mailto:${email}`} title={`Email ${name}`}>
                      {email}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>

                <td>{r.course || '—'}</td>
                <td>{r.cdlClass || '—'}</td>

                <td>
                  <StatusPill value={r.paymentStatus} individual size="sm" showDot />
                </td>

                <td>
                  {r.paymentProofUrl ? (
                    <a
                      href={r.paymentProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`View receipt for ${name}${email ? ` (${email})` : ''}`}
                      title="View receipt"
                    >
                      View
                    </a>
                  ) : (
                    '—'
                  )}
                </td>

                <td aria-label={`Reconciled: ${reconciled ? 'Yes' : 'No'}`}>
                  {reconciled ? 'Yes' : 'No'}
                </td>

                <td style={{ whiteSpace: 'nowrap' }}>
                  <button
                    className="btn small"
                    onClick={() => handleToggle(email)}
                    aria-pressed={reconciled}
                    aria-label={
                      reconciled
                        ? `Mark ${name}${email ? ` (${email})` : ''} as unreconciled`
                        : `Mark ${name}${email ? ` (${email})` : ''} as reconciled`
                    }
                    title={reconciled ? 'Mark as unreconciled' : 'Mark as reconciled'}
                    disabled={!email}
                  >
                    {reconciled ? 'Unreconcile' : 'Mark Reconciled'}
                  </button>
                </td>
              </tr>
            )
          })}
          {/* Parent already shows an empty state card, but this keeps table valid if used standalone */}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', color: '#6b7280' }}>
                No students found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// Avoid re-renders when parent passes stable references
export default memo(IndividualTableBase)