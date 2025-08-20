import React, { useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import Shell from '@components/Shell.jsx'
import { StudentRoutes } from '@navigation/navigation.js'
import { useSession } from '@session/useSession.js'

// calculators (same path you already use)
import {
  getEnrollmentReadiness,
  getBTWReadiness,
  getNextActions,
} from '@student/profile/schema/calculators.js'

import { KpiCard , BannerNextSteps , QuickLinks , UpdatesCard , TipsRow } from './components'
import styles from './dashboard.module.css'
import { useDashboardData } from './hooks/useDashboardData.js'

function clampPct(n) {
  const x = Number.isFinite(n) ? n : 0
  return Math.max(0, Math.min(100, Math.round(x)))
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useSession() || {}
  const profile = useMemo(() => user?.profile || user || {}, [user])

  // KPIs
  const enrollPct = clampPct(getEnrollmentReadiness(profile))
  const btwPct = clampPct(getBTWReadiness(profile))
  const lastScore = Number.isFinite(profile?.lastTestScore) ? profile.lastTestScore : null

  // next actions (hide payment if employer-paid)
  const billingMode = String(profile?.billing?.mode || '').toLowerCase()
  const isEmployerPaid = billingMode === 'employer'
  const nextActionsRaw = useMemo(() => getNextActions(profile, 3) || [], [profile])
  const nextActions = useMemo(
    () => nextActionsRaw.filter(a => (isEmployerPaid ? a.section !== 'payment' : true)),
    [nextActionsRaw, isEmployerPaid]
  )
  const allSet = enrollPct === 100 && btwPct === 100

  const { latestUpdate, updatesLoading, updatesError } = useDashboardData()

  // Title
  useEffect(() => {
    const prev = document.title
    document.title = 'Student Dashboard • CDL Trainer'
    return () => { document.title = prev }
  }, [])

  const goProfile = useCallback(() => navigate(StudentRoutes.profile()), [navigate])

  const quickLinks = useMemo(
    () => [
      { to: StudentRoutes.checklists(),    label: 'Open Checklists', icon: '📋' },
      { to: StudentRoutes.practiceTests(), label: 'Practice Tests',  icon: '📝' },
      { to: StudentRoutes.walkthrough(),   label: 'Walkthrough',     icon: '🚚' },
      { to: StudentRoutes.flashcards(),    label: 'Flashcards',      icon: '🗂️' },
    ],
    []
  )

  return (
    <Shell title="Student Dashboard" showFab showFooter>
      <div className={styles.wrapper}>
        {/* KPIs */}
        <section className={styles.kpiRow} aria-label="Readiness">
          <KpiCard
            title="Enrollment Readiness"
            value={enrollPct}
            hint={enrollPct < 100 ? 'Complete the required enrollment items.' : 'Enrollment complete!'}
          />
          <KpiCard
            title="BTW Readiness"
            value={btwPct}
            hint={btwPct < 100 ? 'Finish permit/license/medical (and vehicle if applicable).' : 'Ready for scheduling!'}
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

        {/* Quick actions */}
        <QuickLinks items={quickLinks} />

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