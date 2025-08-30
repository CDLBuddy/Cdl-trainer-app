// Path: src/admin/dashboard/components/calendar/EventEditor.jsx
import PropTypes from 'prop-types'
import React, { memo, useEffect, useId, useMemo, useRef, useState } from 'react'

import { useToast } from '@components/useToast.js'

import styles from './EventEditor.module.css'

/* ───────────────────────── Color helpers ───────────────────────── */

function colorFromSeed(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const hue = h % 360
  return `hsl(${hue} 65% 48%)`
}

function normalizeColor(v) {
  if (!v) return ''
  const s = String(v).trim()
  if (/^#?[0-9a-fA-F]{3,8}$/.test(s)) return s.startsWith('#') ? s : `#${s}`
  if (/^hsla?\(/i.test(s)) return s
  return ''
}

/* ─────────────────────── Local date helpers ─────────────────────── */

const pad = n => String(n).padStart(2, '0')

function toLocalDateInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(+d)) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function toLocalDatetimeInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(+d)) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromLocalDateInput(v) {
  if (!v) return ''
  const d = new Date(`${v}T00:00:00`)
  return Number.isNaN(+d) ? '' : d.toISOString()
}
function fromLocalDatetimeInput(v) {
  if (!v) return ''
  const d = new Date(v.replace(' ', 'T'))
  return Number.isNaN(+d) ? '' : d.toISOString()
}

/* ─────────────────────────── Component ─────────────────────────── */

