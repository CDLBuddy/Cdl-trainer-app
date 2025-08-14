import React, { useMemo, useState } from 'react'

/**
 * VisualRecallDrill
 * - Show an image and ask a short-answer question.
 *
 * Props:
 *  - question: string
 *  - answer: string | string[]  (any match passes; case-insensitive, substring)
 *  - imgSrc: string
 *  - onComplete(): void
 *  - alreadyComplete?: boolean
 *  - placeholder?: string
 */
export default function VisualRecallDrill({
  question = '',
  answer = '',
  imgSrc = '',
  onComplete,
  alreadyComplete = false,
  placeholder = 'Your answer',
}) {
  const [val, setVal] = useState('')
  const [result, setResult] = useState(null)

  const answers = useMemo(
    () => (Array.isArray(answer) ? answer : [answer]).filter(Boolean),
    [answer]
  )

  function check() {
    const v = val.trim().toLowerCase()
    const ok = answers.some(a => v.includes(String(a).toLowerCase()))
    setResult(ok ? '✅ Correct!' : '❌ Try again!')
    if (ok && !alreadyComplete) onComplete?.()
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 8px' }}>Visual Recall</h3>
      {imgSrc && (
        <img
          src={imgSrc}
          alt=""
          style={{
            maxWidth: 180,
            display: 'block',
            marginBottom: 10,
            borderRadius: 10,
            border: '1px solid color-mix(in oklab, var(--accent), #000 40%)',
            boxShadow: '0 2px 8px #0005',
          }}
        />
      )}

      {question && (
        <div style={{ marginBottom: 8, color: 'var(--text-light)' }}>{question}</div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          className="visual-answer"
          placeholder={placeholder}
          aria-label="Visual answer"
          value={val}
          disabled={alreadyComplete}
          onChange={(e) => setVal(e.target.value)}
          style={{
            flex: '1 1 auto',
            background: 'var(--card-bg)',
            color: 'var(--text-light)',
            border: '1px solid color-mix(in oklab, var(--accent), #000 40%)',
            borderRadius: 10,
            padding: '10px 12px',
            minWidth: 140,
          }}
        />
        <button className="btn" onClick={check} disabled={alreadyComplete}>
          Check
        </button>
      </div>

      <div aria-live="polite" style={{ marginTop: 6 }}>
        {result}
      </div>
    </div>
  )
}