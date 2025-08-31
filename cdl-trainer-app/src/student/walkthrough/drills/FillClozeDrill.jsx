// src/student/walkthrough/drills/FillClozeDrill.jsx
import PropTypes from 'prop-types'
import React, { useCallback, useId, useMemo, useState } from 'react'

import styles from './FillClozeDrill.module.css'

/**
 * FillClozeDrill
 * - Replaces each keyword match in `line` with an input the learner must fill.
 * - Case-insensitive check with light normalization (trim + collapse spaces).
 *
 * Props:
 *  - line: string
 *  - keywords: string[]          // tokens to blank out (order preserved as matched)
 *  - onComplete(): void          // fired once when all blanks correct
 *  - alreadyComplete?: boolean   // disable + show “done” state
 */
export default function FillClozeDrill({
  line = '',
  keywords = [],
  onComplete,
  alreadyComplete = false,
}) {
  const uid = useId()
  const [inputs, setInputs] = useState({})
  const [checked, setChecked] = useState(false)
  const [allCorrect, setAllCorrect] = useState(false)

  // ----- Derived: segments + blanks (stable) -----------------------------
  const { parts, blanks, tokensForHint } = useMemo(() => {
    const safeLine = String(line || '')
    const safeTokens = Array.from(
      new Set((keywords || []).map(k => String(k || '').trim()).filter(Boolean))
    )

    // Nothing to blank? render as plain text
    if (!safeLine || safeTokens.length === 0) {
      return { parts: [safeLine], blanks: [], tokensForHint: [] }
    }

    const re = new RegExp(
      `\\b(${safeTokens.map(escapeRe).join('|')})\\b`,
      'gi'
    )

    const segs = []
    const found = []
    let i = 0
    let m
    while ((m = re.exec(safeLine))) {
      segs.push(safeLine.slice(i, m.index))
      found.push(m[1]) // push the matched token (keeps original case/len)
      segs.push({ blankIndex: found.length - 1 })
      i = re.lastIndex
    }
    segs.push(safeLine.slice(i))
    return {
      parts: segs,
      blanks: found,                       // exact tokens per blank (by index)
      tokensForHint: safeTokens.sort(),    // unique list for hint chips
    }
  }, [line, keywords])

  const blanksCount = blanks.length

  // ----- Helpers ----------------------------------------------------------
  const norm = useCallback((s) => {
    return String(s || '')
      .toLowerCase()
      .normalize('NFKC')        // catch wider unicode forms if any
      .replace(/\s+/g, ' ')     // collapse spaces
      .trim()
  }, [])

  const setOne = useCallback((index, value) => {
    setInputs(prev => (prev[index] === value ? prev : { ...prev, [index]: value }))
  }, [])

  const reset = useCallback(() => {
    setInputs({})
    setChecked(false)
    setAllCorrect(false)
  }, [])

  const handleCheck = useCallback((e) => {
    e?.preventDefault?.()
    if (blanksCount === 0) return

    // Evaluate each blank
    let ok = true
    for (let i = 0; i < blanksCount; i++) {
      const want = norm(blanks[i])
      const got = norm(inputs[i])
      if (!want || want !== got) {
        ok = false
        break
      }
    }
    setChecked(true)
    setAllCorrect(ok)

    if (ok && !alreadyComplete) {
      // fire after paint, avoids React “state during render” warnings in parents
      queueMicrotask(() => onComplete?.())
    }
  }, [blanks, blanksCount, inputs, norm, onComplete, alreadyComplete])

  // ----- Early: no blanks → fallback text --------------------------------
  if (blanksCount === 0) {
    return <div className={styles.answer}>{line}</div>
  }

  // ----- Render ------------------------------------------------------------
  const descId = `${uid}-desc`
  const statusId = `${uid}-status`

  return (
    <form className={styles.root} onSubmit={handleCheck} aria-describedby={descId}>
      <div id={descId} className={styles.hint}>
        Fill the blanks with the correct terms. Keywords are case-insensitive.
      </div>

      <div className={styles.row} aria-live="off">
        <div className={styles.prompt} aria-hidden>
          {/* Inline text with inputs substituted in-place */}
        </div>

        {/* sentence with inputs */}
        <div>
          {parts.map((p, i) =>
            typeof p === 'string' ? (
              <span key={i}>{p}</span>
            ) : (
              <input
                key={i}
                type="text"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                aria-label={`Blank ${p.blankIndex + 1} of ${blanksCount}`}
                value={inputs[p.blankIndex] ?? ''}
                onChange={e => setOne(p.blankIndex, e.target.value)}
                disabled={alreadyComplete || allCorrect}
                className={styles.input}
                size={Math.max(3, String(blanks[p.blankIndex]).length)}
                required
              />
            )
          )}
        </div>

        {/* small token chips (optional hint) */}
        {tokensForHint.length > 0 && (
          <div className={styles.tokenList} aria-hidden>
            {tokensForHint.map(t => (
              <span key={t} className={styles.token}>{t}</span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button className="btn" type="submit" disabled={alreadyComplete || allCorrect}>
          {allCorrect ? 'Completed' : 'Check'}
        </button>
        <button
          type="button"
          className="btn outline"
          onClick={reset}
          disabled={alreadyComplete || (!checked && Object.keys(inputs).length === 0)}
          aria-describedby={statusId}
        >
          Reset
        </button>
      </div>

      <div id={statusId} className={styles.hint} aria-live="polite">
        {checked && (
          allCorrect
            ? <span role="status">✅ Correct! Nicely done.</span>
            : <span role="alert">❌ Not quite—review your blanks and try again.</span>
        )}
      </div>
    </form>
  )
}

FillClozeDrill.propTypes = {
  line: PropTypes.string,
  keywords: PropTypes.arrayOf(PropTypes.string),
  onComplete: PropTypes.func,
  alreadyComplete: PropTypes.bool,
}

/* ----------------- local utils ----------------- */
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}