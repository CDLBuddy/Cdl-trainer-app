import React, { useMemo, useState } from 'react'

/**
 * TypePhraseDrill
 * - Learner must type a phrase exactly (configurable normalization).
 *
 * Props:
 *  - phrase: string
 *  - onComplete(): void
 *  - alreadyComplete?: boolean
 *  - strict?: boolean  (default true; if false, ignores punctuation)
 */
export default function TypePhraseDrill({
  phrase = '',
  onComplete,
  alreadyComplete = false,
  strict = true,
}) {
  const [val, setVal] = useState('')
  const [result, setResult] = useState(null)

  const normalize = useMemo(
    () =>
      strict
        ? (s) => s.trim().replace(/\s+/g, ' ').toLowerCase()
        : (s) =>
            s
              .toLowerCase()
              .replace(/[^\p{L}\p{N}\s]/gu, '') // drop punctuation in lenient mode
              .trim()
              .replace(/\s+/g, ' '),
    [strict]
  )

  function check(e) {
    e?.preventDefault?.()
    const ok = normalize(val) === normalize(phrase)
    setResult(ok ? '✅ Perfect! You memorized it.' : '❌ Not quite right. Try again!')
    if (ok && !alreadyComplete) onComplete?.()
  }

  return (
    <form onSubmit={check}>
      <h3 style={{ margin: '0 0 6px' }}>Type the Pass/Fail Phrase Word-for-Word</h3>
      <textarea
        rows={4}
        style={{
          width: '100%',
          background: 'var(--card-bg)',
          color: 'var(--text-light)',
          border: '1px solid color-mix(in oklab, var(--accent), #000 40%)',
          borderRadius: 10,
          padding: '10px 12px',
        }}
        placeholder="Type the full phrase here"
        aria-label="Type phrase"
        value={val}
        disabled={alreadyComplete}
        onChange={(e) => setVal(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <button className="btn" type="submit" disabled={alreadyComplete}>
          Check
        </button>
        <span style={{ fontSize: '.95em', opacity: .65 }}>
          Hint: <em>{phrase}</em>
          {!strict && ' (lenient mode)'}
        </span>
      </div>
      <div aria-live="polite" style={{ marginTop: 6 }}>
        {result}
      </div>
    </form>
  )
}