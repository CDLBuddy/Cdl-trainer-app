// src/student/StudentDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Shell from '@components/Shell.jsx'
import { getLatestUpdate } from '@/utils/firebase.js'
import { useSession } from '@session/useSession.js'
import { StudentRoutes } from '@navigation/navigation.js'

import styles from './StudentDashboard.module.css'

/* ------------------------------------------------------------------ *
 * Local helpers
 * ------------------------------------------------------------------ */
function clamp01to100(n) {
  const x = Number.isFinite(n) ? n : 0
  return Math.max(0, Math.min(100, Math.round(x)))
}

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
  return clamp01to100((filled / keysToCheck.length) * 100)
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
  if (user.vehicleQualified === 'yes' && (!user.truckPlateUrl || !user.trailerPlateUrl)) {
    const which = [
      !user.truckPlateUrl ? 'truck' : null,
      !user.trailerPlateUrl ? 'trailer' : null,
    ].filter(Boolean).join(' & ')
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
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */
export default function StudentDashboard() {
  const navigate = useNavigate()
  const { user } = useSession() || {}

  const profile = useMemo(() => user?.profile || user || {}, [user])
  const profilePct = useMemo(() => computeProfileCompletion(profile), [profile])
  const nextHint = useMemo(() => getNextChecklistHint(profile), [profile])
  const isComplete = nextHint.startsWith('All required steps complete')

  // Latest update card
  const [latestUpdate, setLatestUpdate] = useState(null)
  const [updatesLoading, setUpdatesLoading] = useState(true)
  const [updatesError, setUpdatesError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await getLatestUpdate()
        if (!alive) return
        setLatestUpdate(data || null)
        setUpdatesError(null)
      } catch (err) {
        if (!alive) return
        setUpdatesError(err || new Error('Failed to load updates'))
      } finally {
        if (alive) setUpdatesLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  // Title (Shell renders header; we still set document title for the tab)
  useEffect(() => {
    const prev = document.title
    document.title = 'Student Dashboard • CDL Trainer'
    return () => { document.title = prev }
  }, [])

  const quickLinks = useMemo(
    () => [
      { to: StudentRoutes.checklists(),   label: 'Open Checklists', icon: '📋' },
      { to: StudentRoutes.practiceTests(), label: 'Practice Tests',  icon: '📝' },
      { to: StudentRoutes.walkthrough(),   label: 'Walkthrough',     icon: '🚚' },
      { to: StudentRoutes.flashcards(),    label: 'Flashcards',      icon: '🗂️' },
    ],
    []
  )

  const lastScore = Number.isFinite(profile?.lastTestScore) ? profile.lastTestScore : null
  const streakDays = Number.isFinite(profile?.studyStreakDays) ? profile.studyStreakDays : 0

  const goProfile = useCallback(() => navigate(StudentRoutes.profile()), [navigate])

  const progressNow = Math.min(100, Math.max(0, profilePct))

  return (
    <Shell title="Student Dashboard" showFab showFooter>
      <div className={styles.wrapper}>
        {/* KPIs */}
        <section className={styles.kpiRow} aria-label="Key metrics">
          <article className={styles.kpiCard}>
            <h3 className={styles.kpiTitle}>Profile Completion</h3>
            <div className={styles.kpiValue}>
              {profilePct}<span className={styles.kpiUnit}>%</span>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label="Profile completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressNow}
            >
              <div className={styles.progressFill} style={{ width: `${progressNow}%` }} />
            </div>
            <p className={styles.kpiHint}>
              {profilePct < 100 ? 'Finish your profile to 100%.' : 'Nice work!'}
            </p>
          </article>

          <article className={styles.kpiCard}>
            <h3 className={styles.kpiTitle}>Last Practice Score</h3>
            <div className={styles.kpiValue}>
              {lastScore != null ? lastScore : '--'}
              <span className={styles.kpiUnit}>{lastScore != null ? '%' : ''}</span>
            </div>
            <p className={styles.kpiHint}>
              {lastScore != null
                ? lastScore >= 80
                  ? 'Ready to keep going!'
                  : 'Shoot for 80%+ to pass.'
                : 'Take a practice test to see a score.'}
            </p>
          </article>

          <article className={styles.kpiCard}>
            <h3 className={styles.kpiTitle}>Study Streak</h3>
            <div className={styles.kpiValue}>
              {streakDays}<span className={styles.kpiUnit}>d</span>
            </div>
            <p className={styles.kpiHint}>
              {streakDays > 0 ? 'Keep that streak alive!' : 'Start a session today.'}
            </p>
          </article>
        </section>

        {/* Next step banner */}
        <section
          className={`${styles.banner} ${isComplete ? styles.bannerSuccess : styles.bannerInfo}`}
          role="status"
          aria-live="polite"
        >
          <div className={styles.bannerIcon} aria-hidden>
            {isComplete ? '✅' : '➡️'}
          </div>
          <div className={styles.bannerText}>{nextHint}</div>
          {!isComplete && (
            <button type="button" className={styles.bannerCta} onClick={goProfile}>
              Fix it
            </button>
          )}
        </section>

        {/* Quick actions */}
        <nav className={styles.quickRow} aria-label="Quick actions">
          {quickLinks.map(q => (
            <Link key={q.to} to={q.to} className={styles.quickBtn}>
              <span className={styles.quickIcon} aria-hidden>{q.icon}</span>
              <span>{q.label}</span>
            </Link>
          ))}
        </nav>

        {/* Latest Update card */}
        <section className={styles.updateCard} aria-labelledby="whats-new-title">
          <div className={styles.updateHeader}>
            <span id="whats-new-title">📢 What’s New</span>
          </div>

          {updatesLoading ? (
            <div className={styles.updateBody} aria-busy="true">
              <div className={styles.updateSkeleton} />
              <div className={styles.updateSkeleton} style={{ width: '70%' }} />
            </div>
          ) : updatesError ? (
            <div className={styles.updateBody}>
              <div className={styles.updateEmpty}>Couldn’t load updates. Try again later.</div>
            </div>
          ) : latestUpdate ? (
            <div className={styles.updateBody}>
              <div className={styles.updateContent}>
                {latestUpdate.content || '(No details)'}
              </div>
              <div className={styles.updateMeta}>{formatDate(latestUpdate.date)}</div>
            </div>
          ) : (
            <div className={styles.updateBody}>
              <div className={styles.updateEmpty}>No recent updates.</div>
            </div>
          )}
        </section>

        {/* Helpful tips */}
        <section className={styles.tipsRow} aria-label="Helpful tips">
          <article className={styles.tipCard}>
            <h3 className={styles.tipTitle}>Study Tip</h3>
            <div className={styles.tipBody}>
              Say each step of the <b>three-point brake check</b> out loud during practice. It sticks.
            </div>
          </article>
          <article className={styles.tipCard}>
            <h3 className={styles.tipTitle}>Pro Tip</h3>
            <div className={styles.tipBody}>
              Use <b>Flashcards</b> when you have 5 minutes—on the bus, in line, wherever.
            </div>
          </article>
        </section>
      </div>
    </Shell>
  )
}