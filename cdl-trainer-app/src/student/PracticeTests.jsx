// src/student/PracticeTests.jsx
import { collection, query, where, getDocs } from 'firebase/firestore'
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { db, auth } from '@utils/firebase.js'
import { showToast } from '@utils/ui-helpers.js'

// TODO: later move this to Firestore/config
const TESTS = ['General Knowledge', 'Air Brakes', 'Combination Vehicles']

function getCurrentUserEmail() {
  return (
    auth?.currentUser?.email ||
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    null
  )
}

export default function PracticeTests() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [testScores, setTestScores] = useState({}) // { [testName]: { pct, passed, lastResult } }

  const passedCount = useMemo(
    () => Object.values(testScores).filter(s => s?.passed).length,
    [testScores]
  )

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      const currentUserEmail = getCurrentUserEmail()

      if (!currentUserEmail) {
        showToast('You must be logged in to view this page.', 2300, 'error')
        navigate('/login', { replace: true })
        return
      }

      try {
        // Load all results for the user once
        const snap = await getDocs(
          query(
            collection(db, 'testResults'),
            where('studentId', '==', currentUserEmail)
          )
        )

        // Build scores for just the tests we show
        const docs = snap.docs.map(d => d.data())
        const next = {}
        for (const test of TESTS) {
          const attempts = docs.filter(r => r.testName === test)
          if (attempts.length) {
            const latest = attempts.sort(
              (a, b) =>
                (b.timestamp?.toDate?.() || new Date(b.timestamp)) -
                (a.timestamp?.toDate?.() || new Date(a.timestamp))
            )[0]
            const pct = Math.round((latest.correct / latest.total) * 100)
            next[test] = { pct, passed: pct >= 80, lastResult: latest }
          }
        }
        if (!cancelled) setTestScores(next)
      } catch (e) {
        if (!cancelled) {
          console.error('Error loading test results:', e)
          showToast('Could not load your test results.', 2500, 'error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [navigate])

  const pctComplete = useMemo(
    () => Math.round((100 * passedCount) / TESTS.length),
    [passedCount]
  )

  const startTest = useCallback(
    test => {
      showToast(`Starting "${test}"…`)
      navigate(`/student/test-engine/${encodeURIComponent(test)}`)
    },
    [navigate]
  )

  const reviewTest = useCallback(
    test => {
      showToast(`Loading your last "${test}" result…`)
      navigate(`/student/test-review/${encodeURIComponent(test)}`)
    },
    [navigate]
  )

  if (loading) {
    return (
      <div
        className="screen-wrapper"
        style={{ textAlign: 'center', marginTop: 40 }}
      >
        <div className="spinner" />
        <p>Loading practice tests…</p>
      </div>
    )
  }

  return (
    <div
      className="screen-wrapper fade-in"
      style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}
    >
      <h2
        className="dash-head"
        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
      >
        🧪 Student Practice Tests
        <span style={{ marginLeft: 'auto', fontSize: '1em' }}>
          <span className="progress-label" title="Tests Passed">
            {passedCount}/{TESTS.length} Passed
          </span>
        </span>
      </h2>

      <div className="progress-track" style={{ marginBottom: '1.3rem' }}>
        <div className="progress-fill" style={{ width: `${pctComplete}%` }} />
      </div>

      <p style={{ marginBottom: '1.4rem' }}>
        Select a practice test to begin or review:
      </p>

      <div className="test-list">
        {TESTS.map(name => {
          const data = testScores[name]

          const mainBtn = data ? (
            <button
              className="btn wide retake-btn"
              onClick={() => startTest(name)}
            >
              🔁 Retake
            </button>
          ) : (
            <button
              className="btn wide start-btn"
              onClick={() => startTest(name)}
            >
              🚦 Start
            </button>
          )

          const reviewBtn = data ? (
            <button
              className="btn wide outline review-btn"
              onClick={() => reviewTest(name)}
            >
              🧾 Review
            </button>
          ) : null

          const scoreBadge = data ? (
            data.passed ? (
              <span className="badge badge-success">✅ {data.pct}%</span>
            ) : (
              <span className="badge badge-fail">❌ {data.pct}%</span>
            )
          ) : (
            <span className="badge badge-neutral">⏳ Not attempted</span>
          )

          return (
            <div
              className="glass-card"
              key={name}
              style={{ marginBottom: '1.2rem', padding: 18 }}
            >
              <h3
                style={{
                  marginBottom: '0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
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
