// Path: src/admin/dashboard/AdminDashboard.jsx
// ======================================================================
// Admin • Dashboard (widgets only)
// - Fast, focused overview; no user-table here
// - Uses static data hooks + lazy UI widgets (no mixed import modes)
// - Resilient empty/error states and one-click refresh
// ======================================================================

// @ts-check
import React, { Suspense, lazy, useMemo, useCallback } from 'react'

import Shell from '@components/Shell.jsx'

import {
  useAuthSchoolGuard,
  useDashboardKpis,        // -> { loading, data, error, refresh }
  useCompaniesSnapshot,    // -> { loading, rows, total, error, refresh }
  useDashboardAlerts,      // -> { loading, items, error, stats, refresh }
  useRecentActivity,       // -> { loading, data,  error, refresh }
} from '@admin/dashboard/hooks'

import styles from './AdminDashboard.module.css'

// ---- Data hooks (STATIC imports from the hooks barrel) ----------------

// ---- UI widgets (LAZY for code-splitting) ----------------------------
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

function ErrorNotice({ message }) {
  if (!message) return null
  return (
    <div className="dashboard-card" role="alert" style={{ color: '#b42318', background: '#fef3f2' }}>
      {String(message)}
    </div>
  )
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))

export default function AdminDashboard() {
  // 1) Guard → school scope
  const { schoolId, loading: guardLoading } = useAuthSchoolGuard()

  // 2) Dashboard data (hooks safely no-op while schoolId is falsy)
  const {
    loading: kpiLoading,
    data: kpiData,
    error: kpiError,
    refresh: refreshKpis,
  } = useDashboardKpis({ schoolId })

  const {
    loading: coLoading,
    rows: companyRows = [],
    error: coError,
    refresh: refreshCompanies,
  } = useCompaniesSnapshot({ schoolId, limit: 5 })

  const {
    loading: alertLoading,
    items: alertItems = [],
    error: alertError,
    refresh: refreshAlerts,
  } = useDashboardAlerts({ schoolId, take: 8 })

  const {
    loading: actLoading,
    data: activityItems = [],
    error: actError,
    refresh: refreshActivity,
  } = useRecentActivity({ schoolId, limit: 10 })

  const isLoading = guardLoading || kpiLoading || coLoading || alertLoading || actLoading

  // 3) Normalize KPI props for KpiRow
  const kpiProps = useMemo(() => ({
    studentCount:    kpiData?.studentCount    ?? 0,
    instructorCount: kpiData?.instructorCount ?? 0,
    adminCount:      kpiData?.adminCount      ?? 0,
    permitSoon:      kpiData?.permitSoon      ?? 0,
    medSoon:         kpiData?.medSoon         ?? 0,
    incomplete:      kpiData?.incomplete      ?? 0,
  }), [kpiData])

  // 4) Simple Compliance snapshot derived from KPIs (until server provides one)
  const complianceCategories = useMemo(() => {
    const total = Math.max(0, Number(kpiData?.studentCount || 0))
    const profileOkPct =
      total > 0 ? clamp(((total - (kpiData?.incomplete || 0)) / total) * 100) : 0
    const atRisk = Number(kpiData?.permitSoon || 0) + Number(kpiData?.medSoon || 0)
    const riskPct =
      total > 0 ? clamp(((total - atRisk) / total) * 100) : 100

    return [
      { key: 'profiles',  label: 'Profiles OK',   value: profileOkPct },
      { key: 'permits',   label: 'Permit Status', value: riskPct },
      { key: 'training',  label: 'Training Logs', value: 65 }, // stub
      { key: 'reporting', label: 'TPR Reporting', value: 72 }, // stub
    ]
  }, [kpiData])

  // 5) One-click refresh (parallel)
  const refreshAll = useCallback(() => {
    void Promise.allSettled([
      refreshKpis?.(),
      refreshCompanies?.(),
      refreshAlerts?.(),
      refreshActivity?.(),
    ])
  }, [refreshKpis, refreshCompanies, refreshAlerts, refreshActivity])

  return (
    <Shell title="Admin Dashboard">
      <div className={styles.wrapper}>
        {/* Optional global refresh */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button className="btn small outline" onClick={refreshAll} disabled={isLoading}>
            ↻ Refresh
          </button>
        </div>

        {/* KPI row */}
        <Suspense fallback={<Fallback label="Loading KPIs…" />}>
          <section aria-label="Key metrics">
            <h2 className="visually-hidden">Key metrics</h2>
            <ErrorNotice message={kpiError?.message} />
            <KpiRow
              {...kpiProps}
              onStudentsClick={() => {}}
              onInstructorsClick={() => {}}
              onAdminsClick={() => {}}
              onPermitSoonClick={() => {}}
              onMedSoonClick={() => {}}
              onIncompleteClick={() => {}}
            />
          </section>
        </Suspense>

        {/* Widget grid */}
        <div className={styles.widgetGrid} aria-label="Dashboard widgets">
          {/* Companies overview */}
          <Suspense fallback={<Fallback label="Loading companies…" />}>
            <>
              <ErrorNotice message={coError} />
              <CompaniesMiniTable
                companies={companyRows}
                loading={coLoading}
                onView={() => {}}
              />
            </>
          </Suspense>

          {/* Compliance snapshot */}
          <Suspense fallback={<Fallback label="Loading compliance…" />}>
            <ComplianceRadar title="Compliance Snapshot" metrics={complianceCategories} />
          </Suspense>

          {/* Recent activity */}
          <Suspense fallback={<Fallback label="Loading activity…" />}>
            <>
              <ErrorNotice message={actError?.message} />
              <ActivityFeed
                items={activityItems}
                onItemClick={() => {}}
                renderItem={(item) => <div>{item?.description || 'No description'}</div>}
              />
            </>
          </Suspense>

          {/* Alerts */}
          <Suspense fallback={<Fallback label="Loading alerts…" />}>
            <>
              <ErrorNotice message={alertError?.message} />
              <AlertsCard alerts={alertItems} />
            </>
          </Suspense>

          {/* Billing summary (scoped by school) */}
          <Suspense fallback={<Fallback label="Loading billing…" />}>
            <BillingSummary />
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
              reports={[
                { title: 'Completion Report', description: '', to: '/admin/reports?view=completions' },
                { title: 'Permit Expiring',   description: '', to: '/admin/reports?view=permits' },
                { title: 'Medical Expiring',  description: '', to: '/admin/reports?view=med-cards' },
                { title: 'Instructor Load',   description: '', to: '/admin/reports?view=instructors' },
              ]}
            />
          </Suspense>
        </div>

        {/* Small global hint so the page doesn’t feel frozen */}
        {isLoading && (
          <p className="u-muted" style={{ marginTop: 8 }}>
            Fetching latest data…
          </p>
        )}
      </div>
    </Shell>
  )
}