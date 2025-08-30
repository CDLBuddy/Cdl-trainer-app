// Path: src/student/walkthrough/components/DrillTabs.jsx
import React, { useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import styles from './DrillTabs.module.css' // ← use the component’s CSS module

const TYPES = /** @type {const} */ (['fill', 'order', 'type', 'visual'])
const LABEL = {
  fill: 'Fill-in-the-Blank',
  order: 'Ordered Steps',
  type: 'Typing Challenge',
  visual: 'Visual Recall',
}

/**
 * DrillTabs
 * - Accessible tabs pattern (buttons as tabs)
 * - Keyboard: ArrowLeft/Right, Home/End, Enter/Space
 * - Roving tabindex to keep focus in the active tab
 */
export default function DrillTabs({
  current,
  completed = {},
  onSelect,
  getPanelId, // optional: aria-controls target id for each tab
}) {
  const items = useMemo(() => TYPES.map(t => ({ key: t, label: LABEL[t] })), [])
  const refs = useRef([])

  const idx = Math.max(0, items.findIndex(i => i.key === current))

  const focusAt = (i) => {
    const el = refs.current[i]
    if (el && typeof el.focus === 'function') el.focus()
  }

  const move = (delta) => {
    const n = items.length
    const next = (idx + delta + n) % n
    onSelect?.(items[next].key)
    // Wait a tick so state updates before moving focus
    queueMicrotask(() => focusAt(next))
  }

  const onKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'Right': // legacy
        e.preventDefault()
        move(1)
        break
      case 'ArrowLeft':
      case 'Left': // legacy
        e.preventDefault()
        move(-1)
        break
      case 'Home':
        e.preventDefault()
        onSelect?.(items[0].key)
        queueMicrotask(() => focusAt(0))
        break
      case 'End':
        e.preventDefault()
        onSelect?.(items[items.length - 1].key)
        queueMicrotask(() => focusAt(items.length - 1))
        break
      case 'Enter':
      case ' ':
        // Already selected via roving model; no-op
        // Kept for assistive tech that expects activation
        e.preventDefault()
        break
      default:
        break
    }
  }

  return (
    <nav
      className={styles.drillTabs}
      aria-label="Drill navigation"
      role="tablist"
      onKeyDown={onKeyDown}
    >
      {items.map((it, i) => {
        const active = current === it.key
        const done = !!completed[it.key]
        const panelId = getPanelId?.(it.key)

        return (
          <button
            key={it.key}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            className={[
              styles.tabBtn,
              active ? styles.active : '',
              done ? styles.done : '',
            ].filter(Boolean).join(' ')}
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1} // roving tabindex
            onClick={() => onSelect?.(it.key)}
          >
            {it.label}
            {done ? ' ✅' : ''}
          </button>
        )
      })}
    </nav>
  )
}

DrillTabs.propTypes = {
  current: PropTypes.oneOf(['fill', 'order', 'type', 'visual']).isRequired,
  completed: PropTypes.object, // { fill?:bool, order?:bool, type?:bool, visual?:bool }
  onSelect: PropTypes.func,
  /** Optional: return the tabpanel id for a given type (wires aria-controls) */
  getPanelId: PropTypes.func,
}