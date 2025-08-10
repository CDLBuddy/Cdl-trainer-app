import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'
import React, { useEffect, useState, useRef } from 'react'

import { useToast } from '@components/ToastContext'
import { db, auth } from '@utils/firebase.js'
import { getCurrentSchoolBranding } from '@utils/school-branding.js'

// import jsPDF only when needed
let jsPDF = null

const fmtDate = val => {
  if (!val) return ''
  try {
    const d = typeof val === 'string' ? new Date(val) : val.toDate()
    return d.toLocaleDateString()
  } catch {
    return ''
  }
}

const fetchCompanies = async schoolId => {
  if (!schoolId) return []
  const companiesSnap = await getDocs(
    query(collection(db, 'companies'), where('schoolId', '==', schoolId))
  )
  const companies = []
  companiesSnap.forEach(docSnap => {
    const c = docSnap.data()
    companies.push({
      id: docSnap.id,
      name: c.name,
      contact: c.contact || '',
      address: c.address || '',
      createdAt: c.createdAt || '',
      createdBy: c.createdBy || '',
      updatedAt: c.updatedAt || c.createdAt || '',
      updatedBy: c.updatedBy || c.createdBy || '',
      status: c.status === false ? false : true,
    })
  })
  companies.sort((a, b) => a.name.localeCompare(b.name))
  return companies
}

