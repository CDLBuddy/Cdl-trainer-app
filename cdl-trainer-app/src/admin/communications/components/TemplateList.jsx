// src/admin/communications/components/TemplateList.jsx
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

import { listTemplates } from '../services'
import cls from './TemplateList.module.css'

/* ----------------------------- small helpers ----------------------------- */

function toDate(v) {
  try {
    if (!v) return null
    return v?.toDate ? v.toDate() : new Date(v)
  } catch { return null }
}

function fmtWhen(v) {
  const d = toDate(v)
  if (!d || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/* -------------------------------- component ------------------------------ */

/**
 * Lists message templates with optional search and actions.
 *
 * Props:
 *  - onSelect?: (tpl) => void           (fallback: dispatch 'comms:templateSelected')
 *  - onEdit?:   (tpl) => void           (fallback: dispatch 'comms:templateEdit')
 *  - onCreate?: () => void              (show "New Template" when provided)
 *  - showSearch?: boolean               (default true)
 */
function TemplateList({ onSelect, onEdit, onCreate, showSearch = true }) {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listTemplates()
      setItems(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError(err || new Error('Failed to load templates'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await listTemplates()
        if (!alive) return
        setItems(Array.isArray(data) ? data : [])
        setError(null)
      } catch (err) {
        if (!alive) return
        setError(err || new Error('Failed to load templates'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [refreshTick])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(t => {
      const name = String(t.name || '').toLowerCase()
      const chans = Array.isArray(t.channels) ? t.channels.join(',').toLowerCase() : ''
      const subj = String(t.subjectTpl || '').toLowerCase()
      return name.includes(q) || chans.includes(q) || subj.includes(q)
    })
  }, [items, query])

  const choose = useCallback((tpl) => {
    if (onSelect) return onSelect(tpl)
    window.dispatchEvent(new CustomEvent('comms:templateSelected', { detail: tpl }))
  }, [onSelect])

  const edit = useCallback((tpl) => {
    if (onEdit) return onEdit(tpl)
    window.dispatchEvent(new CustomEvent('comms:templateEdit', { detail: tpl }))
  }, [onEdit])

  const refresh = useCallback(() => setRefreshTick(t => t + 1), [])

  const empty = !loading && !error && filtered.length === 0

  return (
    <section className={cls.card} aria-labelledby="templates-title">
      <header className={cls.cardHeader}>
        <h3 id="templates-title" className={cls.cardTitle}>Templates</h3>

        <div className={cls.headerActions}>
          {showSearch && (
            <label className={cls.searchWrap}>
              <span className={cls.srOnly}>Search templates</span>
              <input
                className={cls.search}
                type="search"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          )}

          <button
            type="button"
            className={cls.refresh}
            onClick={refresh}
            aria-label="Refresh templates"
            title="Refresh"
            disabled={loading}
          >
            ↻
          </button>

          {onCreate && (
            <button
              type="button"
              className={cls.primary}
              onClick={onCreate}
            >
              New Template
            </button>
          )}
        </div>
      </header>

      <div className={cls.body}>
        {/* Loading skeletons */}
        {loading && (
          <div role="status" aria-live="polite" className={cls.skelList}>
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className={cls.skel} />)}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <p className={cls.empty}>
            Couldn’t load templates.{' '}
            <button type="button" className={cls.linkBtn} onClick={load}>Retry</button>
          </p>
        )}

        {/* Empty */}
        {empty && (
          <p className={cls.empty}>
            {query ? 'No matching templates.' : 'No templates yet.'}
          </p>
        )}

        {/* List */}
        {!loading && !error && filtered.length > 0 && (
          <ul className={cls.list} role="listbox" aria-label="Saved templates">
            {filtered.map((t) => {
              const channels = Array.isArray(t.channels) ? t.channels.join(', ') : '—'
              const varsCount = Array.isArray(t.variables) ? t.variables.length : 0
              const when = t.updatedAt || t.createdAt
              return (
                <li key={t.id} role="option" aria-selected="false" className={cls.row}>
                  <button
                    type="button"
                    className={cls.item}
                    onClick={() => choose(t)}
                    title="Use this template"
                  >
                    <span className={cls.name}>{t.name || '(untitled)'}</span>
                    <span className={cls.meta}>
                      {channels} • vars: {varsCount} • {fmtWhen(when)}
                    </span>
                  </button>
                  <div className={cls.rowActions}>
                    <button
                      type="button"
                      className={cls.iconBtn}
                      aria-label={`Edit template ${t.name || ''}`}
                      title="Edit"
                      onClick={() => edit(t)}
                    >
                      ✏️
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

TemplateList.propTypes = {
  onSelect: PropTypes.func,
  onEdit: PropTypes.func,
  onCreate: PropTypes.func,
  showSearch: PropTypes.bool,
}

export default memo(TemplateList)