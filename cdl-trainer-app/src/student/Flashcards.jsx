// src/student/StudentFlashcards.jsx
import { collection, query, where, getDocs } from 'firebase/firestore'
import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '@components/ToastContext'
import { db, auth } from '@utils/firebase.js'
import {
  incrementStudentStudyMinutes,
  logStudySession,
} from '@utils/ui-helpers.js'

const defaultFlashcards = [
  {
    q: 'What is the minimum tread depth for front tires?',
    a: '4/32 of an inch.',
  },
  { q: 'What do you check for on rims?', a: 'Bent, damaged, or rust trails.' },
  {
    q: 'When must you use 3 points of contact?',
    a: 'When entering and exiting the vehicle.',
  },
  {
    q: 'What triggers the spring brake pop-out?',
    a: 'Low air pressure (between 20-45 PSI).',
  },
]

export default function StudentFlashcards() {
  const navigate = useNavigate()
  const flashcardRef = useRef(null)
  const { showToast } = useToast()

  // State
  const [loading, setLoading] = useState(true)
  const [flashcards, setFlashcards] = useState([...defaultFlashcards])
  const [current, setCurrent] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [knownCards, setKnownCards] = useState([])
  const [completed, setCompleted] = useState(false)
  const [startedAt, setStartedAt] = useState(Date.now())
  const [email, setEmail] = useState('')
  const [flipped, setFlipped] = useState(false)

  // Util: shuffle array
  function shuffleArray(arr) {
    return arr
      .map(card => ({ ...card, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ q, a }) => ({ q, a }))
  }

  // Initial load
  useEffect(() => {
    const userEmail =
      auth.currentUser?.email ||
      window.currentUserEmail ||
      localStorage.getItem('currentUserEmail')

    if (!userEmail) {
      showToast('You must be logged in to view this page.', 2300, 'error')
      navigate('/login')
      return
    }
    setEmail(userEmail)

    let userRole = localStorage.getItem('userRole') || 'student'
    ;(async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), where('email', '==', userEmail))
        )
        if (!snap.empty) userRole = snap.docs[0].data().role || userRole
      } catch {
        // Intentionally ignored: user role fallback to localStorage/default
      }
      if (userRole !== 'student') {
        showToast('Flashcards are only available for students.', 2200, 'error')
        navigate('/student-dashboard')
        return
      }

      setShuffle(localStorage.getItem('fcShuffle') === '1')
      setKnownCards(
        JSON.parse(localStorage.getItem('fcKnown_' + userEmail) || '[]')
      )

      const savedIdx = parseInt(
        localStorage.getItem('fcCurrent_' + userEmail) || '0',
        10
      )
      let cards = [...defaultFlashcards]
      if (localStorage.getItem('fcShuffle') === '1') cards = shuffleArray(cards)

      setFlashcards(cards)
      setCurrent(
        !isNaN(savedIdx) && savedIdx >= 0 && savedIdx < cards.length
          ? savedIdx
          : 0
      )
      setStartedAt(Date.now())
      setCompleted(false)
      setLoading(false)
    })()
    // eslint-disable-next-line
  }, [])

  // Save current index
  useEffect(() => {
    if (email) localStorage.setItem('fcCurrent_' + email, current)
  }, [current, email])

  // Keyboard navigation
  useEffect(() => {
    const card = flashcardRef.current
    if (!card) return
    const onKey = e => {
      if (e.key === 'Enter' || e.key === ' ') handleFlip()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
    }
    card.addEventListener('keydown', onKey)
    return () => card.removeEventListener('keydown', onKey)
  }, [current, flashcards.length, handleNext, handlePrev])

  // Touch navigation
  useEffect(() => {
    const card = flashcardRef.current
    if (!card) return
    let startX = null
    const onTouchStart = e => (startX = e.changedTouches[0].clientX)
    const onTouchEnd = e => {
      if (startX === null) return
      const dx = e.changedTouches[0].clientX - startX
      if (Math.abs(dx) > 50) {
        if (dx > 0 && current > 0) handlePrev()
        else if (dx < 0 && current < flashcards.length - 1) handleNext()
      } else handleFlip()
      startX = null
    }
    card.addEventListener('touchstart', onTouchStart)
    card.addEventListener('touchend', onTouchEnd)
    return () => {
      card.removeEventListener('touchstart', onTouchStart)
      card.removeEventListener('touchend', onTouchEnd)
    }
  }, [current, flashcards.length, handleNext, handlePrev])

  // Session complete logging
  useEffect(() => {
    if (!completed) return
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000))
    ;(async () => {
      await incrementStudentStudyMinutes(email, minutes)
      await logStudySession(email, minutes, 'Flashcards')
      showToast('✅ Flashcard session logged!')
    })()
  }, [completed, email, startedAt, showToast])

  // Handlers
  const handleFlip = () => setFlipped(f => !f)
  const handleNext = React.useCallback(() => {
    if (current < flashcards.length - 1) {
      setCurrent(current + 1)
      setFlipped(false)
    }
  }, [current, flashcards.length])
  const handlePrev = React.useCallback(() => {
    if (current > 0) {
      setCurrent(current - 1)
      setFlipped(false)
    }
  }, [current])
  const handleKnown = () => {
    if (!knownCards.includes(current)) {
      const updated = [...knownCards, current]
      setKnownCards(updated)
      localStorage.setItem('fcKnown_' + email, JSON.stringify(updated))
      showToast('Marked as known!')
    }
  }
  const handleShuffleToggle = e => {
    const checked = e.target.checked
    setShuffle(checked)
    localStorage.setItem('fcShuffle', checked ? '1' : '0')
    const newDeck = checked
      ? shuffleArray(defaultFlashcards)
      : [...defaultFlashcards]
    setFlashcards(newDeck)
    setCurrent(0)
    setFlipped(false)
  }
  const handleEndSession = () => setCompleted(true)

  // Render
  if (loading) {
    return (
      <div className="loading-container">
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
        <p>
          You reviewed <b>{flashcards.length}</b> cards.
        </p>
        <p>
          <b>{minutes}</b> study minute{minutes === 1 ? '' : 's'} logged!
        </p>
        <div className="flashcard-complete-actions">
          <button
            className="btn primary"
            onClick={() => {
              setKnownCards([])
              localStorage.setItem('fcKnown_' + email, '[]')
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
              const missed = defaultFlashcards.filter(
                (c, i) => !knownCards.includes(i)
              )
              setFlashcards(missed)
              setKnownCards([])
              setCurrent(0)
              setStartedAt(Date.now())
              setCompleted(false)
            }}
          >
            Review Missed
          </button>
          <button
            className="btn outline"
            onClick={() => navigate('/student-dashboard')}
          >
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
        🃏 Student Flashcards{' '}
        <span className="role-badge student">Student</span>
      </h2>

      <div className="flashcard-progress">
        <progress value={current + 1} max={flashcards.length} />
        <div aria-live="polite">
          Card {current + 1} of {flashcards.length}
        </div>
        <label className="shuffle-toggle">
          <input
            type="checkbox"
            checked={shuffle}
            onChange={handleShuffleToggle}
          />{' '}
          Shuffle
        </label>
        <span>
          Known: {knownCards.length}/{flashcards.length} ({knownPct}%)
        </span>
      </div>

      <div
        className={`flashcard${flipped ? ' flipped' : ''}`}
        tabIndex={0}
        role="button"
        aria-label="Flashcard: Press Enter, Space, or tap to flip. Use Left/Right arrows to navigate."
        ref={flashcardRef}
        onClick={handleFlip}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleFlip()
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            handleNext()
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            handlePrev()
          }
        }}
      >
        <div className="flashcard-inner">
          <div className="flashcard-front">Q: {flashcards[current].q}</div>
          <div className="flashcard-back">A: {flashcards[current].a}</div>
        </div>
      </div>

      <div className="flashcard-controls">
        <button
          className="btn outline"
          onClick={handlePrev}
          disabled={current === 0}
          aria-label="Previous card"
        >
          ← Prev
        </button>
        <button className="btn" onClick={handleFlip} aria-label="Flip card">
          🔄 Flip
        </button>
        <button
          className="btn outline"
          onClick={handleNext}
          disabled={current === flashcards.length - 1}
          aria-label="Next card"
        >
          Next →
        </button>
      </div>

      <div className="flashcard-actions">
        <button className="btn small" onClick={handleKnown} aria-label="Mark as known">
          ✅ I know this
        </button>
        <button className="btn wide outline" onClick={handleEndSession} aria-label="End session">
          ✅ End Session
        </button>
        <button
          className="btn wide outline"
          onClick={() => navigate('/student-dashboard')}
          aria-label="Back to Dashboard"
        >
          ⬅ Back to Dashboard
        </button>
      </div>
    </div>
  )
}
