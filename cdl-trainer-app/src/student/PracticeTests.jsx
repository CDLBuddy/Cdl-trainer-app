// src/student/PracticeTests.jsx
// ======================================================================
// Student Practice Tests
// - Loads latest results per test for current user
// - Proper alias imports + student-scoped routes under /student/*
// - A11y on progress + buttons, defensive timestamp/math
// ======================================================================

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'

import { db, auth } from '@utils/firebase.js'
import { useToast } from '@components/ToastContext.js'

// TODO: later move this to Firestore/config
const TESTS = ['General Knowledge', 'Air Brakes', 'Combination Vehicles']

function getCurrentUserEmail() {
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

export default function PracticeTests() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  // { [testName]: { pct, passed, lastResult } }
  const [testScores, setTestScores] = useState({})

  const passedCount = useMemo(
    () => Object.values(testScores).filter(s => s?.passed).length,
    [testScores]
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const email = getCurrentUserEmail()
      if (!email) {
        showToast('You must be logged in to view this page.', 'error')
        navigate('/login', { replace: true })
        return
      }

      try {
        // Pull all results once
        const snap = await getDocs(
          query(collection(db, 'testResults'), where('studentId', '==', email))
        )
        const docs = snap.docs.map(d => d.data())

        const next = {}
        for (const test of TESTS) {
          const attempts = docs.filter(r => r?.testName === test)
          if (attempts.length) {
            // robust timestamp extraction
            const toDate = v =>
              (typeof v?.toDate === 'function' ? v.toDate() : v ? new Date(v) : new Date(0))
            const latest = attempts.sort(
              (a, b) => toDate(b.timestamp) - toDate(a.timestamp)
            )[0]
            const correct = Number(latest?.correct ?? 0)
            const total = Math.max(1, Number(latest?.total ?? 1)) // avoid /0
            const pct = Math.round((correct / total) * 100)
            next[test] = { pct, passed: pct >= 80, lastResult: latest }
          }
        }

        if (!cancelled) setTestScores(next)
      } catch (e) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error('Error loading test results:', e)
          showToast('Could not load your test results.', 'error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [navigate, showToast])

  const pctComplete = useMemo(
    () => Math.round((100 * passedCount) / TESTS.length),
    [passedCount]
  )

  const startTest = useCallback(
    (test) => {
      showToast(`Starting "${test}"…`)
      navigate(`/student/test-engine/${encodeURIComponent(test)}`)
    },
    [navigate, showToast]
  )

  const reviewTest = useCallback(
    (test) => {
      showToast(`Loading your last "${test}" result…`)
      navigate(`/student/test-review/${encodeURIComponent(test)}`)
    },
    [navigate, showToast]
  )

  if (loading) {
    return (
      <div className="screen-wrapper" role="status" aria-live="polite" style={{ textAlign: 'center', marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading practice tests…</p>
      </div>
    )
  }

  return (
    <div className="screen-wrapper fade-in" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h2 className="dash-head" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        🧪 Student Practice Tests
        <span style={{ marginLeft: 'auto', fontSize: '1em' }}>
          <span className="progress-label" title="Tests Passed">
            {passedCount}/{TESTS.length} Passed
          </span>
        </span>
      </h2>

      <div className="progress-track" aria-label="Completion progress" style={{ marginBottom: '1.3rem' }}>
        <div className="progress-fill" style={{ width: `${pctComplete}%` }} />
      </div>

      <p style={{ marginBottom: '1.4rem' }}>
        Select a practice test to begin or review:
      </p>

      <div className="test-list">
        {TESTS.map((name) => {
          const data = testScores[name]

          const mainBtn = (
            <button
              className={`btn wide ${data ? 'retake-btn' : 'start-btn'}`}
              onClick={() => startTest(name)}
              aria-label={`${data ? 'Retake' : 'Start'} ${name}`}
            >
              {data ? '🔁 Retake' : '🚦 Start'}
            </button>
          )

          const reviewBtn = data ? (
            <button
              className="btn wide outline review-btn"
              onClick={() => reviewTest(name)}
              aria-label={`Review ${name}`}
            >
              🧾 Review
            </button>
          ) : null

          const scoreBadge = data ? (
            data.passed ? (
              <span className="badge badge-success" aria-label={`${name} passed with ${data.pct}%`}>
                ✅ {data.pct}%
              </span>
            ) : (
              <span className="badge badge-fail" aria-label={`${name} scored ${data.pct}%`}>
                ❌ {data.pct}%
              </span>
            )
          ) : (
            <span className="badge badge-neutral" aria-label={`${name} not attempted`}>
              ⏳ Not attempted
            </span>
          )

          return (
            <div className="glass-card" key={name} style={{ marginBottom: '1.2rem', padding: 18 }}>
              <h3 style={{ marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                {name} {scoreBadge}
              </h3>
              <div className="btn-grid">
                {mainBtn}
                {reviewBtn}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          className="btn outline wide"
          aria-label="Back to Dashboard"
          onClick={() => navigate('/student/dashboard')}
        >
          ⬅ Back to Dashboard
        </button>
      </div>
    </div>
  )
}