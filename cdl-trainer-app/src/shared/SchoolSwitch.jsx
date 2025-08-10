// src/shared/SchoolSwitch.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  getCurrentUserEmail,
  getCurrentUserRole,
  listAllSchools,
  getUserAssignedSchoolIds,
  computeAllowedSchools,
  getDashboardRoute,
  switchSchool,
  getCurrentSchoolId,
  applyBrandingForSchool, // NEW
} from '@utils/schoolSwitching'
import { useToast } from '@utils/ui-helpers.js'

export default function SchoolSwitch() {
  const navigate = useNavigate()
  const email = getCurrentUserEmail()
  const role = getCurrentUserRole('student')
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  // Removed unused allSchools state
  const [allowed, setAllowed] = useState([])
  const [selected, setSelected] = useState('')

  useEffect(() => {
    if (!email) {
      showToast('You must be logged in to switch schools.')
      navigate('/login')
      return
    }

    ;(async () => {
      try {
        const [schools, userSchoolIds] = await Promise.all([
          listAllSchools(),
          getUserAssignedSchoolIds(email),
        ])
        const allowedSchools = computeAllowedSchools(
          role,
          userSchoolIds,
          schools
        )
        setAllowed(allowedSchools)

        // --- Auto-continue if only one school ---
        if (allowedSchools.length === 1) {
          const only = allowedSchools[0]
          // preload branding right now
          applyBrandingForSchool(only)
          await switchSchool(only.id, { schoolObj: only })
          showToast(
            `Switched to: ${only.schoolName || only.name || only.id}`,
            1200,
            'success'
          )
          navigate(getDashboardRoute(role))
          return // do not render the form
        }

        // Otherwise, show the selector
        const current = getCurrentSchoolId() || allowedSchools[0]?.id || ''
        setSelected(current)
      } catch (_e) {
        showToast('Error loading schools.', 2500, 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [email, role, navigate, showToast])

  const currentBrand = useMemo(
    () => allowed.find(s => s.id === selected) || allowed[0],
    [allowed, selected]
  )

  if (loading) {
    return (
      <div
        className="screen-wrapper fade-in"
        style={{ textAlign: 'center', marginTop: 40 }}
      >
        <div className="spinner" />
        <p>Loading schools…</p>
      </div>
    )
  }

  if (!allowed.length) {
    return (
      <div
        className="school-switch-card fade-in"
        style={{ maxWidth: 420, margin: '48px auto' }}
      >
        <h2>No School Assigned</h2>
        <p>
          Your account is not assigned to any school. Please contact support.
        </p>
        <div
          style={{ marginTop: '1em', textAlign: 'center', fontSize: '.96em' }}
        >
          <a
            href={`mailto:${currentBrand?.contactEmail || 'support@cdltrainerapp.com'}`}
            style={{ color: '#b48aff', textDecoration: 'underline' }}
          >
            Contact Support
          </a>
        </div>
        <button
          className="btn outline"
          style={{ marginTop: 24 }}
          onClick={() => navigate(getDashboardRoute(role))}
        >
          ⬅ Back
        </button>
      </div>
    )
  }

  const showDropdown = allowed.length > 1

  const handleSubmit = async e => {
    e.preventDefault()
    if (!selected) {
      showToast('Please select a school.', 1800, 'error')
      return
    }
    const school = allowed.find(s => s.id === selected)
    // preload branding immediately
    applyBrandingForSchool(school)
    const ok = (await switchSchool(selected, { schoolObj: school })).ok
    if (!ok) return

    showToast(
      `Switched to: ${school?.schoolName || school?.name || school?.id}`,
      1600,
      'success'
    )
    navigate(getDashboardRoute(role))
  }

  return (
    <div
      className="school-switch-card fade-in"
      style={{ maxWidth: 520, margin: '40px auto 0 auto' }}
    >
      <h2 style={{ textAlign: 'center' }}>
        {currentBrand?.logoUrl ? (
          <>
            <img
              src={currentBrand.logoUrl}
              alt="Current School Logo"
              style={{
                height: 46,
                maxWidth: 120,
                marginBottom: 8,
                borderRadius: 7,
                boxShadow: '0 1px 8px #22115533',
                background: '#fff',
              }}
            />
            <br />
          </>
        ) : null}
        Switch School
      </h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}
      >
        {showDropdown ? (
          <>
            <label
              htmlFor="school-select"
              style={{ fontWeight: 600, fontSize: '1.05em' }}
            >
              Select Your School:
            </label>
            <select
              id="school-select"
              required
              value={selected}
              onChange={e => setSelected(e.target.value)}
            >
              {allowed.map(s => (
                <option key={s.id} value={s.id}>
                  {s.schoolName || s.name || s.id}
                </option>
              ))}
            </select>
          </>
        ) : (
          <input type="hidden" value={selected} readOnly />
        )}

        <button className="btn primary" type="submit">
          {showDropdown ? 'Switch School' : 'Continue'}
        </button>

        <button
          className="btn outline"
          type="button"
          onClick={() => navigate(getDashboardRoute(role))}
        >
          ⬅ Back
        </button>
      </form>

      <div style={{ marginTop: '1em', textAlign: 'center', fontSize: '.96em' }}>
        Need help?{' '}
        <a
          href={`mailto:${currentBrand?.contactEmail || 'support@cdltrainerapp.com'}`}
          style={{
            color: currentBrand?.primaryColor || '#b48aff',
            textDecoration: 'underline',
          }}
        >
          Contact Support
        </a>
      </div>
    </div>
  )
}
