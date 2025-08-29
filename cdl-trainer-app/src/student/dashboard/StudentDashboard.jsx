// src/student/dashboard/StudentDashboard.jsx
// ======================================================================
// Student Dashboard
// - KPIs (Enrollment/BTW readiness + last score)
// - Next steps banner (deep-links to sections in Profile)
// - External resources (BMV, FMCSA + per-school links)
// - Optional "Schedule BTW" CTA when fully ready (env-driven)
// ======================================================================

import React, { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import Shell from '@components/Shell.jsx'
import { StudentRoutes } from '@navigation/navigation.js'
import { useSession } from '@session/useSession.js'

import {
  getEnrollmentReadiness,
  getBTWReadiness,
  getNextActions,
} from '@student/profile/schema/calculators.js'

import {
  KpiCard,
  BannerNextSteps,
  QuickLinks,
  UpdatesCard,
  TipsRow,
} from './components'
import styles from './dashboard.module.css'
import { useDashboardData } from './hooks/useDashboardData.js'
// Centralized external resource helpers
import { getResourcesForSchool, getSchedulerURL } from './links.js'

/* -------------------------------- helpers ------------------------------- */
const clampPct = n => {
  const x = Number.isFinite(n) ? n : 0
  return Math.max(0, Math.min(100, Math.round(x)))
}

/* ------------------------------- component ------------------------------ */
function StudentDashboard() {
  const navigate = useNavigate()
  const { user } = useSession() || {}

  // Source of truth for profile fields used here
  const profile = useMemo(() => user?.profile || user || {}, [user])

  // KPIs (guard against NaN)
  const enrollPct = clampPct(getEnrollmentReadiness(profile))
  const btwPct = clampPct(getBTWReadiness(profile))
  const lastScore = Number.isFinite(profile?.lastTestScore)
    ? profile.lastTestScore
    : null

  // Next actions (omit Payment if employer-paid)
  const billingMode = String(profile?.billing?.mode || '').toLowerCase()
  const isEmployerPaid = billingMode === 'employer'
  const nextActionsRaw = useMemo(
    () => getNextActions(profile, 3) || [],
    [profile]
  )
  const nextActions = useMemo(
    () =>
      isEmployerPaid
        ? nextActionsRaw.filter(a => a.section !== 'payment')
        : nextActionsRaw,
    [isEmployerPaid, nextActionsRaw]
  )

  const allSet = enrollPct === 100 && btwPct === 100
  const { latestUpdate, updatesLoading, updatesError } = useDashboardData()

  // Title (restore on unmount)
  useEffect(() => {
    const prev = document.title
    document.title = 'Student Dashboard • CDL Trainer'
    return () => {
      document.title = prev
    }
  }, [])

  const goProfile = useCallback(
    () => navigate(StudentRoutes.profile()),
    [navigate]
  )

  /* ------------------------- External resources -------------------------- */
  const schoolId = useMemo(
    () =>
      profile?.schoolId ||
      window.schoolId ||
      localStorage.getItem('schoolId') ||
      '',
    [profile?.schoolId]
  )

  // Defaults + per-school links
  const resources = useMemo(() => getResourcesForSchool(schoolId), [schoolId])

  // Optional BTW scheduler (only shown when fully ready)
  const schedulerUrl = useMemo(() => getSchedulerURL(schoolId), [schoolId])

  // Final list for <QuickLinks/> (external-only)
  const externalLinks = useMemo(() => {
    const items = resources.map(r => ({
      to: r.href,
      label: r.label,
      icon: r.icon,
      external: true,
      newTab: r.newTab !== false,
    }))
    if (allSet && schedulerUrl) {
      items.push({
        to: schedulerUrl,
        label: 'Schedule BTW',
        icon: '🗓️',
        external: true,
        newTab: true,
        id: 'ext-schedule-btw',
      })
    }
    return items
  }, [resources, allSet, schedulerUrl])

  /* -------------------------------- render -------------------------------- */
  return (
    <Shell title="Student Dashboard" showFab showFooter>
      <div className={styles.wrapper}>
        {/* KPIs */}
        <section className={styles.kpiRow} aria-label="Readiness">
          <KpiCard
            title="Enrollment Readiness"
            value={enrollPct}
            hint={
              enrollPct < 100
                ? 'Complete the required enrollment items.'
                : 'Enrollment complete!'
            }
          />
          <KpiCard
            title="BTW Readiness"
            value={btwPct}
            hint={
              btwPct < 100
                ? 'Finish permit, license, medical (and vehicle if applicable).'
                : 'Ready for scheduling!'
            }
          />
          <KpiCard
            title="Last Practice Score"
            value={lastScore ?? '--'}
            unit={lastScore != null ? '%' : ''}
            hint={
              lastScore != null
                ? lastScore >= 80
                  ? 'Ready to keep going!'
                  : 'Shoot for 80%+ to pass.'
                : 'Take a practice test to see a score.'
            }
          />
        </section>

        {/* Next steps banner */}
        <BannerNextSteps
          allSet={allSet}
          nextActions={nextActions}
          onOpenProfile={goProfile}
        />

        {/* External resources (BMV, FMCSA, + school links; adds Schedule BTW when ready) */}
        <QuickLinks items={externalLinks} ariaLabel="Helpful CDL resources" />

        {/* What’s New */}
        <UpdatesCard
          loading={updatesLoading}
          error={updatesError}
          update={latestUpdate}
        />

        {/* Helpful tips */}
        <TipsRow />
      </div>
    </Shell>
  )
}

export default StudentDashboard
// Back-compat named export so barrels that re-export DashboardPage keep working.
export { StudentDashboard as DashboardPage }
