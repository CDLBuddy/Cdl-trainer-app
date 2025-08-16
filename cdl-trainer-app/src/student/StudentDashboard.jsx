// src/student/StudentDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Shell from '@components/Shell.jsx'
import { StudentRoutes } from '@navigation/navigation.js'
import { useSession } from '@session/useSession.js'

// keep your existing util import path
import { getLatestUpdate } from '@/utils/firebase.js'

import {
  getEnrollmentReadiness,
  getBTWReadiness,
  getNextActions,
} from '@student/profile/schema/calculators.js'

import styles from './StudentDashboard.module.css'

/* ------------------------------------------------------------------ *
 * Local helpers
 * ------------------------------------------------------------------ */
function clampPct(n) {
  const x = Number.isFinite(n) ? n : 0
  return Math.max(0, Math.min(100, Math.round(x)))
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

  // Dual readiness via schema calculators
  const enrollPct = clampPct(getEnrollmentReadiness(profile))
  const btwPct = clampPct(getBTWReadiness(profile))

  const billingMode = String(profile?.billing?.mode || '').toLowerCase()
  const isEmployerPaid = billingMode === 'employer'

  // Next actions (filter payment if employer-paid)
  const nextActionsRaw = useMemo(() => getNextActions(profile, 3) || [], [profile])
  const nextActions = useMemo(
    () => nextActionsRaw.filter(a => (isEmployerPaid ? a.section !== 'payment' : true)),
    [nextActionsRaw, isEmployerPaid]
  )

  const allSet = enrollPct === 100 && btwPct === 100

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

  // Title
  useEffect(() => {
    const prev = document.title
    document.title = 'Student Dashboard • CDL Trainer'
    return () => { document.title = prev }
  }, [])

  const quickLinks = useMemo(
    () => [
      { to: StudentRoutes.checklists(),    label: 'Open Checklists', icon: '📋' },
      { to: StudentRoutes.practiceTests(), label: 'Practice Tests',  icon: '📝' },
      { to: StudentRoutes.walkthrough(),   label: 'Walkthrough',     icon: '🚚' },
      { to: StudentRoutes.flashcards(),    label: 'Flashcards',      icon: '🗂️' },
    ],
    []
  )

  const lastScore = Number.isFinite(profile?.lastTestScore) ? profile.lastTestScore : null
  const streakDays = Number.isFinite(profile?.studyStreakDays) ? profile.studyStreakDays : 0

  const goProfile = useCallback(() => navigate(StudentRoutes.profile()), [navigate])

  return (
    <Shell title="Student Dashboard" showFab showFooter>
      <div className={styles.wrapper}>
        {/* Readiness KPIs */}
        <section className={styles.kpiRow} aria-label="Readiness">
          <article className={styles.kpiCard}>
            <h3 className={styles.kpiTitle}>Enrollment Readiness</h3>
            <div className={styles.kpiValue}>
              {enrollPct}<span className={styles.kpiUnit}>%</span>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label="Enrollment readiness"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={enrollPct}
            >
              <div className={styles.progressFill} style={{ width: `${enrollPct}%` }} />
            </div>
            <p className={styles.kpiHint}>
              {enrollPct < 100 ? 'Complete the required enrollment items.' : 'Enrollment complete!'}
            </p>
          </article>

          <article className={styles.kpiCard}>
            <h3 className={styles.kpiTitle}>BTW Readiness</h3>
            <div className={styles.kpiValue}>
              {btwPct}<span className={styles.kpiUnit}>%</span>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label="Behind-the-wheel readiness"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={btwPct}
            >
              <div className={styles.progressFill} style={{ width: `${btwPct}%` }} />
            </div>
            <p className={styles.kpiHint}>
              {btwPct < 100 ? 'Finish permit/license/medical (and vehicle if applicable).' : 'Ready for scheduling!'}
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
        </section>

        {/* Next steps banner */}
        <section
          className={`${styles.banner} ${allSet ? styles.bannerSuccess : styles.bannerInfo}`}
          role="status"
          aria-live="polite"
        >
          <div className={styles.bannerIcon} aria-hidden>
            {allSet ? '✅' : '➡️'}
          </div>
          <div className={styles.bannerText}>
            {allSet
              ? 'All set! Contact your instructor to schedule BTW.'
              : (
                <>
                  Next up:
                  <ul className={styles.nextList}>
                    {nextActions.length === 0 ? (
                      <li>Review your profile details.</li>
                    ) : nextActions.map(({ section, label }) => (
                      <li key={section}>
                        <Link to={`${StudentRoutes.profile()}#${section}`} className={styles.nextLink}>
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )
            }
          </div>
          {!allSet && (
            <button type="button" className={styles.bannerCta} onClick={goProfile}>
              Open Profile
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

        {/* What's New */}
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
