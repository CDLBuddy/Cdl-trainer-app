// Path: /src/admin/companies/AdminCompanies.jsx
// ============================================================================
// Admin • Companies
// - End-to-end page to manage companies for a school
// - Drawer-based “Add Company” (lazy-loaded non-route chunk)
// - Uses useCompanies() for data/actions, composable UI components
// - Polished UX: loading/error states, selected counts, bulk ops, a11y
// ============================================================================

import PropTypes from 'prop-types'
import React, {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from '@components/useToast.js'
import { auth } from '@utils/firebase.js'
import { getCurrentSchoolBranding } from '@utils/school-branding.js'

import styles from './AdminCompanies.module.css'
import { CompaniesTable, CompanyFilters, CompanyHeader } from './components'
import { useCompanies } from './hooks'
import { exportCompaniesToCSV } from './services' // bulk-export of selected set

// Page styles

// ---- Lazy, non-route overlay ---------------------------------------------
const AddCompanyDrawer = lazy(
  () => import('./add-company/AddCompanyDrawer.jsx')
)

function AdminCompanies() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  // Stable identity (avoid re-reads mid-session)
  const [schoolId] = useState(localStorage.getItem('schoolId') || '')
  const [userEmail] = useState(
    auth?.currentUser?.email ||
      window.currentUserEmail ||
      localStorage.getItem('currentUserEmail') ||
      ''
  )

  // Page-scoped brand header
  const [brand, setBrand] = useState({})

  const {
    // status
    loading,
    error,

    // search/filter
    search,
    setSearch,

    // list
    filtered,
    selected,
    allChecked,

    // misc refs
    importRef,

    // actions
    saveOne,
    removeOne,
    bulkDelete,
    exportCSV,
    exportPDF,
    downloadTemplate,
    toggleRow,
    toggleAll,
  } = useCompanies({ schoolId, userEmail, showToast })

  // Title (SSR-safe)
  useEffect(() => {
    const prev = typeof document !== 'undefined' ? document.title : ''
    if (typeof document !== 'undefined') document.title = 'Admin • Companies'
    return () => {
      if (typeof document !== 'undefined') document.title = prev
    }
  }, [])

  // Branding
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const b = (await getCurrentSchoolBranding()) || {}
        if (alive) setBrand(b)
      } catch {
        // non-fatal; silently ignore
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const openDetail = useCallback(
    id => navigate(`/admin/companies/${encodeURIComponent(id)}`),
    [navigate]
  )

  // Selected rows (for exporting only those selected)
  const selectedRows = useMemo(
    () => filtered.filter(c => selected.has(c.id)),
    [filtered, selected]
  )

  const bulkExportSelected = useCallback(
    () => exportCompaniesToCSV(selectedRows, showToast),
    [selectedRows, showToast]
  )

  // -------- Add Company drawer state & polite preloading -------------------
  const [drawerOpen, setDrawerOpen] = useState(false)
  const openAddCompany = useCallback(() => setDrawerOpen(true), [])
  const closeAddCompany = useCallback(() => setDrawerOpen(false), [])

  // Optional: warm the drawer chunk shortly after page mount
  useEffect(() => {
    const t = setTimeout(() => {
      import('./add-company/AddCompanyDrawer.jsx').catch(() => {})
    }, 600)
    return () => clearTimeout(t)
  }, [])

  const brandPrimary = brand?.primaryColor || '#6c5ce7'
  const totalCount = filtered.length
  const selectedCount = selected.size

  // Stable, collision-free IDs for a11y
  const addIds = useId()
  const errorId = error ? `${addIds}-error` : undefined

  return (
    <div
      className={`screen-wrapper fade-in admin-companies-page ${styles.page}`}
      // expose brand to children via CSS var (CompaniesTable/Filters can use var(--brand))
      style={{ '--brand-primary': brandPrimary }}
    >
      <CompanyHeader brand={brand} />

   <div className={styles.headerRow}>
        <h2 className={styles.title}>
          <span>🏢 Manage Companies</span>
          <span className={styles.countMuted}>
            {loading
              ? 'Loading…'
              : `${totalCount} result${totalCount === 1 ? '' : 's'}`}
            {selectedCount ? ` • ${selectedCount} selected` : ''}
          </span>
        </h2>

        {/* Primary action: open drawer */}
        <button
          className={`btn btn-primary ${styles.addBtn}`}
          onClick={openAddCompany}
          onMouseEnter={() =>
            import('./add-company/AddCompanyDrawer.jsx').catch(() => {})
          }
          aria-haspopup="dialog"
          aria-expanded={drawerOpen ? 'true' : 'false'}
        >
          + Add Company
        </button>
      </div>

      {/* Error banner (non-blocking) */}
      {error ? (
        <div
          id={errorId}
          role="status"
          aria-live="polite"
          className={styles.errorBanner}
        >
          {error}
        </div>
      ) : null}

      {/* Toolbar */}
      <div className={styles.toolbarWrap}>
        <CompanyFilters
          search={search}
          setSearch={setSearch}
          onExportCSV={exportCSV}
          onExportPDF={exportPDF}
          onDownloadTemplate={downloadTemplate}
          importInputRef={importRef}
          onImportCSV={() =>
            showToast(
              'Bulk import is not yet implemented in this demo.',
              3000,
              'info'
            )
          }
          canBulkDelete={selectedCount > 0}
          onBulkDelete={bulkDelete}
          canBulkExport={selectedCount > 0}
          onBulkExport={bulkExportSelected}
        />
      </div>

      {/* Table / Loading state */}
      <div role="region" aria-label="Companies table region" aria-busy={loading}>
        {loading ? (
          <div className="dashboard-card" aria-live="polite" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="spinner" aria-hidden="true" />
            Loading companies…
          </div>
        ) : (
          <CompaniesTable
            rows={filtered}
            allChecked={allChecked}
            onToggleAll={toggleAll}
            selectedSet={selected}
            onToggleRow={toggleRow}
            onSaveRow={saveOne}
            onRemoveRow={removeOne}
            onOpenDetail={openDetail}
            showToast={showToast}
            className="dashboard-card"
          />
        )}
      </div>

      <div className={styles.footerNote}>
        Bulk import supports columns: <b>name</b>, <b>contact</b>,{' '}
        <b>address</b>, <b>status</b> (first row is a header).
      </div>

      <button
        className={`btn outline wide ${styles.backBtn}`}
        onClick={() => navigate('/admin-dashboard')}
      >
        ⬅ Back to Dashboard
      </button>

      {/* Drawer mount (lazy + isolated) */}
      <Suspense fallback={null}>
        {drawerOpen && (
          <AddCompanyDrawer
            open={drawerOpen}
            onClose={result => {
              // result: false (cancel) OR { id, name, billingMode, contactEmail?, openAddStudent? }
              closeAddCompany()
              if (!result || typeof result !== 'object') return

              // Toast success
              showToast(
                `Company “${result.name || 'New Company'}” added.`,
                2200,
                'success'
              )

              // Optional: navigate to detail + auto-open Add Student
              if (result.id) {
                if (result.openAddStudent) {
                  navigate(
                    `/admin/companies/${encodeURIComponent(result.id)}`,
                    {
                      state: { openAddStudent: true },
                    }
                  )
                } else {
                  navigate(`/admin/companies/${encodeURIComponent(result.id)}`)
                }
              }
            }}
          />
        )}
      </Suspense>
    </div>
  )
}

AdminCompanies.propTypes = {
  // no props today; keeping block for future-proofing if you pass brand/schoolId in
}

export default memo(AdminCompanies)