function EventEditor({
  open,
  initial,
  instructors = [],
  onSave,
  onDelete,
  onClose,
}) {
  const toast = useToast()
  const [v, setV] = useState(initial || {})
  const sheetRef = useRef(null)
  const firstFieldRef = useRef(null)
  const titleId = useId()
  const descId = useId()

  const instructorOptions = useMemo(
    () =>
      (instructors || []).map(i => ({
        ...i,
        label: i.label || i.name || i.email || String(i.value || ''),
      })),
    [instructors]
  )

  const autoColor = useMemo(
    () => colorFromSeed(String(v.instructorId || 'default')),
    [v.instructorId]
  )

  useEffect(() => {
    setV(initial || {})
  }, [initial])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => firstFieldRef.current?.focus?.(), 0)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = e => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
        return
      }
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'enter') {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === 'Tab') {
        const root = sheetRef.current
        if (!root) return
        const all = root.querySelectorAll(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        )
        const focusables = Array.from(all).filter(
          el => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1'
        )
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose])

  if (!open) return null

  const set = (k, val) => setV(prev => ({ ...prev, [k]: val }))

  const validate = () => {
    if (!v?.title?.trim()) {
      toast.warn?.('Title is required.')
      return false
    }
    if (!v?.start || !v?.end) {
      toast.warn?.('Start and End required.')
      return false
    }
    const s = new Date(v.start)
    const e = new Date(v.end)
    if (Number.isNaN(+s) || Number.isNaN(+e)) {
      toast.error?.('Invalid date/time.')
      return false
    }
    if (e < s) {
      toast.warn?.('End time must be after start time.')
      return false
    }
    return true
  }

  const handleSubmit = () => {
    const color = normalizeColor(v.color) || autoColor
    const payload = { ...v, color }
    if (!validate()) return
    onSave?.(payload)
  }

  const onToggleAllDay = checked => {
    if (checked) {
      const start = toLocalDateInput(v.start || new Date().toISOString())
      const end = toLocalDateInput(v.end || v.start || new Date().toISOString())
      setV(prev => ({
        ...prev,
        allDay: true,
        start: fromLocalDateInput(start),
        end: fromLocalDateInput(end),
      }))
    } else {
      const startDate = toLocalDateInput(v.start || new Date().toISOString())
      const endDate = toLocalDateInput(v.end || v.start || new Date().toISOString())
      const start = fromLocalDatetimeInput(`${startDate}T08:00`)
      const end = fromLocalDatetimeInput(`${endDate}T09:00`)
      setV(prev => ({ ...prev, allDay: false, start, end }))
    }
  }

  return (
    <div
      className={styles.portal}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      {/* Make scrim a real interactive element to satisfy a11y rules */}
      <button
        type="button"
        className={styles.scrim}
        aria-label="Close editor"
        onClick={() => onClose?.()}
      />
      <section className={styles.sheet} ref={sheetRef}>
        <header className={styles.header}>
          <h3 id={titleId}>{v?.id ? 'Edit Event' : 'New Event'}</h3>
          <button
            className={styles.icon}
            onClick={() => onClose?.()}
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </header>

        <form
          className={styles.form}
          onSubmit={e => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          <p id={descId} className={styles.hint}>
            Set title, timing, location, instructor, status, color, and notes.
          </p>

          <label className={styles.row}>
            <span className={styles.label}>Title</span>
            <input
              ref={firstFieldRef}
              className={styles.input}
              value={v.title || ''}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g., BTW Session"
              required
            />
          </label>

          <label className={styles.rowCheck}>
            <input
              type="checkbox"
              checked={!!v.allDay}
              onChange={e => onToggleAllDay(e.target.checked)}
            />
            <span>All day</span>
          </label>

          {v.allDay ? (
            <div className={styles.grid2}>
              <label className={styles.row}>
                <span className={styles.label}>Start (day)</span>
                <input
                  className={styles.input}
                  type="date"
                  value={toLocalDateInput(v.start)}
                  onChange={e => set('start', fromLocalDateInput(e.target.value))}
                  required
                />
              </label>
              <label className={styles.row}>
                <span className={styles.label}>End (day)</span>
                <input
                  className={styles.input}
                  type="date"
                  value={toLocalDateInput(v.end)}
                  onChange={e => set('end', fromLocalDateInput(e.target.value))}
                  required
                />
              </label>
            </div>
          ) : (
            <div className={styles.grid2}>
              <label className={styles.row}>
                <span className={styles.label}>Start</span>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={toLocalDatetimeInput(v.start)}
                  onChange={e => set('start', fromLocalDatetimeInput(e.target.value))}
                  required
                />
              </label>
              <label className={styles.row}>
                <span className={styles.label}>End</span>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={toLocalDatetimeInput(v.end)}
                  onChange={e => set('end', fromLocalDatetimeInput(e.target.value))}
                  required
                />
              </label>
            </div>
          )}

          <div className={styles.grid2}>
            <label className={styles.row}>
              <span className={styles.label}>Instructor</span>
              <select
                className={styles.input}
                value={v.instructorId || ''}
                onChange={e => {
                  const id = e.target.value
                  const name =
                    instructorOptions.find(i => i.value === id)?.label || ''
                  set('instructorId', id)
                  set('instructorName', name)
                }}
              >
                <option value="">(Unassigned)</option>
                {instructorOptions.map(i => (
                  <option key={String(i.value)} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.row}>
              <span className={styles.label}>Status</span>
              <select
                className={styles.input}
                value={v.status || 'confirmed'}
                onChange={e => set('status', e.target.value)}
              >
                <option value="confirmed">Confirmed</option>
                <option value="tentative">Tentative</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          <div className={styles.grid2}>
            <label className={styles.row}>
              <span className={styles.label}>Location</span>
              <input
                className={styles.input}
                value={v.location || ''}
                onChange={e => set('location', e.target.value)}
                placeholder="Yard / classroom / address"
              />
            </label>

            <label className={styles.row}>
              <span className={styles.label}>Color</span>
              <div className={styles.colorRow}>
                <input
                  type="color"
                  className={styles.color}
                  value={normalizeColor(v.color) || autoColor}
                  onChange={e => set('color', e.target.value)}
                  aria-label="Pick event color"
                />
                <input
                  className={styles.input}
                  value={normalizeColor(v.color) || autoColor}
                  onChange={e => set('color', e.target.value)}
                  placeholder="#4e91ad"
                />
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => {
                    set('color', autoColor)
                    toast.info?.('Color reset based on instructor.')
                  }}
                  title="Reset to default by instructor"
                >
                  Reset
                </button>
              </div>
            </label>
          </div>

          <label className={styles.row}>
            <span className={styles.label}>Notes</span>
            <textarea
              className={styles.textarea}
              rows={3}
              value={v.notes || ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Details students or instructor should know…"
            />
          </label>

          <footer className={styles.actions}>
            {v.id && (
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => onDelete?.(v.id)}
              >
                Delete
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => onClose?.()}
            >
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary}>
              Save
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

EventEditor.propTypes = {
  open: PropTypes.bool.isRequired,
  initial: PropTypes.object,
  instructors: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })
  ),
  onSave: PropTypes.func,
  onDelete: PropTypes.func,
  onClose: PropTypes.func,
}

EventEditor.defaultProps = {
  initial: null,
  instructors: [],
  onSave: undefined,
  onDelete: undefined,
  onClose: undefined,
}

export default memo(EventEditor)
