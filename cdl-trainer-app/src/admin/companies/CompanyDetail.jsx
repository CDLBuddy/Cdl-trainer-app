// Path: /src/admin/companies/CompanyDetail.jsx
// ======================================================================
// Admin • Company Detail
// - Loads company meta + roster (students attached to companyId)
// - Local search, simple readiness bars, and verify links
// - Uses AddStudentDrawer (from companies barrel) for quick adds
// - No breaking changes to props/exports/imports
// ======================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'

import Shell from '@components/Shell.jsx'
import { useToast } from '@components/ToastContext.js'
import { db } from '@utils/firebase.js'
import { AddStudentDrawer } from '@admin/companies'

import { getEnrollmentReadiness, getBTWReadiness } from '@student/profile/schema/calculators.js'

/* ------------------------------------------------------------------ */
/* Local helpers (stable, tiny)                                       */
/* ------------------------------------------------------------------ */
const pct = (n) => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)))
const fmtBilling = (mode) => {
  const m = String(mode || '').toLowerCase()
  return m === 'employer' ? 'Employer' : m === 'individual' ? 'Individual' : '—'
}

/** Map Firestore user doc -> roster row */
function mapUserDoc(ds) {
  const u = ds.data() || {}
  return {
    email: u.email || ds.id,
    name: u.name || '(no name)',
    course: u.course || '—',
    cdlClass: u.cdlClass || '—',
    billing: u.billing || { mode: '—' },
    assignedInstructor: u.assignedInstructor || '—',
    profile: u,
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */
export default function CompanyDetail() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)
  const [roster, setRoster] = useState([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  // loaders are separate so we can selectively refresh roster after save
  const loadCompany = useCallback(async () => {
    if (!companyId) return null
    const cSnap = await getDoc(doc(db, 'companies', companyId))
    return cSnap.exists() ? { id: cSnap.id, ...cSnap.data() } : null
  }, [companyId])

  const loadRoster = useCallback(async () => {
    if (!companyId) return []
    const qy = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('companyId', '==', companyId)
    )
    const uSnap = await getDocs(qy)
    const rows = []
    uSnap.forEach((ds) => rows.push(mapUserDoc(ds)))
    rows.sort((a, b) => a.name.localeCompare(b.name))
    return rows
  }, [companyId])

  // initial load
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const [c, r] = await Promise.all([loadCompany(), loadRoster()])
        if (!alive) return
        setCompany(c)
        setRoster(r)
      } catch {
        // keep it quiet for end users but still inform
        showToast('Failed to load company roster.', 3000, 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [loadCompany, loadRoster, showToast])

  // derived list filtered by search
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return roster
    return roster.filter((r) =>
      (r.name || '').toLowerCase().includes(term) ||
      (r.email || '').toLowerCase().includes(term) ||
      (r.course || '').toLowerCase().includes(term) ||
      (r.cdlClass || '').toLowerCase().includes(term)
    )
  }, [roster, search])

  const openVerify = useCallback(
    (email) => navigate(`/instructor/verify/${encodeURIComponent(email)}`),
    [navigate]
  )

  const title = useMemo(
    () => (company?.name ? `Company • ${company.name}` : `Company • ${companyId || ''}`),
    [company?.name, companyId]
  )

  return (
    <Shell title={title}>
      {/* Header */}
      <Header
        companyId={companyId}
        name={company?.name}
        search={search}
        onSearch={setSearch}
        onBack={() => navigate('/admin/companies')}
        onAdd={() => setShowAdd(true)}
      />

      {/* Roster */}
      <div className="dashboard-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '1rem' }}>
            <div className="spinner" aria-label="Loading roster…" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '1rem', color: '#6b7280' }}>
            No students found for this company.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: 860 }}>
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Email</th>
                  <th scope="col">Course</th>
                  <th scope="col">Class</th>
                  <th scope="col">Billing</th>
                  <th scope="col">Instructor</th>
                  <th scope="col">Readiness</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const enroll = pct(getEnrollmentReadiness(r.profile))
                  const btw = pct(getBTWReadiness(r.profile))
                  return (
                    <tr key={r.email}>
                      <td>{r.name}</td>
                      <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.email}</td>
                      <td>{r.course}</td>
                      <td>{r.cdlClass}</td>
                      <td>{fmtBilling(r.billing?.mode)}</td>
                      <td>{r.assignedInstructor || '—'}</td>
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <RowBar label="Enroll" value={enroll} />
                          <RowBar label="BTW" value={btw} alt />
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn small" onClick={() => openVerify(r.email)}>Verify</button>{' '}
                        <Link className="btn small outline" to={`/instructor/verify/${encodeURIComponent(r.email)}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over: Add Student */}
      {showAdd && (
        <AddStudentDrawer
          open={showAdd}
          companyId={companyId}
          onClose={async (didSave) => {
            setShowAdd(false)
            if (didSave) {
              try {
                setLoading(true)
                const r = await loadRoster()
                setRoster(r)
              } catch {
                showToast('Saved, but failed to refresh roster.', 3000, 'warning')
              } finally {
                setLoading(false)
              }
            }
          }}
        />
      )}
    </Shell>
  )
}

/* ------------------------------------------------------------------ */
/* Tiny Presentational Bits                                           */
/* ------------------------------------------------------------------ */

function Header({ companyId, name, search, onSearch, onBack, onAdd }) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'grid', gap: 4, minWidth: 240 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{name || '(No name)'}</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>{companyId}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search roster…"
          aria-label="Search roster"
          style={{
            padding: '6px 10px',
            border: '1px solid #dcdde2',
            borderRadius: 8,
            minWidth: 200,
          }}
        />
        <button className="btn" onClick={onAdd}>+ Add Student</button>
        <button className="btn outline" onClick={onBack}>⬅ Back</button>
      </div>
    </header>
  )
}

/** Tiny row progress with label */
function RowBar({ label, value, alt }) {
  const bg = alt ? '#e0f2fe' : '#eef2ff'
  const fg = alt ? '#0ea5e9' : '#6366f1'
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <small style={{ width: 60, color: '#667085' }}>{label}</small>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={`${label} readiness ${clamped}%`}
        style={{
          position: 'relative',
          height: 8,
          flex: 1,
          background: bg,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, width: `${clamped}%`, background: fg }} />
      </div>
      <small style={{ width: 32, textAlign: 'right' }}>{clamped}%</small>
    </div>
  )
}