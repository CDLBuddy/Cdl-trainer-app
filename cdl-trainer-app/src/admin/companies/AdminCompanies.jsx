// Path: /src/admin/companies/AdminCompanies.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@components/ToastContext.js'
import { auth } from '@utils/firebase.js'
import { getCurrentSchoolBranding } from '@utils/school-branding.js'

import { useCompanies } from './hooks'
import { CompaniesTable, CompanyFilters, CompanyHeader } from './components'
import { exportCompaniesToCSV } from './services' // for bulk-export of selected set

export default function AdminCompanies() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [schoolId] = useState(localStorage.getItem('schoolId') || '')
  const [userEmail] = useState(
    auth?.currentUser?.email ||
      window.currentUserEmail ||
      localStorage.getItem('currentUserEmail') ||
      ''
  )
  const [brand, setBrand] = useState({})

  const {
    search, setSearch,
    adding,
    filtered, selected, allChecked,
    importRef,
    addOne, saveOne, removeOne, bulkDelete,
    exportCSV, exportPDF, downloadTemplate,
    toggleRow, toggleAll,
  } = useCompanies({ schoolId, userEmail, showToast })

  // Title
  useEffect(() => {
    const prev = document.title
    document.title = 'Admin • Companies'
    return () => { document.title = prev }
  }, [])

  // Load branding
  useEffect(() => {
    let alive = true
    ;(async () => {
      const b = (await getCurrentSchoolBranding()) || {}
      if (alive) setBrand(b)
    })()
    return () => { alive = false }
  }, [])

  const openDetail = useCallback(
    (id) => navigate(`/admin/companies/${encodeURIComponent(id)}`),
    [navigate]
  )

  // Selected rows (for exporting only those in the selection)
  const selectedRows = useMemo(
    () => filtered.filter((c) => selected.has(c.id)),
    [filtered, selected]
  )

  const bulkExportSelected = useCallback(
    () => exportCompaniesToCSV(selectedRows, showToast),
    [selectedRows, showToast]
  )

  const handleAddSubmit = useCallback((e) => {
    e.preventDefault()
    const f = e.currentTarget
    addOne({
      name: f.companyName.value.trim(),
      contact: f.companyContact.value.trim(),
      address: f.companyAddress.value.trim(),
    })
    f.reset()
  }, [addOne])

  const handleImportCSV = useCallback(
    () => showToast('Bulk import is not yet implemented in this demo.', 3000, 'info'),
    [showToast]
  )

  // Changed: SPA navigation instead of full reload
  const handleBack = useCallback(
    () => navigate('/admin-dashboard'),
    [navigate]
  )

  const brandPrimary = brand?.primaryColor || '#6c5ce7'

  return (
    <div
      className="screen-wrapper fade-in admin-companies-page"
      style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}
    >
      <CompanyHeader brand={brand} />

      <h2 style={{ marginTop: 0 }}>🏢 Manage Companies</h2>

      {/* Add company */}
      <form
        onSubmit={handleAddSubmit}
        style={{ display: 'flex', gap: '.7em', marginBottom: '1.1em', flexWrap: 'wrap' }}
        aria-labelledby="add-company-title"
      >
        <span id="add-company-title" className="visually-hidden">Add a company</span>
        <input
          id="companyName"
          name="companyName"
          type="text"
          maxLength={60}
          placeholder="New Company Name"
          required
          style={{ flex: 1, minWidth: 180 }}
          aria-label="New company name"
        />
        <input
          id="companyContact"
          name="companyContact"
          type="text"
          maxLength={60}
          placeholder="Contact (optional)"
          style={{ minWidth: 160 }}
          aria-label="Company contact"
        />
        <input
          id="companyAddress"
          name="companyAddress"
          type="text"
          maxLength={100}
          placeholder="Address (optional)"
          style={{ minWidth: 160 }}
          aria-label="Company address"
        />
        <button
          className="btn"
          type="submit"
          disabled={adding}
          style={{ background: brandPrimary, border: 'none' }}
        >
          {adding ? 'Adding…' : '+ Add Company'}
        </button>
      </form>

      {/* Toolbar */}
      <CompanyFilters
        search={search}
        setSearch={setSearch}
        onExportCSV={exportCSV}
        onExportPDF={exportPDF}
        onDownloadTemplate={downloadTemplate}
        importInputRef={importRef}
        onImportCSV={handleImportCSV}
        canBulkDelete={selected.size > 0}
        onBulkDelete={bulkDelete}
        canBulkExport={selected.size > 0}
        onBulkExport={bulkExportSelected}
      />

      {/* Table */}
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
      />

      <div style={{ fontSize: '0.96em', color: '#888', marginTop: 7 }}>
        Bulk import supports columns: <b>name</b>, <b>contact</b>, <b>address</b>,{' '}
        <b>status</b> (first row is a header).
      </div>

      <button
        className="btn outline wide"
        style={{ marginTop: '1.3rem' }}
        onClick={handleBack}
      >
        ⬅ Back to Dashboard
      </button>
    </div>
  )
}