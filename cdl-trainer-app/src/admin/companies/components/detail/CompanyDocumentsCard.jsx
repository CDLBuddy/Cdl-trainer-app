// Path: src/admin/companies/components/detail/CompanyDocumentsCard.jsx
// ============================================================================
// CompanyDocumentsCard
// - Compact document list with status badges + expiry hints
// - Upload CTA (button) + optional item actions (download/delete/open)
// - Accessible list semantics, graceful empty/loading states
// - Non-breaking: onUpload is optional; item actions are opt-in
// ============================================================================

import PropTypes from 'prop-types'
import React, { useMemo } from 'react'

import styles from './CompanyCards.module.css'

/**
 * @typedef {{ id:string, name:string, type?:string, status?:'ok'|'missing'|'expired', expiresAtLabel?:string }} Doc
 */

function StatusPill({ status = 'ok' }) {
  const label = status === 'expired' ? 'Expired' : status === 'missing' ? 'Missing' : 'OK'
  const tone =
    status === 'expired' ? { bg: '#fef2f2', fg: '#b91c1c' } :
    status === 'missing' ? { bg: '#fff7ed', fg: '#c2410c' } :
    { bg: '#ecfdf5', fg: '#065f46' }
  return (
    <span
      className={styles.meta}
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        background: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.fg}20`,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  )
}

export default function CompanyDocumentsCard({
  docs = [],
  loading = false,
  error = '',
  onUpload,
  onOpen,       // (doc) => void
  onDownload,   // (doc) => void
  onDelete,     // (doc) => void
}) {
  const counts = useMemo(() => {
    const c = { ok: 0, missing: 0, expired: 0 }
    for (const d of docs) c[(d.status || 'ok')] = (c[d.status || 'ok'] || 0) + 1
    return c
  }, [docs])

  return (
    <section className={styles.card} aria-label="Company documents" aria-busy={!!loading}>
      <header className={styles.header}>
        <h3 className={styles.title}>Documents</h3>
        <div className={styles.actions}>
          <small className={styles.meta} style={{ marginRight: 8 }}>
            {loading ? <span className={styles.skeleton} style={{ width: 42 }} /> : (
              <>
                {docs.length} total • {counts.expired} expired • {counts.missing} missing
              </>
            )}
          </small>
          <button className="btn outline" onClick={onUpload} disabled={loading} aria-label="Upload document">
            Upload
          </button>
        </div>
      </header>

      {/* Body */}
      {loading ? (
        <div className={styles.list} role="list" aria-label="Loading documents">
          <div className={styles.row} role="listitem">
            <span className={styles.skeleton} style={{ width: 220 }} />
            <span className={styles.skeleton} style={{ width: 140 }} />
          </div>
          <div className={styles.row} role="listitem">
            <span className={styles.skeleton} style={{ width: 260 }} />
            <span className={styles.skeleton} style={{ width: 90 }} />
          </div>
        </div>
      ) : error ? (
        <p className={styles.empty} role="alert">Unable to load documents. {String(error)}</p>
      ) : docs.length === 0 ? (
        <div>
          <p className={styles.empty}>No documents on file.</p>
          <div className={styles.actions}>
            <button className="btn" onClick={onUpload}>Upload a document</button>
          </div>
          <p className={styles.meta} style={{ marginTop: 6 }}>
            Tip: You can upload items like Agreements, COI, and W-9s. Expiration will be shown here.
          </p>
        </div>
      ) : (
        <ul className={styles.list} style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Documents">
          {docs.map(d => (
            <li key={d.id || d.name} className={styles.row}>
              <div style={{ display: 'grid', gap: 2 }}>
                <div>
                  <strong>{d.name}</strong>{' '}
                  <span className={styles.meta}>({d.type || 'file'})</span>
                </div>
                <div className={styles.meta}>
                  {d.expiresAtLabel ? `Expires ${d.expiresAtLabel}` : 'No expiry'}
                </div>
              </div>

              <div className={styles.actions} style={{ alignItems: 'center' }}>
                <StatusPill status={d.status} />
                {onOpen && (
                  <button className="btn small outline" onClick={() => onOpen(d)} aria-label={`Open ${d.name}`}>
                    Open
                  </button>
                )}
                {onDownload && (
                  <button className="btn small outline" onClick={() => onDownload(d)} aria-label={`Download ${d.name}`}>
                    Download
                  </button>
                )}
                {onDelete && (
                  <button
                    className="btn small outline"
                    onClick={() => onDelete(d)}
                    aria-label={`Delete ${d.name}`}
                    title="Delete document"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

CompanyDocumentsCard.propTypes = {
  /** Array of documents to render */
  docs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
    status: PropTypes.oneOf(['ok', 'missing', 'expired']),
    expiresAtLabel: PropTypes.string,
  })),
  /** Loading state for skeletons */
  loading: PropTypes.bool,
  /** Optional error text for error state */
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  /** Upload button handler */
  onUpload: PropTypes.func,
  /** Optional per-item actions */
  onOpen: PropTypes.func,
  onDownload: PropTypes.func,
  onDelete: PropTypes.func,
}