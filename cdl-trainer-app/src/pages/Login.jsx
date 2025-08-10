import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { auth } from '@utils/firebase' // Adjust import as needed!
import {
  getCurrentSchoolBranding,
  setCurrentSchool,
} from '@utils/school-branding.js'

import '@styles/ui-shell.css' // Optional: import your CSS

const supportEmailDefault = 'support@cdltrainerapp.com'
const demoEmail = 'demo@cdltrainerapp.com'
const demoPassword = 'test1234'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  // School branding (optional: load from context if you want)
  const schoolBrand = getCurrentSchoolBranding() || {}
  const schoolLogo = schoolBrand.logoUrl || '/default-logo.svg'
  const schoolName = schoolBrand.schoolName || 'CDL Trainer'
  const accentColor = '#4e91ad'
  const supportEmail = schoolBrand.contactEmail || supportEmailDefault

  // ---- Handlers ----
  const handleLogin = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (!email || !pwd) {
      setError('Please enter both email and password.')
      setLoading(false)
      return
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pwd)
      // onAuthStateChanged in App will handle redirect
      setLoading(false)
      // Optionally, navigate("/student-dashboard") here if you want manual routing
    } catch (err) {
      setLoading(false)
      if (err.code === 'auth/user-not-found')
        setError('No user found. Please sign up first!')
      else if (err.code === 'auth/wrong-password')
        setError('Incorrect password. Try again or reset.')
      else setError(err.message || 'Login failed. Try again.')
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      setLoading(false)
    } catch (err) {
      setLoading(false)
      setError('Google Sign-In failed: ' + err.message)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError('Enter your email to receive a reset link.')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setError('📬 Reset link sent!')
    } catch (err) {
      setError('Error: ' + err.message)
    }
  }

  const handleDemoLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPassword)
      setLoading(false)
    } catch (_err) {
      setLoading(false)
      setError('Demo login unavailable.')
    }
  }

  const handleLogoutAndBack = async () => {
    try {
      await signOut(auth)
    } catch (_err) {
      /* ignore */
    }
    navigate('/')
  }

  const handleSwitchSchool = () => {
    localStorage.removeItem('schoolId')
    navigate('/')
  }

  // ---- Render ----
  return (
    <div
      className="login-card fade-in"
      role="main"
      aria-label="Login Page"
      style={{ '--accent': accentColor }}
    >
      <div style={{ textAlign: 'center' }}>
        <img
          src={schoolLogo}
          alt="School Logo"
          style={{
            height: 52,
            maxWidth: 120,
            marginBottom: '0.8rem',
            borderRadius: 10,
            boxShadow: '0 1px 8px #22115533',
          }}
        />
        <h2 style={{ margin: '0 0 8px 0', color: '#fff' }}>
          🚛 {schoolName} Login
        </h2>
      </div>
      <form autoComplete="off" aria-label="Login form" onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email" style={{ color: '#fff' }}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group password-group">
          <label htmlFor="login-password" style={{ color: '#fff' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="login-password"
              name="password"
              type={showPwd ? 'text' : 'password'}
              required
              autoComplete="current-password"
              style={{ paddingRight: '2.3rem' }}
              value={pwd}
              onChange={e => setPwd(e.target.value)}
            />
            <button
              type="button"
              id="toggle-password"
              aria-label="Show/hide password"
              style={{
                position: 'absolute',
                right: 7,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '1.17em',
                cursor: 'pointer',
              }}
              onClick={() => setShowPwd(p => !p)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') setShowPwd(p => !p)
              }}
              tabIndex={0}
            >
              {showPwd ? '🙈' : '👁'}
            </button>
          </div>
        </div>
        {error && (
          <div
            role="alert"
            style={{ color: '#e53e3e', marginBottom: 10, fontWeight: 500 }}
          >
            {error}
          </div>
        )}
        <button
          className="btn primary"
          type="submit"
          aria-label="Sign in"
          style={{ background: accentColor, border: 'none', color: '#fff' }}
          disabled={loading}
        >
          {loading ? 'Logging in…' : 'Log In'}
        </button>
        <button
          type="button"
          className="btn"
          id="google-login"
          style={{
            marginTop: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5em',
            background: '#fff',
            color: '#222',
          }}
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            style={{ height: '1.1em', width: '1.1em', verticalAlign: 'middle' }}
            alt="Google"
          />
          Sign in with Google
        </button>
        <button
          type="button"
          className="btn outline"
          style={{ marginTop: '0.6rem', color: '#fff' }}
          onClick={handleResetPassword}
          disabled={loading}
        >
          Forgot Password?
        </button>
        <button
          type="button"
          className="btn outline"
          style={{ marginTop: '0.7rem', color: '#fff' }}
          onClick={handleDemoLogin}
          disabled={loading}
        >
          🔑 Demo/Test Account
        </button>
      </form>
      <div
        className="login-footer"
        style={{ marginTop: '1.2rem', color: '#ccc' }}
      >
        New?{' '}
        <button
          className="btn outline"
          type="button"
          style={{ color: '#fff' }}
          onClick={() => navigate('/signup')}
        >
          Sign Up
        </button>
      </div>
      <div style={{ textAlign: 'center', marginTop: '0.7rem' }}>
        <button
          className="btn outline"
          type="button"
          style={{ width: '99%', color: '#fff' }}
          onClick={handleLogoutAndBack}
          disabled={loading}
        >
          ⬅ Back
        </button>
        <button
          className="btn text"
          type="button"
          style={{
            marginTop: '0.3rem',
            width: '99%',
            color: accentColor,
            background: 'none',
            border: 'none',
            fontSize: '1.02em',
          }}
          onClick={handleSwitchSchool}
          disabled={loading}
        >
          🏫 Switch School
        </button>
      </div>
      <div
        style={{
          marginTop: '1.1rem',
          textAlign: 'center',
          fontSize: '0.98em',
          color: '#aaa',
        }}
      >
        Need help?{' '}
        <a
          href={`mailto:${supportEmail}`}
          style={{ color: accentColor, textDecoration: 'underline' }}
        >
          Contact Support
        </a>
      </div>
    </div>
  )
}

export default Login
