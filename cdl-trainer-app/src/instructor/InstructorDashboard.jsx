// src/instructor/InstructorDashboard.jsx
import { collection, query, where, getDocs } from 'firebase/firestore'
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import Shell from '@components/Shell.jsx'
import { db, auth } from '@utils/firebase.js'
import { getNextChecklistAlert } from '@utils/ui-helpers.js'

import { useToast } from '@/components/ToastContext.js'

import styles from './InstructorDashboard.module.css'

// ---- helpers ---------------------------------------------------------------
function getCurrentUserEmail() {
  return (
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    auth?.currentUser?.email ||
    null
  )
}

const pct = (n, d) =>
  d ? Math.max(0, Math.min(100, Math.round((n / d) * 100))) : 0

const PINNED_KEY = 'instructorPinnedStudents'
const DENSITY_KEY = 'instructorDensity' // "comfortable" | "compact"
const PIN_FILTER_KEY = 'instructorShowPinnedOnly' // persist pin filter

const dt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export default function InstructorDashboard() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const { showToast } = useToast()

  // loading + data
  const [loading, setLoading] = useState(true)
  const [assignedStudents, setAssignedStudents] = useState([])
  const [latestByStudent, setLatestByStudent] = useState({})

  // UI state
  const [queryText, setQueryText] = useState('')
  const [pinned, setPinned] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'))
    } catch {
      return new Set()
    }
  })
  const [density, setDensity] = useState(() => {
    const saved = localStorage.getItem(DENSITY_KEY)
    return saved === 'compact' ? 'compact' : 'comfortable'
  })
  const [showPinnedOnly, setShowPinnedOnly] = useState(() => {
    return localStorage.getItem(PIN_FILTER_KEY) === '1'
  })

  // allow aborting async work on unmount (best-effort guard)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // map of email -> element for scroll/focus
  const rowRefs = useRef(new Map())
  const setRowRef = useCallback((email, el) => {
    if (!el) rowRefs.current.delete(email)
    else rowRefs.current.set(email, el)
  }, [])

  // kickoff: fetch instructor profile, students, and latest test results
  useEffect(() => {
    const run = async () => {
      const email = getCurrentUserEmail()
      if (!email) {
        showToast('No user found. Please log in again.', 'error')
        navigate('/login', { replace: true })
        return
      }

      setLoading(true)

      // 1) profile / role gate
      let prof = {}
      let role = 'instructor'
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), where('email', '==', email))
        )
        if (!snap.empty) {
          prof = snap.docs[0].data() || {}
          role = prof.role || 'instructor'
        }
      } catch (err) {
        console.error('Profile fetch failed:', err)
      }

      if (role !== 'instructor') {
        showToast('Access denied: Instructor dashboard only.', 'error')
        navigate('/login', { replace: true })
        return
      }
      if (!alive.current) return

      // 2) assigned students
      let students = []
      try {
        const sSnap = await getDocs(
          query(
            collection(db, 'users'),
            where('assignedInstructor', '==', email)
          )
        )
        students = sSnap.docs.map(d => {
          const x = d.data()
          return {
            id: d.id,
            name: x.name || 'Student',
            email: x.email,
            cdlClass: x.cdlClass || 'Not set',
            experience: x.experience || 'Unknown',
            cdlPermit: x.cdlPermit || 'no',
            permitPhotoUrl: x.permitPhotoUrl || '',
            medicalCardUrl: x.medicalCardUrl || '',
            profileProgress: Math.max(0, Math.min(100, x.profileProgress || 0)),
            checklistAlerts: getNextChecklistAlert(x),
          }
        })
      } catch (err) {
         
        console.error('Assigned students fetch error:', err)
        showToast('Error fetching assigned students.', 'error')
      }
      if (!alive.current) return
      setAssignedStudents(students)

      // 3) latest test results per student
      const results = {}
      try {
        await Promise.all(
          students.map(async s => {
            const tSnap = await getDocs(
              query(
                collection(db, 'testResults'),
                where('studentId', '==', s.email)
              )
            )
            let latest = null
            tSnap.forEach(doc => {
              const t = doc.data()
              const tDate = t.timestamp?.toDate?.() || new Date(t.timestamp || 0)
              const lDate =
                latest?.timestamp?.toDate?.() ||
                new Date(latest?.timestamp || 0)
              if (!latest || tDate > lDate) latest = t
            })
            if (latest) {
              const rawDate = latest.timestamp?.toDate?.()
                ? latest.timestamp.toDate()
                : new Date(latest.timestamp)
              results[s.email] = {
                testName: latest.testName,
                pct: pct(latest.correct, latest.total),
                date: Number.isNaN(rawDate?.getTime()) ? '--' : dt.format(rawDate),
              }
            }
          })
        )
      } catch (err) {
         
        console.error('Latest test results error:', err)
        showToast('Error fetching test results.', 'error')
      }
      setLatestByStudent(results)
      setLoading(false)
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // persist pins, density, and pinned-only toggle
  useEffect(() => {
    try {
      localStorage.setItem(PINNED_KEY, JSON.stringify(Array.from(pinned)))
    } catch {
      /* ignore */
    }
  }, [pinned])
  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, density)
  }, [density])
  useEffect(() => {
    localStorage.setItem(PIN_FILTER_KEY, showPinnedOnly ? '1' : '0')
  }, [showPinnedOnly])

  // navigation helpers (align with your InstructorRouter)
  const viewStudentProfile = useCallback(
    email =>
      navigate(`/instructor/student-profile/${encodeURIComponent(email)}`),
    [navigate]
  )
  const reviewChecklist = useCallback(
    email =>
      navigate(
        `/instructor/checklist-review?student=${encodeURIComponent(email)}`
      ),
    [navigate]
  )

  // query param focus (e.g., ?student=foo@bar.com)
  const focusStudentEmail = search.get('student') || null
  // auto scroll to card when present
  useEffect(() => {
    if (!focusStudentEmail) return
    const el = rowRefs.current.get(focusStudentEmail)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add(styles.studentCardFocus)
      const t = setTimeout(() => el.classList.remove(styles.studentCardFocus), 1800)
      return () => clearTimeout(t)
    }
  }, [focusStudentEmail])

  // filter + sort (pinned float to top, then name)
  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase()
    let list = assignedStudents

    if (q) {
      list = list.filter(s => {
        const hay = `${s.name || ''} ${s.email || ''}`.toLowerCase()
        return hay.includes(q)
      })
    }
    if (showPinnedOnly) {
      list = list.filter(s => pinned.has(s.email))
    }

    // sort: pinned first, then alpha by name
    return [...list].sort((a, b) => {
      const aPinned = pinned.has(a.email)
      const bPinned = pinned.has(b.email)
      if (aPinned !== bPinned) return aPinned ? -1 : 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [assignedStudents, queryText, pinned, showPinnedOnly])

  const togglePin = useCallback(email => {
    setPinned(set => {
      const next = new Set(set)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }, [])

  // counts for small summary hint
  const pinnedCount = useMemo(
    () => assignedStudents.filter(s => pinned.has(s.email)).length,
    [assignedStudents, pinned]
  )

  // skeleton
  if (loading) {
    return (
      <Shell title="Instructor Dashboard">
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <div className="spinner" />
          <p>Loading instructor dashboard…</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title="Instructor Dashboard">
      <div className={styles.wrapper}>
        {/* Toolbar: search + density + export + pin filter */}
        <div className={styles.actions}>
          <div className={styles.toolbar}>
            {/* Search */}
            <div className={styles.search}>
              <input
                type="search"
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
                placeholder="Search students by name or email…"
                aria-label="Search students"
                onKeyDown={e => {
                  if (e.key === 'Escape' && queryText) setQueryText('')
                }}
              />
              {queryText && (
                <button
                  className={styles.clearBtn}
                  type="button"
                  onClick={() => setQueryText('')}
                  aria-label="Clear search"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Pin filter */}
            <label
              className="u-field is-inline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <input
                type="checkbox"
                checked={showPinnedOnly}
                onChange={e => setShowPinnedOnly(e.target.checked)}
                aria-label="Show pinned students only"
              />
              <span className="u-label" style={{ margin: 0 }}>
                Show pinned only ({pinnedCount})
              </span>
            </label>

            {/* Density */}
            <div
              className={styles.densityToggle}
              role="group"
              aria-label="Density"
            >
              <button
                type="button"
                className={density === 'comfortable' ? styles.active : ''}
                onClick={() => setDensity('comfortable')}
                aria-pressed={density === 'comfortable'}
                title="Comfortable spacing"
              >
                Comfortable
              </button>
              <button
                type="button"
                className={density === 'compact' ? styles.active : ''}
                onClick={() => setDensity('compact')}
                aria-pressed={density === 'compact'}
                title="Compact spacing"
              >
                Compact
              </button>
            </div>

            {/* Export */}
            <button className="btn outline" onClick={handleExportCSV}>
              ⬇️ Export CSV
            </button>
          </div>
        </div>

        {/* Assigned Students */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>📋 Assigned Students</div>

          {filtered.length === 0 ? (
            <div className={styles.empty}>
              {queryText || showPinnedOnly
                ? 'No students match your filters.'
                : 'No students assigned to you yet.'}
            </div>
          ) : (
            <div
              className={`${styles.studentGrid} ${
                density === 'compact' ? styles.compact : ''
              }`}
            >
              {filtered.map(s => {
                const last = latestByStudent[s.email]
                const ok =
                  s.checklistAlerts === 'All required steps complete! 🎉'
                const isPinned = pinned.has(s.email)

                return (
                  <div
                    key={s.email}
                    ref={el => setRowRef(s.email, el)}
                    className={`${styles.studentCard} ${
                      isPinned ? styles.pinned : ''
                    }`}
                  >
                    <div className={styles.studentTop}>
                      <div className={styles.topRow}>
                        <button
                          className={styles.studentNameBtn}
                          onClick={() => viewStudentProfile(s.email)}
                          title="Open profile"
                        >
                          {s.name}
                        </button>
                        <button
                          type="button"
                          className={styles.pinBtn}
                          aria-pressed={isPinned}
                          onClick={() => togglePin(s.email)}
                          title={isPinned ? 'Unpin' : 'Pin'}
                        >
                          {isPinned ? '📌' : '📍'}
                        </button>
                      </div>

                      <div className={styles.metaRow}>
                        <span className={styles.meta}>
                          CDL Class: {s.cdlClass}
                        </span>
                        <span className={styles.meta}>
                          Experience: {s.experience}
                        </span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.meta}>
                          Permit:{' '}
                          {s.cdlPermit === 'yes' && s.permitPhotoUrl
                            ? '✔️ Uploaded'
                            : '❌ Not Uploaded'}
                        </span>
                        <span className={styles.meta}>
                          Med Card:{' '}
                          {s.medicalCardUrl ? '✔️ Uploaded' : '❌ Not Uploaded'}
                        </span>
                      </div>
                    </div>

                    {/* Profile completion */}
                    <div className={styles.progressBlock}>
                      <div className={styles.progressLabel}>
                        Profile Completion
                      </div>
                      <div className={styles.progressTrack} aria-hidden="true">
                        <div
                          className={styles.progressFill}
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, s.profileProgress)
                            )}%`,
                          }}
                        />
                      </div>
                      <div className={styles.progressPct}>
                        {s.profileProgress}%
                      </div>
                    </div>

                    {/* Checklist status */}
                    <div
                      className={`${styles.alert} ${
                        ok ? styles.alertOk : styles.alertWarn
                      }`}
                    >
                      {ok
                        ? '✔️ All requirements met'
                        : `⚠️ ${s.checklistAlerts}`}
                    </div>

                    {/* Last test */}
                    <div className={styles.lastTest}>
                      Last Test:{' '}
                      {last
                        ? `${last.testName} – ${last.pct}% on ${last.date}`
                        : 'No recent test'}
                    </div>

                    {/* Actions */}
                    <div className={styles.rowActions}>
                      <button
                        className="btn"
                        onClick={() => viewStudentProfile(s.email)}
                      >
                        View Profile
                      </button>
                      <button
                        className="btn outline"
                        onClick={() => reviewChecklist(s.email)}
                      >
                        Review Checklist
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Guidance cards */}
        <div className={styles.twoUp}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>✅ Review Checklists</div>
            <div className={styles.cardBody}>
              Sign off on student milestones (permit, walkthrough, etc).
              <br />
              Select a student above and click <b>“Review Checklist”</b>.
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>🧾 Student Test Results</div>
            <div className={styles.cardBody}>
              See latest practice and official test results for your assigned
              students above.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )

  // ---- CSV export (kept at bottom for readability) -----------------------
  function handleExportCSV() {
    const headers = [
      'Name',
      'Email',
      'CDL Class',
      'Experience',
      'Permit',
      'Med Card',
      'Profile Completion',
      'Checklist Alerts',
      'Last Test',
    ]

    const rows = filtered.map(s => {
      const last = latestByStudent[s.email]
      const lastStr = last
        ? `${last.testName} - ${last.pct}% on ${last.date}`
        : 'No recent test'
      const permitStr =
        s.cdlPermit === 'yes' && s.permitPhotoUrl ? 'Uploaded' : 'Not Uploaded'
      const medStr = s.medicalCardUrl ? 'Uploaded' : 'Not Uploaded'
      return [
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.email || '').replace(/"/g, '""')}"`,
        `"${(s.cdlClass || '').replace(/"/g, '""')}"`,
        `"${(s.experience || '').replace(/"/g, '""')}"`,
        `"${permitStr}"`,
        `"${medStr}"`,
        `"${s.profileProgress}%"`,
        `"${(s.checklistAlerts || '').replace(/"/g, '""')}"`,
        `"${lastStr.replace(/"/g, '""')}"`,
      ]
    })

    const csv = [headers, ...rows].map(r => r.join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const stamp = new Date().toISOString().slice(0, 10)
    a.download = `assigned-students-${stamp}.csv`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      URL.revokeObjectURL(url)
      a.remove()
    }, 250)
    showToast('CSV export downloaded.', 'success')
  }
}