const exportCompaniesToCSV = (companies, showToast) => {
  if (!companies.length) return showToast('No companies to export.')
  const headers = [
    'name',
    'contact',
    'address',
    'status',
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
  ]
  const csv = [
    headers.join(','),
    ...companies.map(c =>
      headers
        .map(h => `"${(c[h] ?? '').toString().replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `companies-export-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const downloadCompanyTemplateCSV = () => {
  const headers = ['name', 'contact', 'address', 'status']
  const csv = headers.join(',') + '\r\n'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'company-import-template.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const exportCompaniesToPDF = async (companies, showToast) => {
  if (!companies.length) return showToast('No companies to export.')
  if (!jsPDF) {
    const mod = await import('jspdf')
    jsPDF = mod.jsPDF
  }
  const docPDF = new jsPDF()
  docPDF.setFontSize(14)
  docPDF.text('Companies List', 10, 16)
  const headers = [
    'Name',
    'Contact',
    'Address',
    'Status',
    'Created',
    'Created By',
    'Updated',
    'Updated By',
  ]
  let y = 25
  docPDF.setFontSize(10)
  docPDF.text(headers.join(' | '), 10, y)
  y += 7
  companies.forEach(c => {
    docPDF.text(
      [
        c.name,
        c.contact,
        c.address,
        c.status ? 'Active' : 'Inactive',
        fmtDate(c.createdAt),
        c.createdBy || '',
        fmtDate(c.updatedAt),
        c.updatedBy || '',
      ].join(' | '),
      10,
      y
    )
    y += 6
    if (y > 280) {
      docPDF.addPage()
      y = 15
    }
  })
  docPDF.save(`companies-export-${new Date().toISOString().slice(0, 10)}.pdf`)
}

function filterCompanies(companies, searchTerm) {
  if (!searchTerm) return companies
  const term = searchTerm.toLowerCase()
  return companies.filter(
    c =>
      c.name.toLowerCase().includes(term) ||
      c.contact.toLowerCase().includes(term) ||
      c.address.toLowerCase().includes(term)
  )
}

const CompanyRow = ({ company: c, isSelected, toggleSelect, onSave, onRemove, showToast }) => {
  const rowRef = useRef(null)
  return (
    <tr ref={rowRef}>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={toggleSelect}
        />
      </td>
      <td>
        <input
          className="company-name-input"
          defaultValue={c.name}
          maxLength={60}
          style={{ width: '97%', padding: '2px 7px' }}
        />
      </td>
      <td>
        <input
          className="company-contact-input"
          defaultValue={c.contact}
          maxLength={60}
          style={{ width: '97%', padding: '2px 7px' }}
        />
      </td>
      <td>
        <input
          className="company-address-input"
          defaultValue={c.address}
          maxLength={100}
          style={{ width: '97%', padding: '2px 7px' }}
        />
      </td>
      <td>
        <select
          className="company-status-input"
          defaultValue={c.status ? 'active' : 'inactive'}
          style={{ borderRadius: 7 }}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </td>
      <td>
        <span style={{ fontSize: '.93em' }}>
          {fmtDate(c.createdAt)}
        </span>
        <br />
        <span style={{ fontSize: '.87em', color: '#999' }}>
          {c.createdBy || ''}
        </span>
      </td>
      <td>
        <button
          className="btn outline btn-save-company"
          onClick={() => onSave(c.id, rowRef)}
        >
          Save
        </button>
        <button
          className="btn outline btn-remove-company"
          style={{ marginLeft: 6 }}
          onClick={() => onRemove(c.id)}
        >
          Remove
        </button>
        <button
          className="btn outline btn-view-users"
          style={{ marginLeft: 6 }}
          onClick={() =>
            showToast(
              `Viewing users for company: ${c.name}`,
              3500,
              'info'
            )
          }
        >
          View Users
        </button>
      </td>
    </tr>
  )
}

const AdminCompanies = () => {
  const [companies, setCompanies] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  // const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [brand, setBrand] = useState({})
  const [schoolId, setSchoolId] = useState(
    localStorage.getItem('schoolId') || ''
  )
  const [userEmail, setUserEmail] = useState(
    auth?.currentUser?.email ||
      window.currentUserEmail ||
      localStorage.getItem('currentUserEmail') ||
      ''
  )
  const [adding, setAdding] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    ;(async () => {
      setBrand((await getCurrentSchoolBranding()) || {})
      const comps = await fetchCompanies(schoolId)
      setCompanies(comps)
      setFiltered(comps)
    })()
  }, [schoolId])

  // --- Search handler
  useEffect(() => {
    setFiltered(filterCompanies(companies, search))
  }, [companies, search])

  // --- Add Company Handler
  const handleAddCompany = async e => {
    e.preventDefault()
    const form = e.target
    const companyName = form.companyName.value.trim()
    const companyContact = form.companyContact.value.trim()
    const companyAddress = form.companyAddress.value.trim()
    if (!companyName) return showToast('Enter a company name.')
    if (!/^[\w\s\-'.&]+$/.test(companyName))
      return showToast('Invalid company name.')
    setAdding(true)
    try {
      // Check for duplicates in THIS school
      const q = query(
        collection(db, 'companies'),
        where('name', '==', companyName),
        where('schoolId', '==', schoolId)
      )
      const snap = await getDocs(q)
      if (!snap.empty)
        return showToast('Company already exists.', 3000, 'error')
      await addDoc(collection(db, 'companies'), {
        name: companyName,
        contact: companyContact,
        address: companyAddress,
        status: true,
        schoolId,
        createdAt: new Date().toISOString(),
        createdBy: userEmail,
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail,
      })
      showToast('Company added!', 2200, 'success')
      const comps = await fetchCompanies(schoolId)
      setCompanies(comps)
      setFiltered(filterCompanies(comps, search))
      form.reset()
    } catch (_err) {
      showToast('Failed to add company.', 3200, 'error')
    }
    setAdding(false)
  }

  // --- Edit/save/remove company
  const handleSaveCompany = async (companyId, rowRef) => {
    const name = rowRef.current
      .querySelector('.company-name-input')
      .value.trim()
    const contact = rowRef.current
      .querySelector('.company-contact-input')
      .value.trim()
    const address = rowRef.current
      .querySelector('.company-address-input')
      .value.trim()
    const status =
      rowRef.current.querySelector('.company-status-input').value === 'active'
    if (!name) return showToast('Company name cannot be empty.')
    if (!/^[\w\s\-'.&]+$/.test(name)) return showToast('Invalid company name.')
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        name,
        contact,
        address,
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail,
      })
      showToast('Company updated.', 2200, 'success')
      const comps = await fetchCompanies(schoolId)
      setCompanies(comps)
      setFiltered(filterCompanies(comps, search))
    } catch (_err) {
      showToast('Failed to update company.', 3000, 'error')
    }
  }

  const handleRemoveCompany = async companyId => {
    if (!window.confirm(`Remove company? This cannot be undone.`)) return
    try {
      await deleteDoc(doc(db, 'companies', companyId))
      showToast('Company removed.', 2400, 'success')
      const comps = await fetchCompanies(schoolId)
      setCompanies(comps)
      setFiltered(filterCompanies(comps, search))
    } catch (_err) {
      showToast('Failed to remove company.', 3000, 'error')
    }
  }

  // --- Bulk actions
  const handleBulkDelete = async () => {
    if (!selected.size) return
    if (
      !window.confirm(
        `Delete ${selected.size} companies? This cannot be undone!`
      )
    )
      return
    for (const id of selected) {
      await deleteDoc(doc(db, 'companies', id))
    }
    showToast('Deleted selected companies.', 2600, 'success')
    const comps = await fetchCompanies(schoolId)
    setCompanies(comps)
    setFiltered(filterCompanies(comps, search))
    setSelected(new Set())
  }
  const handleBulkExport = () => {
    const selectedCompanies = companies.filter(c => selected.has(c.id))
    exportCompaniesToCSV(selectedCompanies, showToast)
  }

  // --- File import for CSV
  const importInputRef = useRef()
  const handleImportCSV = async e => {
    const file = e.target.files[0]
    if (!file) return
    // You'd parse CSV here and batch import (see original JS)
    showToast('Bulk import is not yet implemented in this demo.', 3000, 'info')
    // (Implementation of preview modal, confirm, etc, omitted for brevity)
  }

  return (
    <div
      className="screen-wrapper fade-in admin-companies-page"
      style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.1em',
        }}
      >
        <span
          style={{
            fontSize: '1.25em',
            fontWeight: 500,
            color: brand.primaryColor || '#b48aff',
          }}
        >
          {brand.schoolName || 'CDL Trainer'}
        </span>
        {brand.logoUrl && (
          <img
            src={brand.logoUrl}
            alt="School Logo"
            className="dashboard-logo"
            style={{ maxWidth: 90, verticalAlign: 'middle', marginBottom: 3 }}
          />
        )}
      </header>
      <h2 style={{ marginTop: 0 }}>🏢 Manage Companies</h2>
      <div className="dashboard-card" style={{ marginBottom: '1.3rem' }}>
        <form
          id="add-company-form"
          style={{ display: 'flex', gap: '.7em', marginBottom: '1.1em' }}
          onSubmit={handleAddCompany}
        >
          <input
            type="text"
            name="companyName"
            maxLength={60}
            placeholder="New Company Name"
            required
            style={{ flex: 1, minWidth: 140 }}
          />
          <input
            type="text"
            name="companyContact"
            maxLength={60}
            placeholder="Contact (optional)"
            style={{ minWidth: 120 }}
          />
          <input
            type="text"
            name="companyAddress"
            maxLength={100}
            placeholder="Address (optional)"
            style={{ minWidth: 120 }}
          />
          <button
            className="btn"
            type="submit"
            disabled={adding}
            style={{
              background: brand.primaryColor || '#b48aff',
              border: 'none',
            }}
          >
            {adding ? 'Adding...' : '+ Add Company'}
          </button>
        </form>
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: '1em',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies..."
            style={{
              flex: 1,
              minWidth: 170,
              maxWidth: 260,
              padding: '6px 11px',
              borderRadius: 7,
              border: '1px solid #ddd',
              marginBottom: 0,
            }}
          />
          <button
            className="btn outline"
            onClick={() => exportCompaniesToCSV(filtered, showToast)}
          >
            Export to CSV
          </button>
          <button
            className="btn outline"
            onClick={() => exportCompaniesToPDF(filtered, showToast)}
          >
            Export to PDF
          </button>
          <button
            onClick={downloadCompanyTemplateCSV}
            title="Download CSV template"
          >
            CSV Template
          </button>
          <label
            className="btn outline"
            style={{ marginBottom: 0, cursor: 'pointer' }}
          >
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              ref={importInputRef}
              onChange={handleImportCSV}
            />
            Import CSV
          </label>
          <button
            className="btn outline"
            disabled={!selected.size}
            onClick={handleBulkDelete}
            style={{ color: '#c00', borderColor: '#c00' }}
          >
            Delete Selected
          </button>
          <button
            className="btn outline"
            disabled={!selected.size}
            onClick={handleBulkExport}
          >
            Export Selected
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="companies-table" style={{ width: '100%', minWidth: 700 }}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelected(new Set(filtered.map(c => c.id)))
                      } else {
                        setSelected(new Set())
                      }
                    }}
                  />
                </th>
                <th>Name</th>
                <th>Contact</th>
                <th>Address</th>
                <th>Status</th>
                <th>Created / By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#799' }}>
                    No companies found for this school.
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <CompanyRow
                    key={c.id}
                    company={c}
                    isSelected={selected.has(c.id)}
                    toggleSelect={() => {
                      setSelected(prev => {
                        const next = new Set(prev)
                        if (next.has(c.id)) next.delete(c.id)
                        else next.add(c.id)
                        return next
                      })
                    }}
                    onSave={handleSaveCompany}
                    onRemove={handleRemoveCompany}
                    showToast={showToast}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: '0.98em', color: '#888', marginTop: 7 }}>
          Bulk import supports columns: <b>name</b>, <b>contact</b>,{' '}
          <b>address</b>, <b>status</b> (first row: header). Activity logs and
          user assignments coming soon.
        </div>
      </div>
      <button
        className="btn outline wide"
        style={{ marginTop: '1.3rem' }}
        onClick={() => (window.location.href = '/admin-dashboard')}
      >
        ⬅ Back to Dashboard
      </button>
    </div>
  )
}

export default AdminCompanies
