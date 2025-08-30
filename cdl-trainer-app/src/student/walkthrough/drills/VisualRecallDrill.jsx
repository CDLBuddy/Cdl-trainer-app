// src/student/walkthrough/drills/VisualRecallDrill.jsx
import PropTypes from 'prop-types'
import React, { useId, useMemo, useState } from 'react'
import styles from './VisualRecallDrill.module.css'

/**
 * VisualRecallDrill
 * - Show an image and ask a short-answer question.
 *
 * Accepts either:
 *   A) explicit props: { question, answer, imgSrc }
 *   B) a step object:  { step: { text?, question?, answer?, acceptableAnswers?, media?:{img,alt} } }
 * Falls back to fallbackQuestion / fallbackAnswer if needed.
 */
export default function VisualRecallDrill({
  // Explicit inputs (optional if using step)
  question = '',
  answer = '',
  imgSrc = '',
  // Step-driven input (preferred when provided)
  step = null,
  // Fallbacks (used if step/explicit missing)
  fallbackQuestion = '',
  fallbackAnswer = '',
  // UX
  onComplete,
  alreadyComplete = false,
  placeholder = 'Your answer',
}) {
  const uid = useId()
  const statusId = `${uid}-status`
  const inputId = `${uid}-input`

  // ---- Derive prompt/image/answers from step OR explicit props ----------
  const derived = useMemo(() => {
    const s = step || {}
    const mediaImg = s?.media?.img || s?.img || null
    const mediaAlt =
      s?.media?.alt || s?.alt || (s?.question || s?.text || question || 'Illustration')

    // Question priority: step.question → step.text → explicit prop → fallback
    const q =
      (s?.question || s?.text || question || fallbackQuestion || '').trim()

    // Answers can be: step.answer (string/number), step.acceptableAnswers (array), explicit answer, fallback
    let answers = []
    const push = (v) => {
      if (v == null) return
      if (Array.isArray(v)) answers.push(...v)
      else answers.push(v)
    }
    push(s?.acceptableAnswers)
    push(s?.answer)
    push(answer)
    push(fallbackAnswer)
    // Normalize to strings
    answers = answers
      .filter((v) => v != null && String(v).trim() !== '')
      .map((v) => String(v).trim())

    // Image: step.media.img → explicit imgSrc → ''
    const src = mediaImg || imgSrc || ''

    return {
      question: q,
      answers,
      imgSrc: src,
      imgAlt: mediaAlt,
    }
  }, [step, question, answer, imgSrc, fallbackQuestion, fallbackAnswer])

  const [val, setVal] = useState('')
  const [result, setResult] = useState(null)
  const [showHint, setShowHint] = useState(false)

  // ---- Matching (case-insensitive, punctuation/space lenient) -------------
  const normalize = (s) =>
    String(s ?? '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation
      .trim()
      .replace(/\s+/g, ' ')

  const answersNorm = useMemo(
    () => (derived.answers.length ? derived.answers.map(normalize) : []),
    [derived.answers]
  )

  const handleCheck = (e) => {
    e?.preventDefault?.()
    const v = normalize(val)
    // Pass if any acceptable answer is a substring of the user input
    const ok =
      answersNorm.length === 0
        ? v.length > 0 // if no expected answers, any non-empty is fine
        : answersNorm.some((a) => v.includes(a))
    setResult(ok ? '✅ Correct!' : '❌ Try again!')
    if (ok && !alreadyComplete) onComplete?.()
  }

  const hasImage = Boolean(derived.imgSrc)
  const hasQuestion = Boolean(derived.question)

  return (
    <form className={styles.root} onSubmit={handleCheck} aria-describedby={statusId}>
      <h3 className={styles.title}>Visual Recall</h3>

      <div className={styles.mediaRow}>
        {hasImage && (
          <figure className={styles.figure}>
            <img
              src={derived.imgSrc}
              alt={derived.imgAlt || ''}
              className={styles.image}
            />
            {derived.imgAlt && <figcaption className={styles.figcap}>{derived.imgAlt}</figcaption>}
          </figure>
        )}

        {hasQuestion && (
          <div className={styles.question} role="note">
            {derived.question}
          </div>
        )}
      </div>

      <div className={styles.inputRow}>
        <label htmlFor={inputId} className="sr-only">Your answer</label>
        <input
          id={inputId}
          type="text"
          className={styles.input}
          placeholder={placeholder}
          aria-label="Visual answer"
          aria-describedby={statusId}
          value={val}
          disabled={alreadyComplete}
          onChange={(e) => setVal(e.target.value)}
        />

        <button className="btn" type="submit" disabled={alreadyComplete}>
          {alreadyComplete ? 'Completed' : 'Check'}
        </button>

        {derived.answers.length > 0 && (
          <button
            type="button"
            className="btn outline"
            onClick={() => setShowHint((s) => !s)}
            aria-pressed={showHint ? 'true' : 'false'}
          >
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </button>
        )}
      </div>

      {showHint && derived.answers.length > 0 && (
        <div className={styles.hint} role="note">
          <strong>Hint:</strong>{' '}
          <em>
            {derived.answers.join(' or ')}
          </em>
        </div>
      )}

      <div id={statusId} className={styles.status} aria-live="polite">
        {result}
      </div>
    </form>
  )
}

VisualRecallDrill.propTypes = {
  question: PropTypes.string,
  answer: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  imgSrc: PropTypes.string,
  step: PropTypes.shape({
    text: PropTypes.string,
    question: PropTypes.string,
    answer: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.array]),
    acceptableAnswers: PropTypes.array,
    media: PropTypes.shape({
      img: PropTypes.string,
      alt: PropTypes.string,
    }),
  }),
  fallbackQuestion: PropTypes.string,
  fallbackAnswer: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onComplete: PropTypes.func,
  alreadyComplete: PropTypes.bool,
  placeholder: PropTypes.string,
}