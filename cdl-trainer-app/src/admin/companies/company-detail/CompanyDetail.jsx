// Path: /src/admin/companies/company-detail/CompanyDetail.jsx
import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { BillingSummaryCard } from '@admin/billing'
import Shell from '@components/Shell.jsx'
import { useToast } from '@components/useToast.js'

import { CompanyOverviewCard } from '../components/detail'

import styles from './CompanyDetail.module.css'
import { DetailHeader, RosterTable } from './components'
import useCompanyDetailPage from './hooks/useCompanyDetailPage.js'
import { exportRosterCsv } from './utils/exportCsv.js'
import { fmtDate, visuallyHidden } from './utils/format.js'

const preloadRoute = async (...args) =>
  (await import('@/admin/preload.js')).preloadRoute?.(...args)

const AddStudentDrawer = lazy(
  () => import('@admin/companies/add-student/AddStudentDrawer.jsx')
)

export default function CompanyDetailPage() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  const {
    loading,
    company,
    sorted,
    search,
    setSearch,
    billingFilter,
    setBillingFilter,
    onlyUnassigned,
    setOnlyUnassigned,
    sortKey,
    sortDir,
    toggleSort,
    reloadRoster,
  } = useCompanyDetailPage(companyId, showToast)

  const [showAdd, setShowAdd] = useState(false)

  // Auto-open drawer if navigated with state flag
  useEffect(() => {
    if (location?.state?.openAddStudent) {
      preloadRoute('addStudent').catch(() => {})
      setShowAdd(true)
      navigate('.', { replace: true, state: {} })
    }
  }, [location?.state, navigate])

  // Keyboard: '/' focuses search unless typing in an input/textarea
  useEffect(() => {
    const onKey = e => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target?.tagName || '').toLowerCase()
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault()
          document.getElementById('company-roster-search')?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const title = useMemo(
    () =>
      company?.name
        ? `Company • ${company.name}`
        : `Company • ${companyId || ''}`,
    [company?.name, companyId]
  )

  const overviewStats = useMemo(
    () => ({
      activeStudents: sorted.length,
      openEnrollments: sorted.filter(
        r => (r.profile?.enrollmentStatus || '').toLowerCase() === 'open'
      ).length,
      lastActivityLabel: fmtDate(company?.updatedAt),
    }),
    [sorted, company?.updatedAt]
  )

  const openVerify = useCallback(
    email => navigate(`/instructor/verify/${encodeURIComponent(email)}`),
    [navigate]
  )

  const handleOpenAdd = useCallback(() => {
    preloadRoute('addStudent').catch(() => {})
    setShowAdd(true)
  }, [])

  return (
    <Shell title={title}>
      <DetailHeader
        companyId={companyId}
        name={company?.name}
        search={search}
        onSearch={setSearch}
        onExport={() => exportRosterCsv(companyId, sorted)}
        onBack={() => navigate('/admin/companies')}
        onAdd={handleOpenAdd}
        billingFilter={billingFilter}
        setBillingFilter={setBillingFilter}
        onlyUnassigned={onlyUnassigned}
        setOnlyUnassigned={setOnlyUnassigned}
      />

      {/* Overview + Billing snapshot */}
      <div className={styles.topGrid}>
        <CompanyOverviewCard
          company={company}
          stats={overviewStats}
          loading={loading}
        />
        <BillingSummaryCard
          schoolId={company?.schoolId}
          companyId={companyId}
          onOpenBilling={({ schoolId, companyId }) =>
            navigate(
              `/admin/billing?${new URLSearchParams({ schoolId, companyId })}`
            )
          }
        />
      </div>

      {/* Roster */}
      <div className={`dashboard-card ${styles.card}`} aria-busy={loading}>
        {loading ? (
          <div className={styles.loading} role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span>Loading roster…</span>
          </div>
        ) : (
          <RosterTable
            rows={sorted}
            companyName={company?.name}
            sortKey={sortKey}
            sortDir={sortDir}
            toggleSort={toggleSort}
            onVerify={openVerify}
            visuallyHidden={visuallyHidden}
          />
        )}
      </div>

      {/* Slide-over: Add Student */}
      {showAdd && (
        <Suspense fallback={null}>
          <AddStudentDrawer
            open={showAdd}
            companyId={companyId}
            onClose={async didSave => {
              setShowAdd(false)
              if (didSave) {
                try {
                  await reloadRoster()
                } catch {
                  showToast(
                    'Saved, but failed to refresh roster.',
                    3000,
                    'warning'
                  )
                }
              }
            }}
          />
        </Suspense>
      )}
    </Shell>
  )
}
