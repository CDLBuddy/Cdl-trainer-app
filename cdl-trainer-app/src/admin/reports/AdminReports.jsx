// src/admin/reports/AdminReports.jsx
// ======================================================================
// Admin Reports
// - Filters + users table (global view)
// - Company roster view with per-student drawer
// - Bulk CSV upload + confirm-before-submit to TPR
// - Heavy bits are lazy; bundles + services are prefetched on idle/hover
// - Polished for a11y: aria-* hints, focus states, and safe buttons
// ======================================================================

import PropTypes from 'prop-types'
import React from 'react'

import useToast from '@components/useToast.js'
import { getUserRole as _getUserRole } from '@utils/auth.js'

import styles from './AdminReports.module.css'
// Lightweight atoms/molecules (static)
import { ChecklistCard, FiltersBar, StatusPill } from './components'
// Hooks (from ./hooks/index.js barrel)
import {
  useBulkUpload,
  useChecklistPdf,
  useCompanyRoster,
  useReports,
  useStudentCert,
  useTPRSubmit,
  prefetchTPRServices,
} from './hooks'

// Toast (UX pings)

/* ------------------------------ Lazy bundles ----------------------------- */
const UsersTable = React.lazy(() => import('./components/UsersTable.jsx'))
const CompanyRosterTable = React.lazy(
  () => import('./components/CompanyRosterTable.jsx')
)
const ExportMenu = React.lazy(() => import('./components/ExportMenu.jsx'))
const BulkUploadDialog = React.lazy(
  () => import('./components/BulkUploadDialog.jsx')
)
const SubmitToTPRDialog = React.lazy(
  () => import('./components/SubmitToTPRDialog.jsx')
)
const StudentReportDrawer = React.lazy(
  () => import('./student-reports/StudentReportsDrawer.jsx')
)

// Memo wrappers so re-renders are minimized even for lazy comps
const MemoUsersTable = React.memo(p => <UsersTable {...p} />)
MemoUsersTable.displayName = 'MemoUsersTable'
const MemoCompanyRosterTable = React.memo(p => <CompanyRosterTable {...p} />)
MemoCompanyRosterTable.displayName = 'MemoCompanyRosterTable'
const MemoExportMenu = React.memo(p => <ExportMenu {...p} />)
MemoExportMenu.displayName = 'MemoExportMenu'

/* ------------------------------- Fallbacks -------------------------------- */
const FallbackCard = React.memo(function FallbackCard({
  children = 'Loading…',
}) {
  return (
    <div className="dashboard-card" role="status" aria-live="polite">
      {children}
    </div>
  )
})
const TableSkeleton = React.memo(function TableSkeleton({
  rows = 6,
  height = 220,
}) {
  return (
    <div
      className="dashboard-card"
      aria-hidden
      style={{ minHeight: height, opacity: 0.75 }}
    >
      <div
        className="skeleton"
        style={{ height: 18, width: 180, marginBottom: 10 }}
      />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 14, margin: '10px 0' }}
        />
      ))}
    </div>
  )
})

/* ------------------------------- Prefetchers ------------------------------ */
const prefetchUsersBundle = () => import('./components/UsersTable.jsx')
const prefetchRosterBundle = () => import('./components/CompanyRosterTable.jsx')
const prefetchExportBundle = () => import('./components/ExportMenu.jsx')
const prefetchDialogs = () => {
  import('./components/BulkUploadDialog.jsx')
  import('./components/SubmitToTPRDialog.jsx')
  import('./student-reports/StudentReportsDrawer.jsx')
  // Prefetch mappers/validators/tprClient used by useTPRSubmit
  // prefetchTPRServices is now imported above with other hooks
}

