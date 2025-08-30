// src/student/walkthrough/drills/OrderStepsDrill.jsx
import PropTypes from 'prop-types'
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import styles from './OrderStepsDrill.module.css'

/**
 * OrderStepsDrill
 * - Learner rearranges steps to match the canonical order.
 *
 * Props:
 *  - steps: string[] (canonical order)
 *  - onComplete(): void
 *  - alreadyComplete?: boolean
 */
export default function OrderStepsDrill({
  steps = [],
  onComplete,
  alreadyComplete = false,
}) {
  const uid = useId()
  const statusId = `${uid}-status`
  const listLabelId = `${uid}-label`

  // Canonical items with stable ids (duplicate-safe)
  const items = useMemo(
    () => (steps || []).map((text, id) => ({ id, text: String(text || '') })),
    [steps]
  )

  // Local order holds array of ids (not strings)
  const [order, setOrder] = useState(() => shuffle(items.map(i => i.id)))
  const [checked, setChecked] = useState(false)
  const [allCorrect, setAllCorrect] = useState(false)

  // When canonical steps change, reshuffle (avoids stale state)
  useEffect(() => {
    setOrder(shuffle(items.map(i => i.id)))
    setChecked(false)
    setAllCorrect(false)
  }, [items])

  // Resolve the visible list from order indices
  const visible = useMemo(() => order.map(id => items.find(it => it.id === id)), [order, items])

  // Helpers
  const move = useCallback((idx, dir) => {
    if (alreadyComplete) return
    const j = idx + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setOrder(next)
  }, [order, alreadyComplete])

  const onDragStart = useCallback((e, fromIdx) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(fromIdx))
  }, [])

  const onDrop = useCallback((e, toIdx) => {
    if (alreadyComplete) return
    const fromIdx = Number(e.dataTransfer.getData('text/plain'))
    if (Number.isNaN(fromIdx)) return
    const next = [...order]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setOrder(next)
    e.preventDefault()
  }, [order, alreadyComplete])

  const onKeyReorder = useCallback((e, idx) => {
    if (alreadyComplete) return
    const k = e.key.toLowerCase()
    if (k === 'arrowup') { e.preventDefault(); move(idx, -1) }
    if (k === 'arrowdown') { e.preventDefault(); move(idx, +1) }
    // Home/End jump
    if (k === 'home') { e.preventDefault(); setOrder(prev => moveToIndex(prev, idx, 0)) }
    if (k === 'end')  { e.preventDefault(); setOrder(prev => moveToIndex(prev, idx, prev.length - 1)) }
  }, [alreadyComplete, move])

  const check = useCallback(() => {
    // correct iff order === [0,1,2,...]
    const ok = order.every((id, pos) => id === pos)
    setChecked(true)
    setAllCorrect(ok)
    if (ok && !alreadyComplete) queueMicrotask(() => onComplete?.())
  }, [order, alreadyComplete, onComplete])

  const reshuffle = useCallback(() => {
    setOrder(shuffle(items.map(i => i.id)))
    setChecked(false)
    setAllCorrect(false)
  }, [items])

  return (
    <div className={styles.root}>
      <h3 id={listLabelId} className={styles.title}>Put the steps in order</h3>

      <ul
        className={styles.list}
        role="list"
        aria-labelledby={listLabelId}
        aria-describedby={statusId}
      >
        {visible.map((it, idx) => (
          <li
            key={`${it.id}-${it.text.slice(0, 24)}`}
            className={styles.item}
            draggable={!alreadyComplete}
            onDragStart={e => onDragStart(e, idx)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(e, idx)}
            aria-label={`Step ${idx + 1}: ${it.text}`}
          >
            <span className={styles.num}>{idx + 1}.</span>
            <span className={styles.text}>{it.text}</span>

            {!alreadyComplete && (
              <span className={styles.controls}>
                <button
                  type="button"
                  className={`${styles.ctrlBtn} btn outline`}
                  onClick={() => move(idx, -1)}
                  onKeyDown={e => onKeyReorder(e, idx)}
                  disabled={idx === 0}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={`${styles.ctrlBtn} btn outline`}
                  onClick={() => move(idx, +1)}
                  onKeyDown={e => onKeyReorder(e, idx)}
                  disabled={idx === order.length - 1}
                  aria-label="Move down"
                >
                  ↓
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className={styles.actions}>
        <button className="btn" onClick={check} disabled={alreadyComplete || allCorrect}>
          {allCorrect ? 'Completed' : 'Check Order'}
        </button>
        {!alreadyComplete && (
          <button className="btn outline" type="button" onClick={reshuffle}>
            Reshuffle
          </button>
        )}
      </div>

      <div id={statusId} className={styles.status} aria-live="polite">
        {checked && (allCorrect ? '✅ Correct order! Nicely done.' : '❌ Not quite—adjust and try again.')}
      </div>
    </div>
  )
}

OrderStepsDrill.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.string),
  onComplete: PropTypes.func,
  alreadyComplete: PropTypes.bool,
}

/* ---------- local utils ---------- */
function shuffle(arr = []) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
function moveToIndex(arr, from, to) {
  if (from === to) return arr
  const next = [...arr]
  const [m] = next.splice(from, 1)
  next.splice(to, 0, m)
  return next
}