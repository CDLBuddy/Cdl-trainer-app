// src/student/StudentDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

import { useSession } from '@/App.jsx'
import Shell from '@components/Shell.jsx'
// Firestore helper for the “What’s New” card
import { getLatestUpdate } from '@utils/firebase.js'

// Page-scoped styles
import styles from './StudentDashboard.module.css'

/* ------------------------------------------------------------------ *
 * Local helpers
 * ------------------------------------------------------------------ */
function computeProfileCompletion(profile = {}) {
  const keysToCheck = [
    'name',
    'dob',
    'profilePicUrl',
    'cdlClass',
    'experience',
    'cdlPermit',
    'permitPhotoUrl',
    'driverLicenseUrl',
    'medicalCardUrl',
    'vehicleQualified',
    'emergencyName',
    'emergencyPhone',
    'waiverSigned',
    'course',
    'paymentStatus',
  ]
  const filled = keysToCheck.filter(k => Boolean(profile?.[k])).length
  return Math.round((filled / keysToCheck.length) * 100)
}

function getNextChecklistHint(user = {}) {
  if (!user.cdlClass || !user.cdlPermit || !user.experience) {
    const missing = []
    if (!user.cdlClass) missing.push('CDL class')
    if (!user.cdlPermit) missing.push('CDL permit status')
    if (!user.experience) missing.push('experience level')
    return `Complete your profile: ${missing.join(', ')}.`
  }
  if (user.cdlPermit === 'yes' && !user.permitPhotoUrl) {
    return 'Upload a photo of your CDL permit.'
  }
  if (
    user.vehicleQualified === 'yes' &&
    (!user.truckPlateUrl || !user.trailerPlateUrl)
  ) {
    const which = [
      !user.truckPlateUrl ? 'truck' : null,
      !user.trailerPlateUrl ? 'trailer' : null,
    ]
      .filter(Boolean)
      .join(' & ')
    return `Upload your ${which} data plate photo${which.includes('&') ? 's' : ''}.`
  }
  if (typeof user.lastTestScore === 'number' && user.lastTestScore < 80) {
    return 'Pass a practice test (80%+ required).'
  }
  if (!user.walkthroughProgress || user.walkthroughProgress < 1) {
    return 'Complete at least one walkthrough drill.'
  }
  return 'All required steps complete! 🎉'
}

function formatDate(dateInput) {
  try {
    const d = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */
export default function StudentDashboard() {
  const navigate = useNavigate()
  const { user } = useSession?.() || {}

  // Profile snapshot (from session.user or defaults)
  const profile = useMemo(() => user?.profile || user || {}, [user])
  const profilePct = useMemo(() => computeProfileCompletion(profile), [profile])
  const nextHint = useMemo(() => getNextChecklistHint(profile), [profile])
  const isComplete = /All required steps complete!/i.test(nextHint)

  // Latest update (Firestore → utils/firebase.getLatestUpdate)
  const [latestUpdate, setLatestUpdate] = useState(null)
  const [updatesLoading, setUpdatesLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await getLatestUpdate()
        if (alive) setLatestUpdate(data || null)
      } finally {
        if (alive) setUpdatesLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Set document title
  useEffect(() => {
    const prev = document.title
    document.title = 'Student Dashboard • CDL Trainer'
    return () => {
      document.title = prev
    }
  }, [])

  // Quick links
  const quickLinks = useMemo(
    () => [
      { to: '/student/checklists', label: 'Open Checklists', icon: '📋' },
      { to: '/student/practice-tests', label: 'Practice Tests', icon: '📝' },
      { to: '/student/walkthrough', label: 'Walkthrough', icon: '🚚' },
      { to: '/student/flashcards', label: 'Flashcards', icon: '🗂️' },
    ],
    []
  )

  const lastScore = Number.isFinite(profile?.lastTestScore)
    ? profile.lastTestScore
    : null
  const streakDays = profile?.studyStreakDays ?? 0

  return (
    <Shell title="Student Dashboard" showFab showFooter>
      <div className={styles.wrapper}>
        {/* Row: KPIs */}
        <div className={styles.kpiRow}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiTitle}>Profile Completion</div>
            <div className={styles.kpiValue}>
              {profilePct}
              <span className={styles.kpiUnit}>%</span>
            </div>
            <div
              className={styles.progressTrack}
              aria-label="Profile completion"
            >
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min(100, Math.max(0, profilePct))}%` }}
              />
            </div>
            <div className={styles.kpiHint}>
              {profilePct < 100 ? 'Finish your profile to 100%.' : 'Nice work!'}
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiTitle}>Last Practice Score</div>
            <div className={styles.kpiValue}>
              {lastScore != null ? lastScore : '--'}
              <span className={styles.kpiUnit}>
                {lastScore != null ? '%' : ''}
              </span>
            </div>
            <div className={styles.kpiHint}>
              {lastScore != null
                ? lastScore >= 80
                  ? 'Ready to keep going!'
                  : 'Shoot for 80%+ to pass.'
                : 'Take a practice test to see a score.'}
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiTitle}>Study Streak</div>
            <div className={styles.kpiValue}>
              {streakDays}
              <span className={styles.kpiUnit}>d</span>
            </div>
            <div className={styles.kpiHint}>
              {streakDays > 0
                ? 'Keep that streak alive!'
                : 'Start a session today.'}
            </div>
          </div>
        </div>

        {/* Next step banner */}
        <div
          className={`${styles.banner} ${isComplete ? styles.bannerSuccess : styles.bannerInfo}`}
          role="status"
          aria-live="polite"
        >
          <div className={styles.bannerIcon} aria-hidden>
            {isComplete ? '✅' : '➡️'}
          </div>
          <div className={styles.bannerText}>{nextHint}</div>
          {!isComplete && (
            <button
              type="button"
              className={styles.bannerCta}
              onClick={() => navigate('/student/profile')}
            >
              Fix it
            </button>
          )}
        </div>

        {/* Quick actions */}
        <div className={styles.quickRow}>
          {quickLinks.map(q => (
            <Link key={q.to} to={q.to} className={styles.quickBtn}>
              <span className={styles.quickIcon} aria-hidden>
                {q.icon}
              </span>
              <span>{q.label}</span>
            </Link>
          ))}
        </div>

        {/* Latest Update card */}
        <div className={styles.updateCard}>
          <div className={styles.updateHeader}>
            <span>📢 What’s New</span>
          </div>
          {updatesLoading ? (
            <div className={styles.updateBody} aria-busy="true">
              <div className={styles.updateSkeleton} />
              <div className={styles.updateSkeleton} style={{ width: '70%' }} />
            </div>
          ) : latestUpdate ? (
            <div className={styles.updateBody}>
              <div className={styles.updateContent}>
                {latestUpdate.content || '(No details)'}
              </div>
              <div className={styles.updateMeta}>
                {formatDate(latestUpdate.date)}
              </div>
            </div>
          ) : (
            <div className={styles.updateBody}>
              <div className={styles.updateEmpty}>No recent updates.</div>
            </div>
          )}
        </div>

        {/* Helpful tips */}
        <div className={styles.tipsRow}>
          <div className={styles.tipCard}>
            <div className={styles.tipTitle}>Study Tip</div>
            <div className={styles.tipBody}>
              Say each step of the <b>three-point brake check</b> out loud
              during practice. It sticks.
            </div>
          </div>
          <div className={styles.tipCard}>
            <div className={styles.tipTitle}>Pro Tip</div>
            <div className={styles.tipBody}>
              Use <b>Flashcards</b> when you have 5 minutes—on the bus, in line,
              wherever.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
