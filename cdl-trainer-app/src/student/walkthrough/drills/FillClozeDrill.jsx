import React, { useMemo, useState, useId } from 'react'

/**
 * FillClozeDrill
 * - Turns target keywords into blanks the learner must fill (case-insensitive)
 *
 * Props:
 *  - line: string
 *  - keywords: string[]
 *  - onComplete(): void
 *  - alreadyComplete?: boolean
 */
export default function FillClozeDrill({
  line = '',
  keywords = [],
  onComplete,
  alreadyComplete = false,
}) {
  const uid = useId()
  const [inputs, setInputs] = useState({})
  const [result, setResult] = useState(null)

  const { parts, blanks } = useMemo(() => {
    if (!line || keywords.length === 0) {
      return { parts: [line], blanks: [] }
    }
    const re = new RegExp(`\\b(${keywords.map(k => escapeRe(k)).join('|')})\\b`, 'gi')
    const segs = []
    const found = []
    let i = 0
    let m
    while ((m = re.exec(line))) {
      segs.push(line.slice(i, m.index))
      found.push(m[1])
      segs.push({ blankIndex: found.length - 1 })
      i = re.lastIndex
    }
    segs.push(line.slice(i))
    return { parts: segs, blanks: found }
  }, [line, keywords])

  function handleChange(index, val) {
    setInputs(prev => ({ ...prev, [index]: val }))
  }

  function check(e) {
    e?.preventDefault?.()
    const ok = blanks.every(
      (b, i) => (inputs[i] || '').trim().toLowerCase() === String(b).toLowerCase()
    )
    setResult(ok ? '✅ Correct!' : '❌ Try again!')
    if (ok && !alreadyComplete) onComplete?.()
  }

  if (!blanks.length) {
    // nothing to fill — fall back to simple text
    return <div style={{ marginBottom: 8 }}>{line}</div>
  }

  return (
    <form onSubmit={check} style={{ marginBottom: '1.1rem' }}>
      <div aria-live="off">
        {parts.map((p, i) =>
          typeof p === 'string' ? (
            <span key={i}>{p}</span>
          ) : (
            <input
              key={i}
              type="text"
              size={Math.max(3, String(blanks[p.blankIndex]).length)}
              aria-label={`Blank ${p.blankIndex + 1}`}
              value={inputs[p.blankIndex] ?? ''}
              disabled={alreadyComplete}
              onChange={e => handleChange(p.blankIndex, e.target.value)}
              style={{
                margin: '0 4px',
                background: 'var(--card-bg)',
                border:
                  '1px solid color-mix(in oklab, var(--accent), #000 40%)',
                borderRadius: 8,
                padding: '6px 8px',
                color: 'var(--text-light)',
              }}
              required
            />
          )
        )}
      </div>

      <button className="btn" type="submit" style={{ marginTop: 8 }} disabled={alreadyComplete}>
        Check
      </button>

      <div id={`${uid}_res`} aria-live="polite" style={{ marginTop: 6 }}>
        {result}
      </div>
    </form>
  )
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}