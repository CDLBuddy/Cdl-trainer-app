// src/student/StudentFlashcards.jsx
// ======================================================================
// Student Flashcards
// - Student-only guard (email/role) with normalized routes
// - Keyboard + touch controls, a11y labels
// - Persists progress (current index, known cards, shuffle)
// - Logs study minutes on session completion
// ======================================================================

import { collection, query, where, getDocs } from 'firebase/firestore'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '@components/ToastContext.js'
import { db, auth } from '@utils/firebase.js'
import {
  incrementStudentStudyMinutes,
  logStudySession,
} from '@utils/ui-helpers.js'

const defaultFlashcards = [
  { q: 'What is the minimum tread depth for front tires?', a: '4/32 of an inch.' },
  { q: 'What do you check for on rims?', a: 'Bent, damaged, or rust trails.' },
  { q: 'When must you use 3 points of contact?', a: 'When entering and exiting the vehicle.' },
  { q: 'What triggers the spring brake pop-out?', a: 'Low air pressure (between 20–45 PSI).' },
]

// util: robust user email
const getCurrentUserEmail = () => {
  try {
    return (
      auth?.currentUser?.email ||
      window.currentUserEmail ||
      localStorage.getItem('currentUserEmail') ||
      null
    )
  } catch {
    return null
  }
}

// util: shuffle copy
function shuffleArray(arr) {
  return arr
    .map(card => ({ ...card, __sort: Math.random() }))
    .sort((a, b) => a.__sort - b.__sort)
    .map(({ q, a }) => ({ q, a }))
}

