// Path: /src/admin/walkthroughs/WalkthroughList.jsx
// -----------------------------------------------------------------------------
// WalkthroughList (admin)
// - Stateless UI table for default + custom walkthroughs
// - Client-side search, filters, stable sort
// - Row actions via callbacks from parent
// -----------------------------------------------------------------------------

import React, { useMemo, useState, useCallback } from 'react'
import { getWalkthroughLabel } from '@walkthrough-data'

// ---- small utils ------------------------------------------------------------

const fmtDate = (v) => {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(+d)) return '—'
  return d.toLocaleString()
}

const Chip = ({ text, tone = 'neutral' }) => (
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
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </span>
)

const statusTone = (s) =>
  s === 'published' ? 'ok' : s === 'in-review' ? 'warn' : s === 'archived' ? 'err' : 'neutral'

const sourceFrom = (it) => it.source || (it.isDefault ? 'default' : 'custom')

// ---- component --------------------------------------------------------------

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
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'

  const classes = useMemo(() => {
    const s = new Set(items.map((i) => (i.classCode || '').toUpperCase()).filter(Boolean))
    return ['all', ...Array.from(s)]
  }, [items])

  const setSort = useCallback((key) => {
    setSortDir((d) => (key === sortKey ? (d === 'asc' ? 'desc' : 'asc') : 'asc'))
    setSortKey(key)
  }, [sortKey])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()

    // never mutate props.items
    const base = (items || []).filter((it) => {
      const st = (it.status || 'draft')
      if (status !== 'all' && st !== status) return false
      const cc = (it.classCode || '').toUpperCase()
      if (klass !== 'all' && cc !== klass) return false
      const src = sourceFrom(it)
      if (source !== 'all' && src !== source) return false
      if (!needle) return true
      const blob = [
        it.label,
        it.classCode,
        it.token,
        it.id,
        src,
      ].filter(Boolean).join(' ').toLowerCase()
      return blob.includes(needle)
    })

    const dir = sortDir === 'asc' ? 1 : -1
    const getVal = (row) => {
      if (sortKey === 'updatedAt') return +new Date(row.updatedAt || 0)
      if (sortKey === 'label') return String(row.label || '').toLowerCase()
      if (sortKey === 'classCode') return String(row.classCode || '').toUpperCase()
      if (sortKey === 'version') return Number(row.version ?? -1)
      return 0
    }

    // stable sort
    return base
      .map((v, i) => ({ v, i }))
      .sort((a, b) => {
        const av = getVal(a.v)
        const bv = getVal(b.v)
        if (av < bv) return -1 * dir
        if (av > bv) return 1 * dir
        return a.i - b.i // stabilize
      })
      .map((x) => x.v)
  }, [items, q, status, klass, source, sortKey, sortDir])

  const onRowKey = useCallback((e, id) => {
    // Enter → Preview, E → Edit
    if (e.key === 'Enter') {
      onPreview?.(id)
    } else if (e.key?.toLowerCase() === 'e') {
      onEdit?.(id)
    }
  }, [onPreview, onEdit])

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
          placeholder="Search by label, class, token, or id…"
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
            gridTemplateColumns: 'minmax(200px, 1fr) 120px 90px 180px 160px minmax(220px, 320px)',
            padding: '10px 12px',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            fontWeight: 600,
            columnGap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setSort('label')}
            style={{ textAlign: 'left', background: 'transparent', border: 0, cursor: 'pointer' }}
            title="Sort by label"
          >
            Label {sortKey === 'label' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
          </button>
          <button
            type="button"
            onClick={() => setSort('classCode')}
            style={{ textAlign: 'left', background: 'transparent', border: 0, cursor: 'pointer' }}
            title="Sort by class"
          >
            Class {sortKey === 'classCode' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
          </button>
          <button
            type="button"
            onClick={() => setSort('version')}
            style={{ textAlign: 'left', background: 'transparent', border: 0, cursor: 'pointer' }}
            title="Sort by version"
          >
            Version {sortKey === 'version' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
          </button>
          <span>Status / Source</span>
          <button
            type="button"
            onClick={() => setSort('updatedAt')}
            style={{ textAlign: 'left', background: 'transparent', border: 0, cursor: 'pointer' }}
            title="Sort by last update"
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
          filtered.map((it) => {
            const classCode = (it.classCode || '').toUpperCase()
            const classLabel = getWalkthroughLabel?.(classCode) || classCode || '—'
            const st = (it.status || 'draft')
            const src = sourceFrom(it)

            return (
              <div
                role="row"
                key={it.id}
                tabIndex={0}
                onKeyDown={(e) => onRowKey(e, it.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(200px, 1fr) 120px 90px 180px 160px minmax(220px, 320px)',
                  padding: '10px 12px',
                  borderBottom: '1px solid #f3f4f6',
                  alignItems: 'center',
                  columnGap: 8,
                  outline: 'none',
                }}
                onDoubleClick={() => onPreview?.(it.id)}
                title="Double-click to preview. Press Enter to preview or E to edit."
              >
                {/* Label + token */}
                <div title={it.id} style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {it.label || '—'}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {it.token || it.id}
                  </div>
                </div>

                {/* Class */}
                <div title={classCode}>{classLabel}</div>

                {/* Version */}
                <div>{it.version ?? '—'}</div>

                {/* Status + Source */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip text={st.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())} tone={statusTone(st)} />
                  <Chip text={(src || '').replace(/\b\w/g, (c) => c.toUpperCase())} />
                  {it.isDefault ? <Chip text="Default" /> : null}
                </div>

                {/* Updated */}
                <div style={{ color: '#6b7280' }}>{fmtDate(it.updatedAt)}</div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  <button type="button" onClick={() => onPreview?.(it.id)} title="Preview walkthrough">Preview</button>
                  <button type="button" onClick={() => onEdit?.(it.id)} title="Edit walkthrough">Edit</button>
                  {st !== 'published' && (
                    <button type="button" onClick={() => onSubmit?.(it.id)} title="Submit for review">Submit</button>
                  )}
                  <button type="button" onClick={() => onDuplicate?.(it.id)} title="Duplicate">Duplicate</button>
                  <button type="button" onClick={() => onExport?.(it.id)} title="Export data">Export</button>
                  {!it.isDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Delete this walkthrough? This cannot be undone.')) {
                          onDelete?.(it.id)
                        }
                      }}
                      style={{ color: '#b91c1c' }}
                      title="Delete walkthrough"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}