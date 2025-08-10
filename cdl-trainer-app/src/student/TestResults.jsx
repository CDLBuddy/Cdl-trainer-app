// src/student/TestResults.jsx
import { getDocs, query, collection, where } from 'firebase/firestore'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { db } from '@utils/firebase.js'
import { useToast } from '@utils/ui-helpers.js'

// ---------- helpers ----------
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

async function fetchAllStudents() {
  const userSnap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'student'))
  )
  const students = {}
  userSnap.docs.forEach(doc => {
    const data = doc.data()
    if (data?.email) students[data.email] = data
  })
  return students
}

async function fetchResultsForEmail(email) {
  const snap = await getDocs(
    query(collection(db, 'testResults'), where('studentId', '==', email))
  )
  return snap.docs.map(d => {
    const data = d.data()
    const date = toJSDate(data.timestamp) || new Date(0)
    return { ...data, timestamp: date, studentId: email }
  })
}

function getCurrentUserEmail() {
  return (
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    (window.auth?.currentUser && window.auth.currentUser.email) ||
    null
  )
}

function getRole() {
  return localStorage.getItem('userRole') || 'student'
}

// ---------- component ----------
export default function TestResults() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState([])
  const [students, setStudents] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [modalEmail, setModalEmail] = useState(null)

  const role = useMemo(getRole, [])
  const isStaff =
    role === 'admin' || role === 'instructor' || role === 'superadmin'

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)

      const email = getCurrentUserEmail()
      if (!email) {
        if (!cancelled) {
          setResults([])
          setStudents({})
          setLoading(false)
        }
        return
      }

      try {
        // decide the emails to query
        let studentMap = {}
        let emails = [email]

        if (isStaff) {
          studentMap = await fetchAllStudents()
          emails = Object.keys(studentMap)
        }

        // fetch all in parallel
        const all = (await Promise.all(emails.map(fetchResultsForEmail))).flat()

        // sort newest first
        all.sort((a, b) => b.timestamp - a.timestamp)

        if (!cancelled) {
          setStudents(studentMap)
          setResults(all)
        }
      } catch (e) {
        console.error('Failed to load test results:', e)
        if (!cancelled) showToast('Could not load test results.', 2400, 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [isStaff, showToast])

  function handleExportCSV() {
    const rows = [
      ['Name', 'Email', 'Test', 'Score', 'Date'],
      ...results.map(r => {
        const name = students[r.studentId]?.name || r.studentId || 'Unknown'
        const total = Number(r.total) || 0
        const correct = Number(r.correct) || 0
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0
        const date = r.timestamp?.toLocaleDateString?.() || ''
        return [
          name,
          r.studentId,
          r.testName,
          `${pct}% (${correct}/${total})`,
          date,
        ]
      }),
    ]

    const csv = rows
      .map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'cdl-test-results.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  if (!getCurrentUserEmail()) {
    return (
      <div
        className="screen-wrapper fade-in"
        style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}
      >
        <h2>📊 Student Test Results</h2>
        <p>You must be logged in to view this page.</p>
      </div>
    )
  }

  return (
    <div
      className="screen-wrapper fade-in"
      style={{ padding: 20, maxWidth: 700, margin: '0 auto' }}
      aria-busy={loading ? 'true' : 'false'}
    >
      <h2>📊 {isStaff ? 'All Student ' : ''}Test Results</h2>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <table
            className="test-results-table"
            style={{ width: '100%', marginBottom: 12 }}
          >
            <thead>
              <tr>
                {isStaff && <th scope="col">Name</th>}
                <th scope="col">Test</th>
                <th scope="col">Score</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={isStaff ? 4 : 3}>No test results found.</td>
                </tr>
              ) : (
                results.map((r, i) => {
                  const total = Number(r.total) || 0
                  const correct = Number(r.correct) || 0
                  const pct =
                    total > 0 ? Math.round((correct / total) * 100) : 0
                  const date = r.timestamp?.toLocaleDateString?.() || ''
                  const name =
                    students[r.studentId]?.name || r.studentId || 'Unknown'

                  return (
                    <tr key={`${r.studentId}-${r.testName}-${i}`}>
                      {isStaff && (
                        <td>
                          <button
                            type="button"
                            className="link-like student-name-link"
                            style={{
                              color: '#b48aff',
                              fontWeight: 600,
                              textDecoration: 'underline dotted',
                              cursor: 'pointer',
                              background: 'none',
                              border: 0,
                              padding: 0,
                            }}
                            onClick={() => {
                              setModalEmail(r.studentId)
                              setShowModal(true)
                            }}
                          >
                            {name}
                          </button>
                        </td>
                      )}
                      <td>{r.testName}</td>
                      <td>
                        <b>{pct}%</b>{' '}
                        <span style={{ color: '#888' }}>
                          ({correct}/{total})
                        </span>
                      </td>
                      <td>{date}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          <div
            style={{ textAlign: 'center', marginTop: 18 }}
            className="u-flex u-gap-8 u-wrap u-center"
          >
            <button
              className="btn outline"
              onClick={() => navigate('/student/dashboard')}
            >
              ⬅ Back to Dashboard
            </button>

            <button
              className="btn"
              onClick={() => navigate('/student/practice-tests')}
            >
              🔄 Retake a Test
            </button>

            {isStaff && (
              <button className="btn" onClick={handleExportCSV}>
                ⬇️ Export CSV
              </button>
            )}
          </div>
        </>
      )}

      {showModal && modalEmail && (
        <StudentDetailsModal
          email={modalEmail}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ---------- modal ----------
function StudentDetailsModal({ email, onClose }) {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), where('email', '==', email))
        )
        const data = snap.empty ? null : snap.docs[0].data()
        if (!cancelled) setProfile(data)
      } catch (_e) {
        if (!cancelled) setProfile(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [email])

  return (
    <div
      className="modal-overlay fade-in"
      tabIndex={-1}
      style={{ zIndex: 1200 }}
    >
      <div
        className="modal-card glass"
        style={{ maxWidth: 460, margin: '40px auto' }}
      >
        <button
          className="modal-close"
          style={{ float: 'right', fontSize: '1.7em' }}
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>

        <div className="student-modal-content" style={{ padding: 18 }}>
          {!profile ? (
            <h3>Loading…</h3>
          ) : (
            <>
              <h3>
                {profile.name || '(No Name)'}{' '}
                <span className="role-badge">{profile.role || ''}</span>
              </h3>

              <div
                style={{ color: '#999', marginBottom: 7, fontSize: '0.98em' }}
              >
                {email}
              </div>

              <ul
                className="profile-fields"
                style={{ listStyle: 'none', padding: '0 0 7px 0' }}
              >
                <li>
                  <strong>DOB:</strong> {profile.dob || '--'}
                </li>
                <li>
                  <strong>Permit Status:</strong>{' '}
                  {profile.cdlPermit === 'yes'
                    ? '✅ Yes'
                    : profile.cdlPermit === 'no'
                      ? '❌ No'
                      : '--'}
                </li>
                <li>
                  <strong>Profile Progress:</strong>{' '}
                  {profile.profileProgress || 0}%
                </li>
                <li>
                  <strong>Endorsements:</strong>{' '}
                  {(profile.endorsements || []).join(', ') || '--'}
                </li>
                <li>
                  <strong>Restrictions:</strong>{' '}
                  {(profile.restrictions || []).join(', ') || '--'}
                </li>
                <li>
                  <strong>Experience:</strong> {profile.experience || '--'}
                </li>
                <li>
                  <strong>Vehicle Qualified:</strong>{' '}
                  {profile.vehicleQualified === 'yes' ? '✅' : '❌'}
                </li>
              </ul>

              {profile.profilePicUrl ? (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={profile.profilePicUrl}
                    alt="Profile"
                    style={{
                      width: 90,
                      height: 90,
                      objectFit: 'cover',
                      borderRadius: 10,
                      border: '1.5px solid #b48aff',
                      marginBottom: 7,
                    }}
                  />
                </div>
              ) : null}

              <div style={{ marginTop: 10, textAlign: 'center' }}>
                <button
                  className="btn"
                  style={{ marginTop: 9 }}
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
