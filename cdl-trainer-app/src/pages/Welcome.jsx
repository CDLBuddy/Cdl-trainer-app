//src/pages/welcome.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  getCurrentSchoolBranding,
  setCurrentSchool,
  getAllSchools,
} from '@utils/school-branding.js'

import '@styles/ui-shell.css'

// Demo features array
const FEATURES = [
  { icon: '🧪', label: 'Practice Tests' },
  { icon: '✅', label: 'Checklists' },
  { icon: '📊', label: 'Results' },
  { icon: '🎧', label: 'AI Coach' },
  { icon: '🏫', label: 'Multi-School Support' },
  { icon: '🗺️', label: 'State-Specific Compliance' },
  { icon: '🕒', label: 'Progress Tracking' },
  { icon: '🔒', label: 'Secure Records' },
  { icon: '📈', label: 'Performance Analytics' },
]

// REACT MODAL for school selector
function SchoolSelectorModal({ open, onSelect, onClose }) {
  const schools = getAllSchools() || []
  const [selected, setSelected] = useState(schools[0]?.id || '')

  useEffect(() => {
    if (open && schools.length > 0) setSelected(schools[0].id)
  }, [open, schools])

  if (!open) return null
  return (
    <div
      className="modal-overlay fade-in school-modal"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div
        className="modal-card school-select-modal"
        style={{ maxWidth: 410, margin: '10% auto' }}
      >
        <h2>Select Your School</h2>
        <div style={{ marginBottom: '1.2rem' }}>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="school-select-dropdown"
            style={{ width: '90%', padding: '8px 10px', fontSize: '1em' }}
          >
            {schools.map(s => (
              <option value={s.id} key={s.id}>
                {s.schoolName}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn primary"
          style={{ width: '100%' }}
          onClick={() => {
            setCurrentSchool(selected)
            onSelect && onSelect(selected)
            onClose()
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function Welcome() {
  const navigate = useNavigate()
  const [brand, setBrand] = useState({
    schoolName: '',
    logoUrl: '',
    subHeadline: '',
    contactEmail: '',
    website: '',
    primaryColor: '',
  })
  const [showSchoolSelector, setShowSchoolSelector] = useState(
    !localStorage.getItem('schoolId')
  )

  // Branding fetch
  useEffect(() => {
    let isMounted = true
    getCurrentSchoolBranding().then(b => {
      if (isMounted && b) {
        setBrand(b)
        if (b.primaryColor) {
          document.documentElement.style.setProperty(
            '--brand-primary',
            b.primaryColor
          )
        }
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Show modal if no schoolId
  useEffect(() => {
    if (!localStorage.getItem('schoolId')) setShowSchoolSelector(true)
  }, [])

  // Keyboard accessibility
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Enter' && e.target.dataset.nav) {
        navigate(e.target.dataset.nav)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [navigate])

  return (
    <div className="welcome-screen" tabIndex={0} aria-label="Welcome screen">
      {/* School Selector Modal */}
      <SchoolSelectorModal
        open={showSchoolSelector}
        onSelect={() => {
          setShowSchoolSelector(false)
          getCurrentSchoolBranding().then(setBrand)
        }}
        onClose={() => setShowSchoolSelector(false)}
      />

      {/* Switch School */}
      <div className="switch-school-wrapper">
        <button
          className="btn outline"
          onClick={() => setShowSchoolSelector(true)}
        >
          Switch School
        </button>
      </div>

      {/* Bokeh/Animated Background */}
      <div className="bokeh-layer" aria-hidden="true">
        <div
          className="bokeh-dot parallax-float"
          style={{ top: '10%', left: '15%', animationDelay: '0s' }}
        />
        <div
          className="bokeh-dot parallax-float"
          style={{ top: '30%', left: '70%', animationDelay: '2s' }}
        />
        <div
          className="bokeh-dot parallax-float"
          style={{ top: '60%', left: '25%', animationDelay: '4s' }}
        />
        <div
          className="bokeh-dot parallax-float"
          style={{ top: '80%', left: '80%', animationDelay: '6s' }}
        />
      </div>

      {/* Main Content */}
      <div className="welcome-content shimmer-glow fade-in" role="main">
        <img
          src={brand.logoUrl || '/default-logo.svg'}
          className="welcome-logo"
          alt="School Logo"
          style={{ maxWidth: 140, margin: '0 auto 1.3em' }}
        />
        <h1 className="typewriter" aria-live="polite" aria-atomic="true">
          <span id="headline">{brand.schoolName || 'Your School'}</span>
          <span className="cursor" aria-hidden="true">
            |
          </span>
        </h1>
        <p>{brand.subHeadline || ''}</p>
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <button
            className="btn pulse"
            aria-label="Login"
            onClick={() => navigate('/login')}
          >
            <span className="icon">🚀</span> Login
          </button>
          <button
            className="btn outline"
            aria-label="Request a Demo"
            onClick={() => navigate('/demo')}
          >
            <span className="icon">📞</span> Request Demo
          </button>
          <button
            className="btn outline"
            aria-label="Contact Support"
            onClick={() => navigate('/contact')}
          >
            <span className="icon">✉️</span> Contact
          </button>
        </div>
        <div
          className="features"
          tabIndex={0}
          aria-label="Feature highlights"
          style={{ marginTop: 30 }}
        >
          <div className="features-list" role="list">
            {FEATURES.map(f => (
              <div className="feat" role="listitem" key={f.label}>
                <i>{f.icon}</i>
                <p>{f.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="welcome-footer" style={{ marginTop: 40 }}>
          <small>
            Need help?{' '}
            <a
              href={`mailto:${brand.contactEmail || 'support@cdltrainerapp.com'}`}
            >
              Email Support
            </a>
            &bull;{' '}
            <a
              href={brand.website || '#'}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Our Site
            </a>
            &bull;{' '}
            <a
              href="https://fmcsa.dot.gov"
              target="_blank"
              rel="noopener noreferrer"
            >
              FMCSA ELDT Info
            </a>
          </small>
        </div>
      </div>
    </div>
  )
}

export default Welcome
