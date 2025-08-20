// Path: src/admin/dashboard/AdminDashboard.jsx
// ======================================================================
// Admin • Dashboard (widgets only)
// - Fast, focused overview; no user-table here
// - Pulls school-scoped data via lightweight hooks
// - Lazy-loads heavier widgets; resilient empty states
// ======================================================================

import {
  useAuthSchoolGuard,
  useDashboardKpis,         // totals / expiring / incomplete
  useCompaniesSnapshot,    // top companies
  useDashboardAlerts,      // expiring docs, overdue, etc.
  useRecentActivity,       // activity feed items
} from '@admin/hooks'
import React, { Suspense, lazy, useMemo } from 'react'

import Shell from '@components/Shell.jsx'

import styles from './AdminDashboard.module.css'

// ---- Hooks (from admin hooks barrel) ---------------------------------

// ---- Widgets (lazy for perf) -----------------------------------------
const KpiRow             = lazy(() => import('./components/KpiRow.jsx'))
const CompaniesMiniTable = lazy(() => import('./components/CompaniesMiniTable.jsx'))
const ComplianceRadar    = lazy(() => import('./components/ComplianceRadar.jsx'))
const ActivityFeed       = lazy(() => import('./components/ActivityFeed.jsx'))
const AlertsCard         = lazy(() => import('./components/AlertsCard.jsx'))
const QuickActions       = lazy(() => import('./components/QuickActions.jsx'))
const ReportsTiles       = lazy(() => import('./components/ReportsTiles.jsx'))
const BillingSummary     = lazy(() => import('./components/BillingSummary.jsx'))

function Fallback({ label = 'Loading…' }) {
  return (
    <div
      className="dashboard-card"
      role="status"
      aria-live="polite"
      style={{ minHeight: 120, display: 'grid', placeItems: 'center' }}
    >
      <div className="spinner" aria-hidden />
      <span style={{ marginLeft: 8 }}>{label}</span>
    </div>
  )
}

export default function AdminDashboard() {
  // 1) Guard → school scope
  const { schoolId, loading: guardLoading } = useAuthSchoolGuard()

  // 2) Dashboard data (hooks no-op while schoolId is falsy)
  const kpis      = useDashboardKpis({ schoolId })
  const companies = useCompaniesSnapshot({ schoolId, limit: 5 })
  const alerts    = useDashboardAlerts({ schoolId })
  const activity  = useRecentActivity({ schoolId, limit: 10 })

  const isLoading =
    guardLoading || kpis.loading || companies.loading || alerts.loading || activity.loading

  // Normalize KPI props for KpiRow
  const kpiProps = useMemo(
    () => ({
      studentCount:    kpis.studentCount    ?? 0,
      instructorCount: kpis.instructorCount ?? 0,
      adminCount:      kpis.adminCount      ?? 0,
      permitSoon:      kpis.permitSoon      ?? 0,
      medSoon:         kpis.medSoon         ?? 0,
      incomplete:      kpis.incomplete      ?? 0,
    }),
    [kpis]
  )

  return (
    <Shell title="Admin Dashboard">
      <div className={styles.wrapper}>
        {/* KPI row */}
        <Suspense fallback={<Fallback label="Loading KPIs…" />}>
          <section aria-label="Key metrics">
            <h2 className="visually-hidden">Key metrics</h2>
            <KpiRow {...kpiProps} />
          </section>
        </Suspense>

        {/* Widget grid */}
        <div className={styles.widgetGrid} aria-label="Dashboard widgets">
          {/* Companies overview */}
          <Suspense fallback={<Fallback label="Loading companies…" />}>
            <CompaniesMiniTable
              rows={companies.rows || []}
              loading={companies.loading}
              onViewAllHref="/admin/companies"
            />
          </Suspense>

          {/* Compliance snapshot */}
          <Suspense fallback={<Fallback label="Loading compliance…" />}>
            <ComplianceRadar
              title="Compliance Snapshot"
              categories={
                alerts.compliance?.categories || [
                  { key: 'tpr',         label: 'TPR',         value: alerts.compliance?.tpr ?? 0 },
                  { key: 'instructors', label: 'Instructors', value: alerts.compliance?.instructors ?? 0 },
                  { key: 'records',     label: 'Records',     value: alerts.compliance?.records ?? 0 },
                  { key: 'hours',       label: 'Hours',       value: alerts.compliance?.hours ?? 0 },
                  { key: 'assessments', label: 'Assessments', value: alerts.compliance?.assessments ?? 0 },
                ]
              }
            />
          </Suspense>

          {/* Recent activity */}
          <Suspense fallback={<Fallback label="Loading activity…" />}>
            <ActivityFeed items={activity.items || []} />
          </Suspense>

          {/* Alerts */}
          <Suspense fallback={<Fallback label="Loading alerts…" />}>
            <AlertsCard items={alerts.items || []} onViewAllHref="/admin/reports" />
          </Suspense>

          {/* Billing summary */}
          <Suspense fallback={<Fallback label="Loading billing…" />}>
            <BillingSummary schoolId={schoolId} />
          </Suspense>

          {/* Quick actions */}
          <Suspense fallback={<Fallback label="Loading actions…" />}>
            <QuickActions
              actions={[
                { label: 'Add Company',     to: '/admin/companies', icon: '➕' },
                { label: 'View Reports',    to: '/admin/reports',   icon: '📄' },
                { label: 'Open Billing',    to: '/admin/billing',   icon: '💳' },
                { label: 'Manage Settings', to: '/admin/settings',  icon: '⚙️' },
              ]}
            />
          </Suspense>

          {/* Report tiles */}
          <Suspense fallback={<Fallback label="Loading report tiles…" />}>
            <ReportsTiles
              tiles={[
                { label: 'Completion Report', to: '/admin/reports?view=completions' },
                { label: 'Permit Expiring',   to: '/admin/reports?view=permits' },
                { label: 'Medical Expiring',  to: '/admin/reports?view=med-cards' },
                { label: 'Instructor Load',   to: '/admin/reports?view=instructors' },
              ]}
            />
          </Suspense>
        </div>

        {/* Optional: global loading hint (keeps page from feeling frozen) */}
        {isLoading && (
          <p className="u-muted" style={{ marginTop: 8 }}>
            Fetching latest data…
          </p>
        )}
      </div>
    </Shell>
  )
}