/* --------------------------------- Page ---------------------------------- */
export default function AdminReports({ currentSchoolId, currentRole }) {
  const toast = useToast()

  // 1) Top-level reports view (brand, companies, filters, scoped users)
  const {
    brand,
    companies,
    loading,
    error,
    roleFilter,
    setRoleFilter,
    search,
    setSearch,
    filteredUsers,
  } = useReports(currentSchoolId)

  // 2) Quick “print the checklist” button
  const downloadChecklistPDF = useChecklistPdf()

  // 3) Company roster panel state
  const [activeCompanyId, setActiveCompanyId] = React.useState('')
  const activeCompany = React.useMemo(
    () => (companies || []).find(c => c.id === activeCompanyId) || null,
    [companies, activeCompanyId]
  )
  const {
    students: roster,
    loading: rosterLoading,
    refresh: refreshRoster,
  } = useCompanyRoster({
    schoolId: currentSchoolId,
    companyId: activeCompanyId,
  })

  // 4) Per-student drawer
  const [drawerStudent, setDrawerStudent] = React.useState(null)
  // Thin style: hook returns cert + provider/training directly (accepts both call shapes)
  const { provider, training } = useStudentCert({
    student: drawerStudent,
    schoolId: currentSchoolId,
  })

  // 5) Bulk upload + TPR submit (confirm-first workflow)
  const {
    open: bulkOpen,
    openDialog: openBulk,
    closeDialog: closeBulk,
    handleFile, // dialog calls onFile(file) -> hook parses & summarizes
    summary, // { fileName, total, errors, ok }
  } = useBulkUpload({
    onParsed: (rows, issues) => {
      const ok = Math.max(0, rows.length - issues.length)
      toast?.info?.(
        `Parsed ${rows.length} rows • ${issues.length} issue${issues.length === 1 ? '' : 's'} • ${ok} ready`
      )
    },
  })

  const { submitting, submitMany } = useTPRSubmit()
  const [submitOpen, setSubmitOpen] = React.useState(false)
  const [pendingStudents, setPendingStudents] = React.useState([])

  // 8) Handlers (stable)
  const onOpenStudent = React.useCallback(row => setDrawerStudent(row), [])
  const onCloseStudent = React.useCallback(() => setDrawerStudent(null), [])
  const onToggleCompany = React.useCallback(
    id => setActiveCompanyId(v => (v === id ? '' : id)),
    []
  )

  const onResetFilters = React.useCallback(() => {
    setRoleFilter('')
    setSearch('')
  }, [setRoleFilter, setSearch])

  const openTPRConfirm = React.useCallback(students => {
    setPendingStudents(Array.isArray(students) ? students : [])
    setSubmitOpen(true)
  }, [])

  const confirmTPRSubmit = React.useCallback(async () => {
    try {
      await submitMany(pendingStudents, { schoolId: currentSchoolId })
      toast?.success?.('Submitted to TPR.')
      if (activeCompanyId) refreshRoster()
      setSubmitOpen(false)
      setPendingStudents([])
    } catch {
      toast?.error?.('Submission failed.')
      // keep dialog open for retry/cancel
    }
  }, [
    submitMany,
    pendingStudents,
    currentSchoolId,
    toast,
    activeCompanyId,
    refreshRoster,
  ])

  // 9) Prefetch on idle to hide the lazy cost when possible
  React.useEffect(() => {
    const run = () => {
      prefetchUsersBundle()
      prefetchExportBundle()
      prefetchTPRServices()
      // roster + dialogs fetched on interaction
    }
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 1200 })
      return () => window.cancelIdleCallback?.(id)
    } else {
      const t = setTimeout(run, 600)
      return () => clearTimeout(t)
    }
  }, [])

  // 6) Auth gate (allow admin and superadmin; fallback to app role if prop missing)
  const effectiveRole = (currentRole || _getUserRole?.() || '').toLowerCase()
  if (effectiveRole !== 'admin' && effectiveRole !== 'superadmin') {
    return (
      <div
        className="dashboard-card"
        style={{ margin: '2em auto', maxWidth: 520 }}
      >
        <h3>Access denied</h3>
        <p>This page is for admins only.</p>
      </div>
    )
  }

  // 7) Error / loading states
  if (loading) {
    return (
      <div className={`screen-wrapper fade-in ${styles.wrap}`}>
        <header className={styles.head}>
          <h2 className="dash-head">📄 Admin Reports</h2>
        </header>
        <FallbackCard>Loading reports…</FallbackCard>
      </div>
    )
  }
  if (error) {
    return (
      <div className={`screen-wrapper fade-in ${styles.wrap}`}>
        <header className={styles.head}>
          <h2 className="dash-head">📄 Admin Reports</h2>
        </header>
        <div
          className="dashboard-card"
          role="alert"
          style={{ border: '1px solid #ff8a8a' }}
        >
          {String(error)}
        </div>
      </div>
    )
  }

  return (
    <div className={`screen-wrapper fade-in ${styles.wrap}`}>
      {/* Head */}
      <header className={styles.head}>
        <h2 className="dash-head">📄 Admin Reports</h2>
        {brand?.schoolName && (
          <div className={styles.scope}>
            Scope: <span title="Current School">{brand.schoolName}</span>
          </div>
        )}
      </header>

      {/* ELDT checklist export */}
      <ChecklistCard onDownload={downloadChecklistPDF} />

      {/* Reports + global users table */}
      <section className="dashboard-card" style={{ marginBottom: '2em' }}>
        <div className="section-title">Reports & Data Export</div>

        <FiltersBar
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          search={search}
          setSearch={setSearch}
          debounceMs={150}
          onReset={onResetFilters}
          RightControls={() => (
            <div
              style={{ display: 'flex', gap: 8, alignItems: 'center' }}
              onMouseEnter={prefetchExportBundle}
              onFocus={prefetchExportBundle}
            >
              <React.Suspense
                fallback={
                  <span className="btn" aria-busy>
                    Export…
                  </span>
                }
              >
                <MemoExportMenu users={filteredUsers} />
              </React.Suspense>

              <button
                type="button"
                className="btn"
                onClick={() => {
                  prefetchDialogs()
                  openBulk()
                }}
                onMouseEnter={prefetchDialogs}
                onFocus={prefetchDialogs}
                title="Upload a CSV of completion records"
              >
                Bulk Upload CSV…
              </button>

              {summary?.total > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color:
                      'color-mix(in oklab, var(--text-light, #fff), #000 40%)',
                  }}
                >
                  {summary.fileName ? `${summary.fileName} • ` : ''}
                  {summary.ok}/{summary.total} ready
                </span>
              )}
            </div>
          )}
        />

        <React.Suspense fallback={<TableSkeleton />}>
          <MemoUsersTable rows={filteredUsers} />
        </React.Suspense>

        <small style={{ color: '#77a', display: 'block', marginTop: '1em' }}>
          <b>Tips:</b> Exports are scoped to this school. Use role + search
          filters to narrow before exporting.
        </small>
      </section>

      {/* Company roster section */}
      <section className="dashboard-card">
        <div className="section-title">Company Rosters</div>

        {/* Company chips (use :global(.chip) styles from AdminReports.module.css) */}
        <div className={styles.actionsRow} style={{ flexWrap: 'wrap' }}>
          {(companies || []).map(c => {
            const active = activeCompanyId === c.id
            return (
              <button
                key={c.id}
                type="button"
                className={`chip ${active ? 'chip--active' : ''}`}
                aria-pressed={active}
                onClick={() => {
                  if (!active) prefetchRosterBundle()
                  onToggleCompany(c.id)
                }}
                onMouseEnter={prefetchRosterBundle}
                onFocus={prefetchRosterBundle}
                title={`${c.name} • ${c.studentCount ?? 0} students`}
              >
                <span>{c.name}</span>
                <span className={styles.pill} style={{ marginLeft: 6 }}>
                  {c.studentCount ?? 0}
                </span>
                {c.expiringSoon > 0 && (
                  <span style={{ marginLeft: 6 }}>
                    <StatusPill
                      kind="warning"
                      label={`${c.expiringSoon} expiring`}
                    />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Roster table + actions */}
        {activeCompany ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {activeCompany.name}{' '}
                <span style={{ color: '#6b7280', fontWeight: 400 }}>
                  • {roster?.length ?? 0} students
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <React.Suspense
                  fallback={
                    <span className="btn" aria-busy>
                      Export…
                    </span>
                  }
                >
                  <MemoExportMenu users={roster} company={activeCompany} />
                </React.Suspense>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    prefetchDialogs()
                    prefetchTPRServices()
                    openTPRConfirm(roster)
                  }}
                  onMouseEnter={prefetchTPRServices}
                  onFocus={prefetchTPRServices}
                  disabled={!roster || roster.length === 0 || submitting}
                  title="Create completion records for ready students"
                >
                  {submitting ? 'Submitting…' : 'Submit to TPR'}
                </button>
              </div>
            </div>

            <React.Suspense fallback={<TableSkeleton height={260} />}>
              <MemoCompanyRosterTable
                loading={rosterLoading}
                students={roster}
                onOpenStudent={onOpenStudent}
              />
            </React.Suspense>
          </>
        ) : (
          <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
            Select a company above to view its current roster.
          </div>
        )}
      </section>

      {/* Bulk upload dialog (lazy) */}
      {bulkOpen && (
        <React.Suspense
          fallback={<FallbackCard>Preparing upload…</FallbackCard>}
        >
          <BulkUploadDialog
            open={!!bulkOpen}
            onClose={closeBulk}
            onFile={handleFile}
          />
        </React.Suspense>
      )}

      {/* TPR confirm dialog (lazy) */}
      {submitOpen && (
        <React.Suspense fallback={<FallbackCard>Loading…</FallbackCard>}>
          <SubmitToTPRDialog
            open={submitOpen}
            onClose={() => {
              setSubmitOpen(false)
              setPendingStudents([])
            }}
            onConfirm={confirmTPRSubmit}
            isSubmitting={submitting}
            count={pendingStudents.length}
            methodLabel="via Training Provider Registry"
          />
        </React.Suspense>
      )}

      {/* Per-student drawer (lazy) */}
      {drawerStudent && (
        <React.Suspense
          fallback={<FallbackCard>Loading student…</FallbackCard>}
        >
          <StudentReportDrawer
            student={drawerStudent}
            provider={provider}
            training={training}
            schoolId={currentSchoolId}
            onClose={onCloseStudent}
          />
        </React.Suspense>
      )}
    </div>
  )
}

AdminReports.propTypes = {
  currentSchoolId: PropTypes.string,
  currentRole: PropTypes.string,
}
AdminReports.defaultProps = {
  currentSchoolId: '',
  currentRole: 'admin',
}