export default function StudentFlashcards() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const flashcardRef = useRef(null)

  // state
  const [loading, setLoading] = useState(true)
  const [flashcards, setFlashcards] = useState([...defaultFlashcards])
  const [current, setCurrent] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [knownCards, setKnownCards] = useState([])
  const [completed, setCompleted] = useState(false)
  const [startedAt, setStartedAt] = useState(Date.now())
  const [email, setEmail] = useState('')
  const [flipped, setFlipped] = useState(false)

  // initial load + student role check
  useEffect(() => {
    const userEmail = getCurrentUserEmail()
    if (!userEmail) {
      showToast('You must be logged in to view this page.', 'error')
      navigate('/login', { replace: true })
      return
    }
    setEmail(userEmail)

    ;(async () => {
      // default to cached role; verify from Firestore if available
      let userRole = localStorage.getItem('userRole') || 'student'
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('email', '==', userEmail)))
        if (!snap.empty) userRole = snap.docs[0].data().role || userRole
      } catch {
        // ignore; fall back to local
      }
      if (String(userRole).toLowerCase() !== 'student') {
        showToast('Flashcards are only available for students.', 'error')
        navigate('/student/dashboard', { replace: true })
        return
      }

      const shouldShuffle = localStorage.getItem('fcShuffle') === '1'
      const known = JSON.parse(localStorage.getItem('fcKnown_' + userEmail) || '[]')
      const savedIdx = parseInt(localStorage.getItem('fcCurrent_' + userEmail) || '0', 10)

      const deck = shouldShuffle ? shuffleArray(defaultFlashcards) : [...defaultFlashcards]
      setShuffle(shouldShuffle)
      setKnownCards(Array.isArray(known) ? known : [])
      setFlashcards(deck)
      setCurrent(!Number.isNaN(savedIdx) && savedIdx >= 0 && savedIdx < deck.length ? savedIdx : 0)
      setStartedAt(Date.now())
      setCompleted(false)
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // persist current index
  useEffect(() => {
    if (email) localStorage.setItem('fcCurrent_' + email, String(current))
  }, [current, email])

  // handlers (stable)
  const handleFlip = useCallback(() => setFlipped(f => !f), [])
  const handleNext = useCallback(() => {
    setCurrent(i => {
      const next = Math.min(i + 1, flashcards.length - 1)
      if (next !== i) setFlipped(false)
      return next
    })
  }, [flashcards.length])
  const handlePrev = useCallback(() => {
    setCurrent(i => {
      const prev = Math.max(i - 1, 0)
      if (prev !== i) setFlipped(false)
      return prev
    })
  }, [])

  // keyboard navigation on the focusable card
  useEffect(() => {
    const el = flashcardRef.current
    if (!el) return
    const onKey = e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFlip() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleNext() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev() }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [handleFlip, handleNext, handlePrev])

  // touch navigation (simple swipe)
  useEffect(() => {
    const el = flashcardRef.current
    if (!el) return
    let startX = null
    const onTouchStart = e => { startX = e.changedTouches[0].clientX }
    const onTouchEnd = e => {
      if (startX == null) return
      const dx = e.changedTouches[0].clientX - startX
      if (Math.abs(dx) > 50) {
        if (dx > 0) handlePrev()
        else handleNext()
      } else {
        handleFlip()
      }
      startX = null
    }
    el.addEventListener('touchstart', onTouchStart)
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [handleFlip, handleNext, handlePrev])

  // session completion logging
  useEffect(() => {
    if (!completed || !email) return
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000))
    ;(async () => {
      try {
        await incrementStudentStudyMinutes(email, minutes)
        await logStudySession(email, minutes, 'Flashcards')
        showToast('✅ Flashcard session logged!')
      } catch {
        showToast('Could not log your session, but your study progress is saved locally.')
      }
    })()
  }, [completed, email, startedAt, showToast])

  // other handlers
  const handleKnown = useCallback(() => {
    if (!knownCards.includes(current)) {
      const updated = [...knownCards, current]
      setKnownCards(updated)
      if (email) localStorage.setItem('fcKnown_' + email, JSON.stringify(updated))
      showToast('Marked as known!')
    }
  }, [current, email, knownCards, showToast])

  const handleShuffleToggle = useCallback((e) => {
    const checked = !!e.target.checked
    setShuffle(checked)
    localStorage.setItem('fcShuffle', checked ? '1' : '0')
    const deck = checked ? shuffleArray(defaultFlashcards) : [...defaultFlashcards]
    setFlashcards(deck)
    setCurrent(0)
    setFlipped(false)
  }, [])

  const handleEndSession = useCallback(() => setCompleted(true), [])

  // render states
  if (loading) {
    return (
      <div className="loading-container" role="status" aria-live="polite">
        <div className="spinner" />
        <p>Loading flashcards…</p>
      </div>
    )
  }

  if (completed) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000))
    return (
      <div className="flashcards-complete container fade-in">
        <h2>🎉 Flashcard Session Complete!</h2>
        <p>You reviewed <b>{flashcards.length}</b> cards.</p>
        <p><b>{minutes}</b> study minute{minutes === 1 ? '' : 's'} logged!</p>
        <div className="flashcard-complete-actions">
          <button
            className="btn primary"
            onClick={() => {
              setKnownCards([])
              if (email) localStorage.setItem('fcKnown_' + email, '[]')
              setCurrent(0)
              setStartedAt(Date.now())
              setCompleted(false)
            }}
          >
            🔄 Restart
          </button>
          <button
            className="btn outline"
            onClick={() => {
              const missed = defaultFlashcards.filter((_, i) => !knownCards.includes(i))
              setFlashcards(missed.length ? missed : [...defaultFlashcards])
              setKnownCards([])
              setCurrent(0)
              setStartedAt(Date.now())
              setCompleted(false)
            }}
          >
            Review Missed
          </button>
          <button className="btn outline" onClick={() => navigate('/student/dashboard')}>
            ⬅ Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const knownPct = Math.round((knownCards.length / flashcards.length) * 100)

  return (
    <div className="flashcards-page container fade-in">
      <h2 className="dash-head">
        🃏 Student Flashcards <span className="role-badge student">Student</span>
      </h2>

      <div className="flashcard-progress">
        <progress value={current + 1} max={flashcards.length} aria-valuemin={1} aria-valuemax={flashcards.length} aria-valuenow={current + 1} />
        <div aria-live="polite">Card {current + 1} of {flashcards.length}</div>
        <label className="shuffle-toggle">
          <input type="checkbox" checked={shuffle} onChange={handleShuffleToggle} /> Shuffle
        </label>
        <span>Known: {knownCards.length}/{flashcards.length} ({knownPct}%)</span>
      </div>

      <div
        className={`flashcard${flipped ? ' flipped' : ''}`}
        tabIndex={0}
        role="button"
        aria-label="Flashcard: Press Enter or Space to flip. Use Left/Right arrows to navigate."
        ref={flashcardRef}
        onClick={handleFlip}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFlip();
          }
        }}
      >
        <div className="flashcard-inner">
          <div className="flashcard-front">Q: {flashcards[current].q}</div>
          <div className="flashcard-back">A: {flashcards[current].a}</div>
        </div>
      </div>

      <div className="flashcard-controls">
        <button className="btn outline" onClick={handlePrev} disabled={current === 0} aria-label="Previous card">← Prev</button>
        <button className="btn" onClick={handleFlip} aria-label="Flip card">🔄 Flip</button>
        <button className="btn outline" onClick={handleNext} disabled={current === flashcards.length - 1} aria-label="Next card">Next →</button>
      </div>

      <div className="flashcard-actions">
        <button className="btn small" onClick={handleKnown} aria-label="Mark as known">✅ I know this</button>
        <button className="btn wide outline" onClick={handleEndSession} aria-label="End session">✅ End Session</button>
        <button className="btn wide outline" onClick={() => navigate('/student/dashboard')} aria-label="Back to Dashboard">⬅ Back to Dashboard</button>
      </div>
    </div>
  )
}