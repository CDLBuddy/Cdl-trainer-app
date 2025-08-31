// src/pages/Welcome.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getCurrentSchoolBranding } from '@utils/school-branding.js'

import './Welcome.module.css'

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

  // Branding fetch (branding util applies CSS vars & theme-color)
  useEffect(() => {
    let isMounted = true
    getCurrentSchoolBranding().then(b => {
      if (isMounted && b) setBrand(b)
    })
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="welcome-screen" aria-label="Welcome screen">
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

        {brand.subHeadline ? <p>{brand.subHeadline}</p> : null}

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
            <span className="icon" aria-hidden="true">🚀</span> Login
          </button>
          <button
            className="btn outline"
            aria-label="Request a Demo"
            onClick={() => navigate('/demo')}
          >
            <span className="icon" aria-hidden="true">📞</span> Request Demo
          </button>
          <button
            className="btn outline"
            aria-label="Contact Support"
            onClick={() => navigate('/contact')}
          >
            <span className="icon" aria-hidden="true">✉️</span> Contact
          </button>
        </div>

        <div
          className="features"
          aria-label="Feature highlights"
          style={{ marginTop: 30 }}
        >
          <div className="features-list" role="list">
            {FEATURES.map(f => (
              <div className="feat" role="listitem" key={f.label}>
                <i aria-hidden="true">{f.icon}</i>
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
            &bull{';' }{' '}
            <a
              href={brand.website || '#'}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Our Site
            </a>
            &bull{';' }{' '}
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