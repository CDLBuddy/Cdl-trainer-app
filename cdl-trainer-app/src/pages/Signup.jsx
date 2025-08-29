// src/pages/Signup.jsx
// ======================================================================
// Signup
// - Supports invite links (?invite=ID) that lock school + prefill fields
// - Enforces dynamic "required fields" from invite or school settings
// - Creates users/{email} + userRoles/{email}
// - Light branding from school or local cache
// ======================================================================

import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  getDocs,
} from 'firebase/firestore'
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { auth, db } from '@utils/firebase.js'
import { getInvite, consumeInvite, isValidInvite } from '@utils/invites.js'
import {
  getCurrentSchoolBranding,
  setCurrentSchool,
} from '@utils/school-branding.js'
import { getBlankUserProfile } from '@utils/userProfile.js'

// Dynamic “required fields” supported on signup via invite/settings
const FIELD_DEFS = /** @type const */ ({
  phone: { label: 'Phone', type: 'tel', placeholder: '(555) 555-5555' },
  address: { label: 'Address', type: 'text', placeholder: 'Street, City, ST' },
  dob: { label: 'Date of Birth', type: 'date' },
  permitNumber: {
    label: 'Permit Number',
    type: 'text',
    placeholder: 'If applicable',
  },
})

const isEmail = v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || ''))

