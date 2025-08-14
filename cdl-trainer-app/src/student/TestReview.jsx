// src/student/TestReview.jsx
import { collection, query, where, getDocs } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useToast } from '@/components/ToastContext.js'
import { db } from '@utils/firebase.js'
import {
  incrementStudentStudyMinutes,
  logStudySession,
  markStudentTestPassed,
  getUserProgress,
} from '@utils/ui-helpers.js'

// Centralized email getter
function getCurrentUserEmail() {
  return (
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    (window.auth?.currentUser && window.auth.currentUser.email) ||
    null
  )
}

function toJSDate(ts) {
  if (!ts) return null
  try {
    if (typeof ts.toDate === 'function') return ts.toDate()
    const d = new Date(ts)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

export default function TestReview() {
  const { testName } = useParams() // /student/test-review/:testName
  const [loading, setLoading] = useState(true)
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      setError('')

      const currentUserEmail = getCurrentUserEmail()
      if (!currentUserEmail) {
        if (!cancelled) {
          setError('You must be logged in to view this page.')
          setLoading(false)
        }
        return
      }

      if (!testName) {
        if (!cancelled) {
          setError('No test selected.')
          setLoading(false)
        }
        return
      }

      try {
        // Pull all results for this user; filter to this test and sort newest first
        const snap = await getDocs(
          query(
            collection(db, 'testResults'),
            where('studentId', '==', currentUserEmail)
          )
        )

        const results = snap.docs
          .map(d => d.data())
          .filter(d => d.testName === testName)
          .sort((a, b) => {
            const da = toJSDate(a.timestamp) || new Date(0)
            const db = toJSDate(b.timestamp) || new Date(0)
            return db - da
          })

        if (!results.length) {
          if (!cancelled) {
            setError('No results found for this test.')
            setLoading(false)
          }
          return
        }

        const latest = results[0]
        const total = Number(latest.total) || 0
        const correct = Number(latest.correct) || 0
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0

        // Milestone: mark passed once at >= 80%
        if (pct >= 80) {
          try {
            const progress = await getUserProgress(currentUserEmail)
            if (!progress?.practiceTestPassed) {
              await markStudentTestPassed(currentUserEmail)
              showToast(
                '🎉 Practice Test milestone complete! Progress updated.'
              )
            }
          } catch (e) {
            // Non-fatal
            console.warn('Could not update practice test milestone:', e)
          }
        }

        // Log study minutes + session (non-fatal)
        const minutes = Number(latest?.durationMinutes) || 5
        try {
          await incrementStudentStudyMinutes(currentUserEmail, minutes)
          await logStudySession(
            currentUserEmail,
            minutes,
            `Practice Test: ${testName}`
          )
        } catch (e) {
          console.warn('Could not log study session:', e)
        }

        if (!cancelled) {
          setReview({ correct, total, pct })
          setLoading(false)
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setError('Failed to load review data.')
          showToast('Could not load your review.', 2500, 'error')
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [testName, showToast])

  const goBack = () => navigate('/student/practice-tests')

  if (loading) {
    return (
      <div
        className="screen-wrapper fade-in"
        style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}
        role="status"
        aria-live="polite"
      >
        <h2>🧾 {testName || 'Test'} Review</h2>
        <p>Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="screen-wrapper fade-in"
        style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}
      >
        <h2>🧾 {testName || 'Test'} Review</h2>
        <p>{error}</p>
        <div style={{ marginTop: 20 }}>
          <button className="btn outline" onClick={goBack}>
            ⬅ Back to Practice Tests
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="screen-wrapper fade-in"
      style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}
    >
      <h2>🧾 {testName} Review</h2>
      <p>
        You scored{' '}
        <strong>
          {review.correct}/{review.total}
        </strong>{' '}
        ({review.pct}%)
      </p>
      <p>
        <em>Question-level review coming soon!</em>
      </p>
      <div style={{ marginTop: 20 }}>
        <button className="btn outline" onClick={goBack}>
          ⬅ Back to Practice Tests
        </button>
      </div>
    </div>
  )
}
