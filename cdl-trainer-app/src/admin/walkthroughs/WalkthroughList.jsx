// Path: /src/admin/walkthroughs/WalkthroughList.jsx
// -----------------------------------------------------------------------------
// WalkthroughList (admin)
// - Displays default + custom walkthroughs with quick filters and search
// - Shows metadata: class, token/label, version, status, last updated
// - Row actions: preview, edit, submit for review, duplicate, export, delete
// - Stateless data table: parent owns data + actions; this handles UI only
//
// Props:
//   items: Array<{
//     id: string
//     label: string
//     classCode: string           // e.g. 'A', 'B', 'PASSENGER-BUS'
//     token?: string              // normalized token (e.g. 'class-a')
//     version?: number
//     status?: 'draft'|'in-review'|'published'|'archived'
//     updatedAt?: string|number|Date
//     source?: 'default'|'custom'|'school'
//     isDefault?: boolean
//   }>
//   loading?: boolean
//   onPreview?: (id) => void
//   onEdit?: (id) => void
//   onSubmit?: (id) => void
//   onDuplicate?: (id) => void
//   onExport?: (id) => void
//   onDelete?: (id) => void
//
// Notes:
// - Minimal, dependency-free table; accessible and keyboard friendly.
// - Includes client-side search + filters (status/class/source).
// -----------------------------------------------------------------------------

import React, { useMemo, useState } from 'react'

const fmtDate = (v) => {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(+d)) return '—'
  return d.toLocaleString()
}

const chip = (text, tone = 'neutral') => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 12,
      lineHeight: '18px',
      background:
        tone === 'ok'
          ? 'rgba(16,185,129,0.12)'
          : tone === 'warn'
          ? 'rgba(245,158,11,0.12)'
          : tone === 'err'
          ? 'rgba(239,68,68,0.12)'
          : 'rgba(107,114,128,0.12)',
      color:
        tone === 'ok'
          ? '#065f46'
          : tone === 'warn'
          ? '#92400e'
          : tone === 'err'
          ? '#7f1d1d'
          : '#1f2937',
    }}
  >
    {text}
  </span>
)

export default function WalkthroughList({
  items = [],
  loading = false,
  onPreview,
  onEdit,
  onSubmit,
  onDuplicate,
  onExport,
  onDelete,
}) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [klass, setKlass] = useState('all')
  const [source, setSource] = useState('all')
  const [sortKey, setSortKey] = useState('updatedAt')
  const [sortDir, setSortDir] = useState('desc')

  const classes = useMemo(() => {
    const s = new Set(items.map((i) => (i.classCode || '').toUpperCase()).filter(Boolean))
    return ['all', ...Array.from(s)]
  }, [items])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = items.filter((it) => {
      if (status !== 'all' && (it.status || 'draft') !== status) return false
      if (klass !== 'all' && (it.classCode || '').toUpperCase() !== klass) return false
      if (source !== 'all' && (it.source || (it.isDefault ? 'default' : 'custom')) !== source)
        return false
      if (!needle) return true
      const blob = `${it.label} ${it.classCode} ${it.token || ''} ${it.id}`.toLowerCase()
      return blob.includes(needle)
    })

    const dir = sortDir === 'asc' ? 1 : -1
    return list.sort((a, b) => {
      const av =
        sortKey === 'updatedAt'
          ? +new Date(a.updatedAt || 0)
          : sortKey === 'label'
          ? String(a.label || '')
          : String(a.classCode || '')
      const bv =
        sortKey === 'updatedAt'
          ? +new Date(b.updatedAt || 0)
          : sortKey === 'label'
          ? String(b.label || '')
          : String(b.classCode || '')
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }, [items, q, status, klass, source, sortKey, sortDir])

  const setSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Walkthroughs</h2>

      {/* Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr repeat(3, max-content)',
          gap: 8,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by label, class, or id…"
          aria-label="Search walkthroughs"
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="in-review">In Review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          aria-label="Filter by class"
          value={klass}
          onChange={(e) => setKlass(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        >
          {classes.map((c) => (
            <option value={c} key={c}>
              {c === 'all' ? 'All classes' : c}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        >
          <option value="all">All sources</option>
          <option value="default">Default</option>
          <option value="school">School</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Table */}
      <div
        role="table"
        aria-label="Walkthroughs table"
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <div
          role="row"
          style={{
            display: 'grid',
            gridTemplateColumns: '240px 110px 90px 120px 1fr 260px',
            padding: '10px 12px',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            fontWeight: 600,
          }}
        >
          <button
            type="button"
            onClick={() => setSort('label')}
            style={{ textAlign: 'left', background: 'transparent', border: 0, cursor: 'pointer' }}
          >
            Label {sortKey === 'label' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
          </button>
          <button
            type="button"
            onClick={() => setSort('classCode')}
            style={{ textAlign: 'left', background: 'transparent', border: 0, cursor: 'pointer' }}
          >
            Class {sortKey === 'classCode' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
          </button>
          <span>Version</span>
          <span>Status</span>
          <button
            type="button"
            onClick={() => setSort('updatedAt')}
            style={{ textAlign: 'left', background: 'transparent', border: 0, cursor: 'pointer' }}
          >
            Updated {sortKey === 'updatedAt' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
          </button>
          <span>Actions</span>
        </div>

        {loading ? (
          <div style={{ padding: 16 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 16 }}>No walkthroughs match your filters.</div>
        ) : (
          filtered.map((it) => (
            <div
              role="row"
              key={it.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '240px 110px 90px 120px 1fr 260px',
                padding: '10px 12px',
                borderBottom: '1px solid #f3f4f6',
                alignItems: 'center',
              }}
            >
              <div title={it.id} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 600 }}>{it.label || '—'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{it.token || it.id}</div>
              </div>

              <div>{(it.classCode || '').toUpperCase() || '—'}</div>
              <div>{it.version ?? '—'}</div>

              <div>
                {chip(
                  (it.status || 'draft')
                    .replace('-', ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase()),
                  it.status === 'published' ? 'ok' : it.status === 'in-review' ? 'warn' : 'neutral'
                )}{' '}
                {it.isDefault ? chip('Default', 'neutral') : null}
              </div>

              <div style={{ color: '#6b7280' }}>{fmtDate(it.updatedAt)}</div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => onPreview?.(it.id)}>Preview</button>
                <button type="button" onClick={() => onEdit?.(it.id)}>Edit</button>
                {it.status !== 'published' && (
                  <button type="button" onClick={() => onSubmit?.(it.id)}>Submit</button>
                )}
                <button type="button" onClick={() => onDuplicate?.(it.id)}>Duplicate</button>
                <button type="button" onClick={() => onExport?.(it.id)}>Export</button>
                {!it.isDefault && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this walkthrough? This cannot be undone.')) {
                        onDelete?.(it.id)
                      }
                    }}
                    style={{ color: '#b91c1c' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}