export default function Signup() {
  const navigate = useNavigate()

  // -------- invite id from query string --------------------------------
  const inviteId = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('invite') || ''
    } catch {
      return ''
    }
  }, [])

  // -------- form state --------------------------------------------------
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  const [schoolId, setSchoolId] = useState(
    localStorage.getItem('schoolId') || ''
  )
  const [schools, setSchools] = useState([])
  const [showSchoolSelect, setShowSchoolSelect] = useState(
    !localStorage.getItem('schoolId')
  )

  // Dynamic required fields + their values
  const [requiredFields, setRequiredFields] = useState(
    /** @type {string[]} */ []
  )
  const [extra, setExtra] = useState({
    phone: '',
    address: '',
    dob: '',
    permitNumber: '',
  })

  // Branding
  const [brandTitle, setBrandTitle] = useState('CDL Trainer')
  const [brandLogo, setBrandLogo] = useState('/default-logo.svg')

  // UI
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // -------- local branding fallback ------------------------------------
  useEffect(() => {
    const localBrand = getCurrentSchoolBranding() || {}
    if (!inviteId && !schoolId) {
      setBrandTitle(localBrand.schoolName || 'CDL Trainer')
      setBrandLogo(localBrand.logoUrl || '/default-logo.svg')
    }
  }, [inviteId, schoolId])

  // -------- load invite (locks school + provides requirements) ---------
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!inviteId) return

      // Fast validity check (swallows internal errors)
      const valid = await isValidInvite(inviteId).catch(() => false)
      if (!alive) return
      if (!valid) {
        setError('This invite link is invalid or has expired.')
        return
      }

      try {
        const { data: inv } = await getInvite(inviteId)
        if (!alive || !inv) return

        if (inv.consumed) {
          setError('This invite link has already been used.')
          return
        }

        // Lock to invited school + prefill branding
        const sid = inv.schoolId || ''
        if (sid) {
          setSchoolId(sid)
          setShowSchoolSelect(false)
          setCurrentSchool(sid) // ensure local selection is set
          const sSnap = await getDoc(doc(db, 'schools', sid)).catch(() => null)
          if (sSnap?.exists()) {
            const s = sSnap.data() || {}
            setBrandTitle(s.name || 'CDL Trainer')
            setBrandLogo(s.logoUrl || '/default-logo.svg')
          }
        }

        if (inv.email) setEmail(String(inv.email).toLowerCase())
        if (inv.name) setName(String(inv.name))

        // Invite-specified required fields win
        if (Array.isArray(inv.requiredFields) && inv.requiredFields.length) {
          setRequiredFields(inv.requiredFields)
        }
      } catch {
        if (alive) setError('Unable to load invite. Please request a new link.')
      }
    })()
    return () => {
      alive = false
    }
  }, [inviteId])

  // -------- load schools when user must choose one ----------------------
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const snap = await getDocs(collection(db, 'schools'))
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s => !s.disabled)
        setSchools(list)
      } catch {
        setSchools([])
      }
    }
    if (showSchoolSelect) fetchSchools()
  }, [showSchoolSelect])

  // -------- if no invite but we have schoolId → school branding --------
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (inviteId || !schoolId) return
      const sSnap = await getDoc(doc(db, 'schools', schoolId)).catch(() => null)
      if (!alive) return
      if (sSnap?.exists()) {
        const s = sSnap.data() || {}
        setBrandTitle(s.name || 'CDL Trainer')
        setBrandLogo(s.logoUrl || '/default-logo.svg')
      }
    })()
    return () => {
      alive = false
    }
  }, [inviteId, schoolId])

  // -------- fallback required fields from school settings ---------------
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (inviteId || !schoolId) return
      try {
        // Keep in sync with your settingsApi storage path if that changes.
        const sSnap = await getDoc(doc(db, 'settings', schoolId)).catch(
          () => null
        )
        if (!alive) return
        const prefs = sSnap?.data()?.prefs || {}
        const req = prefs?.users?.requiredFields
        if (Array.isArray(req) && req.length) setRequiredFields(req)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      alive = false
    }
  }, [inviteId, schoolId])

  // -------- handlers ----------------------------------------------------
  const onExtraChange = useCallback(e => {
    const { name, value } = e.target
    setExtra(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleSignup = async e => {
    e.preventDefault()
    setError('')

    // Basic checks
    if (!name || !email || !pwd || !confirm)
      return setError('Please fill out all fields.')
    if (!isEmail(email)) return setError('Please enter a valid email address.')
    if (pwd !== confirm) return setError('Passwords do not match.')
    if (pwd.length < 6)
      return setError('Password must be at least 6 characters.')

    // Choose the school
    const selectedSchoolId = schoolId
    if (showSchoolSelect) {
      if (!selectedSchoolId) return setError('Please select a school.')
      setCurrentSchool(selectedSchoolId)
    }

    // Enforce required fields
    for (const key of requiredFields) {
      const v = key in extra ? extra[key] : null
      if (!v || String(v).trim().length === 0) {
        const label = FIELD_DEFS[key]?.label || key
        return setError(`Please provide ${label}.`)
      }
    }

    setLoading(true)
    try {
      // 1) Auth
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        pwd
      )
      if (user) await updateProfile(user, { displayName: name })

      // 2) Profile document
      const blank = getBlankUserProfile({
        user,
        userRole: 'student',
        schoolIdVal: selectedSchoolId,
      })
      const profile = {
        ...blank,
        name,
        email: user.email,
        schoolId: selectedSchoolId,
        assignedSchools: [selectedSchoolId],
        ...Object.fromEntries(requiredFields.map(k => [k, extra[k]])),
      }

      // 3) Simple profile progress: name + required fields present
      const total = (requiredFields?.length || 0) + 1
      const filled =
        requiredFields.filter(k => String(extra[k] || '').trim()).length +
        (name ? 1 : 0)
      profile.profileProgress = Math.round((filled / Math.max(1, total)) * 100)

      await setDoc(doc(db, 'users', user.email), profile)

      // 4) Role document
      await setDoc(doc(db, 'userRoles', user.email), {
        role: 'student',
        assignedAt: serverTimestamp(),
        schoolId: selectedSchoolId || undefined,
        assignedSchools: [selectedSchoolId],
      })

      // 5) Mark invite consumed (if any)
      if (inviteId) {
        try {
          await consumeInvite(inviteId)
        } catch {
          /* idempotent / best effort */
        }
      }

      // 6) Local cache
      localStorage.setItem('fullName', name)
      localStorage.setItem('userRole', 'student')
      if (selectedSchoolId) localStorage.setItem('schoolId', selectedSchoolId)

      setLoading(false)
      navigate('/student/dashboard', { replace: true })
    } catch (err) {
      setLoading(false)
      const code = err?.code || ''
      if (code === 'auth/email-already-in-use')
        setError('Email already in use. Try logging in.')
      else if (code === 'auth/invalid-email') setError('Invalid email address.')
      else setError('Signup failed: ' + (err?.message || err))
    }
  }

  // -------- render ------------------------------------------------------
  return (
    <div
      className="signup-card fade-in"
      style={{ maxWidth: 520, margin: '34px auto' }}
    >
      <h2 style={{ textAlign: 'center' }}>
        {brandLogo && (
          <img
            src={brandLogo}
            alt="School Logo"
            style={{
              height: 38,
              maxWidth: 96,
              verticalAlign: 'middle',
              marginBottom: '0.15em',
              borderRadius: 8,
            }}
          />
        )}
        Sign Up for {brandTitle}
      </h2>

      {inviteId && (
        <p
          style={{
            textAlign: 'center',
            margin: '6px 0 14px',
            color: '#7aa',
            fontSize: 13,
          }}
        >
          This account will be created under your invited school.
        </p>
      )}

      <form autoComplete="off" onSubmit={handleSignup}>
        <div className="form-group">
          <label htmlFor="signup-name">Name</label>
          <input
            id="signup-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value.toLowerCase())}
            readOnly={Boolean(inviteId)}
          />
        </div>

        {/* Dynamic required fields */}
        {requiredFields.map(key => {
          const def = FIELD_DEFS[key] || { label: key, type: 'text' }
          const id = `signup-extra-${key}`
          return (
            <div className="form-group" key={key}>
              <label htmlFor={id}>{def.label}</label>
              <input
                id={id}
                name={key}
                type={def.type || 'text'}
                required
                placeholder={def.placeholder || ''}
                value={extra[key] || ''}
                onChange={onExtraChange}
              />
            </div>
          )
        })}

        {/* Passwords */}
        <div className="form-group password-group">
          <label htmlFor="signup-password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="signup-password"
              name="password"
              type={showPwd ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              style={{ paddingRight: '2.3rem' }}
              value={pwd}
              onChange={e => setPwd(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPwd(p => !p)}
              aria-pressed={showPwd}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: 7,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {showPwd ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div className="form-group password-group">
          <label htmlFor="signup-confirm">Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="signup-confirm"
              name="confirm"
              type={showConfirmPwd ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              style={{ paddingRight: '2.3rem' }}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPwd(p => !p)}
              aria-pressed={showConfirmPwd}
              aria-label={
                showConfirmPwd
                  ? 'Hide confirmation password'
                  : 'Show confirmation password'
              }
              style={{
                position: 'absolute',
                right: 7,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {showConfirmPwd ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {/* School selection only when not locked by invite */}
        {showSchoolSelect && (
          <div className="form-group">
            <label htmlFor="signup-school">School/Brand</label>
            <select
              id="signup-school"
              name="school"
              required
              value={schoolId}
              onChange={e => setSchoolId(e.target.value)}
            >
              <option value="">Select a School</option>
              {schools.map(s => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              color: 'var(--error,#ff6b6b)',
              marginBottom: 10,
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <button
          className="btn primary"
          type="submit"
          style={{ marginTop: '0.7em' }}
          disabled={loading}
        >
          {loading ? 'Creating Account…' : 'Create Account'}
        </button>

        <div className="signup-footer" style={{ marginTop: '1.1rem' }}>
          Already have an account?
          <button
            className="btn outline"
            type="button"
            onClick={() => navigate('/login')}
            style={{ marginLeft: 6 }}
          >
            Log In
          </button>
        </div>

        <button
          className="btn outline"
          type="button"
          style={{ marginTop: '0.8rem', width: '100%' }}
          onClick={() => navigate('/')}
        >
          ⬅ Back
        </button>
      </form>
    </div>
  )
}
