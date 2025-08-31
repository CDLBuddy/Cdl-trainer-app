// src/student/walkthrough/drills/TypePhraseDrill.jsx
import PropTypes from 'prop-types'
import React, { useId, useMemo, useState } from 'react'

import styles from './TypePhraseDrill.module.css'

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
  const uid = useId()
  const statusId = `${uid}-status`
  const inputId = `${uid}-input`
  const [val, setVal] = useState('')
  const [result, setResult] = useState(null)
  const [showHint, setShowHint] = useState(false)

  const normalize = useMemo(
    () =>
      strict
        ? (s) =>
            String(s ?? '')
              .normalize('NFKC')
              .trim()
              .replace(/\s+/g, ' ')
              .toLowerCase()
        : (s) =>
            String(s ?? '')
              .normalize('NFKC')
              .toLowerCase()
              .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation in lenient mode
              .trim()
              .replace(/\s+/g, ' '),
    [strict]
  )

  const handleSubmit = (e) => {
    e?.preventDefault?.()
    const ok = normalize(val) === normalize(phrase)
    setResult(ok ? '✅ Perfect! You memorized it.' : '❌ Not quite right. Try again!')
    if (ok && !alreadyComplete) onComplete?.()
  }

  const remaining = Math.max(0, Math.abs(phrase.length - val.length))

  return (
    <form className={styles.root} onSubmit={handleSubmit} aria-describedby={statusId}>
      <h3 className={styles.title}>
        Type the Pass/Fail Phrase {strict ? 'Word-for-Word' : '(Lenient)'}
      </h3>

      <label className="sr-only" htmlFor={inputId}>Type the phrase</label>
      <textarea
        id={inputId}
        className={styles.input}
        rows={4}
        placeholder="Type the full phrase here"
        aria-label="Type phrase"
        aria-describedby={statusId}
        value={val}
        disabled={alreadyComplete}
        onChange={(e) => setVal(e.target.value)}
      />

      <div className={styles.controls}>
        <button className="btn" type="submit" disabled={alreadyComplete}>
          {alreadyComplete ? 'Completed' : 'Check'}
        </button>

        <button
          type="button"
          className="btn outline"
          onClick={() => setShowHint((s) => !s)}
          aria-pressed={showHint ? 'true' : 'false'}
        >
          {showHint ? 'Hide Hint' : 'Show Hint'}
        </button>

        <span className={styles.meta} aria-hidden>
          {strict ? 'Strict match' : 'Punctuation ignored'}
          {' · '}
          {remaining ? `${remaining} char ${remaining === 1 ? '' : 's'} off` : 'length matches'}
        </span>
      </div>

      {showHint && (
        <div className={styles.hint} role="note">
          <strong>Hint:</strong> <em>{phrase}</em>
        </div>
      )}

      <div id={statusId} className={styles.status} aria-live="polite">
        {result}
      </div>
    </form>
  )
}

TypePhraseDrill.propTypes = {
  phrase: PropTypes.string,
  onComplete: PropTypes.func,
  alreadyComplete: PropTypes.bool,
  strict: PropTypes.bool,
}