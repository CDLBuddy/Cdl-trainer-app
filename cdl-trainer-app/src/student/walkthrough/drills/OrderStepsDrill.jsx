import React, { useEffect, useMemo, useState } from 'react'

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
  const [order, setOrder] = useState(() => shuffle(steps))
  const [result, setResult] = useState(null)

  // If canonical steps change while mounted, reshuffle
  useEffect(() => setOrder(shuffle(steps)), [steps])

  function move(idx, dir) {
    if (alreadyComplete) return
    const j = idx + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setOrder(next)
  }

  function onDragStart(e, idx) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
  function onDrop(e, idx) {
    if (alreadyComplete) return
    const from = Number(e.dataTransfer.getData('text/plain'))
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(idx, 0, moved)
    setOrder(next)
    e.preventDefault()
  }

  function check() {
    const ok = steps.every((s, i) => order[i] === s)
    setResult(ok ? '✅ Correct order!' : '❌ Try again!')
    if (ok && !alreadyComplete) onComplete?.()
  }

  const numbered = useMemo(
    () => order.map((s, i) => `${i + 1}. ${s}`),
    [order]
  )

  return (
    <div>
      <h3 style={{ margin: '0 0 6px' }}>Put the Steps in Order</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {order.map((step, idx) => (
          <li
            key={`${idx}_${step.slice(0, 16)}`}
            draggable={!alreadyComplete}
            onDragStart={e => onDragStart(e, idx)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(e, idx)}
            aria-label={`Step ${idx + 1}`}
            style={{
              background: 'color-mix(in oklab, var(--brand-dark), #fff 4%)',
              padding: '8px 12px',
              borderRadius: 10,
              border:
                '1px solid color-mix(in oklab, var(--accent), #000 40%)',
              margin: '8px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              cursor: alreadyComplete ? 'default' : 'grab',
              boxShadow: '0 2px 8px #0005, inset 0 1px 0 #ffffff10',
            }}
          >
            <span style={{ color: 'var(--text-light)' }}>{numbered[idx]}</span>
            {!alreadyComplete && (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => move(idx, 1)}
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

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn" onClick={check} disabled={alreadyComplete}>
          Check Order
        </button>
        {!alreadyComplete && (
          <button
            className="btn outline"
            type="button"
            onClick={() => setOrder(shuffle(steps))}
          >
            Reshuffle
          </button>
        )}
      </div>

      <div aria-live="polite" style={{ marginTop: 6 }}>
        {result}
      </div>
    </div>
  )
}

function shuffle(arr = []) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}