import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
} from 'firebase/firestore'
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { auth, db } from '@utils/firebase.js' // Adjust your import paths!
import {
  getCurrentSchoolBranding,
  setCurrentSchool,
} from '@utils/schoolBranding.js'
import { getBlankUserProfile } from '@utils/user-profile.js'
import '@styles/ui-shell.css' // Or your preferred CSS file

function Signup() {
  const navigate = useNavigate()

  // State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [schoolId, setSchoolId] = useState(
    localStorage.getItem('schoolId') || ''
  )
  const [schools, setSchools] = useState([])
  const [showSchoolSelect, setShowSchoolSelect] = useState(
    !localStorage.getItem('schoolId')
  )
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Branding
  const schoolBrand = getCurrentSchoolBranding() || {}
  const brandLogo = schoolBrand.logoUrl || '/default-logo.svg'
  const brandTitle = schoolBrand.schoolName || 'CDL Trainer'

  // Fetch schools if needed
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const snap = await getDocs(collection(db, 'schools'))
        const schoolList = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(s => !s.disabled)
        setSchools(schoolList)
      } catch {
        setSchools([])
      }
    }
    if (showSchoolSelect) fetchSchools()
  }, [showSchoolSelect])

  // Handle password visibility toggle
  const togglePwd = () => setShowPwd(p => !p)
  const toggleConfirmPwd = () => setShowConfirmPwd(p => !p)

  // Handle signup
  const handleSignup = async e => {
    e.preventDefault()
    setError('')
    if (!name || !email || !pwd || !confirm) {
      setError('Please fill out all fields.')
      return
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (pwd !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (pwd.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    const selectedSchoolId = schoolId
    if (showSchoolSelect) {
      if (!selectedSchoolId) {
        setError('Please select a school.')
        return
      }
      setCurrentSchool(selectedSchoolId)
    }
    setLoading(true)
    try {
      // Create user
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        pwd
      )
      // Set displayName
      if (user) {
        await updateProfile(user, { displayName: name })
      }
      // Create blank profile
      const blankProfile = {
        ...getBlankUserProfile({
          user,
          userRole: 'student',
          schoolIdVal: selectedSchoolId,
        }),
        schoolId: selectedSchoolId,
        assignedSchools: [selectedSchoolId],
      }
      await setDoc(doc(db, 'users', user.email), blankProfile)
      // Create userRoles
      const roleDoc = {
        role: 'student',
        assignedAt: serverTimestamp(),
        schoolId: selectedSchoolId || undefined,
        assignedSchools: [selectedSchoolId],
      }
      await setDoc(doc(db, 'userRoles', user.email), roleDoc)

      // Store locally
      localStorage.setItem('fullName', name)
      localStorage.setItem('userRole', 'student')
      if (selectedSchoolId) localStorage.setItem('schoolId', selectedSchoolId)

      setLoading(false)
      // Redirect will happen via onAuthStateChanged in App
    } catch (err) {
      setLoading(false)
      if (err.code === 'auth/email-already-in-use')
        setError('Email already in use. Try logging in.')
      else if (err.code === 'auth/invalid-email')
        setError('Invalid email address.')
      else setError('Signup failed: ' + (err.message || err))
    }
  }

  // Render
  return (
    <div
      className="signup-card fade-in"
      style={{ maxWidth: 480, margin: '34px auto' }}
    >
      <h2 style={{ textAlign: 'center' }}>
        {brandLogo && (
          <img
            src={brandLogo}
            style={{
              height: 38,
              maxWidth: 96,
              verticalAlign: 'middle',
              marginBottom: '0.15em',
              borderRadius: 8,
            }}
            alt="School Logo"
          />
        )}
        Sign Up for {brandTitle}
      </h2>
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
          />
        </div>
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
              style={{
                position: 'absolute',
                right: 7,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '1.14em',
                cursor: 'pointer',
              }}
              onClick={togglePwd}
              tabIndex={0}
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
              style={{
                position: 'absolute',
                right: 7,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '1.14em',
                cursor: 'pointer',
              }}
              onClick={toggleConfirmPwd}
              tabIndex={0}
            >
              {showConfirmPwd ? '🙈' : '👁'}
            </button>
          </div>
        </div>
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

export default Signup
