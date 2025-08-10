// src/components/Shell.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useContext,
} from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { useSession } from '@/App.jsx'
import { getTopNavForRole, getDashboardRoute } from '@navigation/navConfig.js'
import {
  getCachedBrandingSummary,
  subscribeBrandingUpdated,
} from '@utils/school-branding.js'
import { registerToastHandler } from '@utils/ui-helpers.js'

import AICoachModal from './AICoachModal.jsx'
import styles from './Shell.module.css'
import { ToastContext } from './ToastContext.jsx'

/**
 * Shell - App-wide dashboard wrapper.
 *
 * Props:
 * - title?: string
 * - children: ReactNode
 * - showFooter?: boolean (default: true)
 * - showFab?: boolean (default: true)
 * - railOverride?: Array<{to:string,label:string,icon?:string}>
 */
export default function Shell({
  title,
  children,
  showFooter = true,
  showFab = true,
  railOverride = null,
}) {
  /* -------------------------- Session & Navigation -------------------------- */
  const session = useSession()
  const { role: userRole = 'student', logout } = session || {}

  const navigate = useNavigate()
  const { pathname } = useLocation()

  /* ----------------------------- Branding State ----------------------------- */
  const [brand, setBrand] = useState(() => getCachedBrandingSummary())

  useEffect(() => {
    const unsub = subscribeBrandingUpdated(detail => {
      setBrand(prev => ({
        logoUrl: detail?.logoUrl ?? prev.logoUrl ?? '/default-logo.svg',
        schoolName: detail?.schoolName ?? prev.schoolName ?? 'CDL Trainer',
        primaryColor: detail?.primaryColor ?? prev.primaryColor ?? '',
        subHeadline: detail?.subHeadline ?? prev.subHeadline ?? '',
      }))

      if (detail?.primaryColor) {
        document.documentElement.style.setProperty(
          '--brand-primary',
          detail.primaryColor
        )
      }
    })
    return unsub
  }, [])

  const logo = brand?.logoUrl || '/default-logo.svg'
  const name = brand?.schoolName || 'CDL Trainer'
  const sub = brand?.subHeadline || ''

  /* -------------------------- Role-Aware Navigation ------------------------- */
  const rail = useMemo(() => {
    if (Array.isArray(railOverride)) return railOverride
    const links = getTopNavForRole(String(userRole).toLowerCase())
    return Array.isArray(links) ? links : []
  }, [railOverride, userRole])

  const goHome = useCallback(() => {
    navigate(getDashboardRoute(String(userRole).toLowerCase()))
  }, [navigate, userRole])

  const handleLogout = useCallback(() => {
    if (typeof logout === 'function') {
      logout()
    } else {
      localStorage.clear()
      navigate('/login', { replace: true })
    }
  }, [logout, navigate])

  /* ----------------------- Accessibility: Live Announcer --------------------- */
  useEffect(() => {
    const el = document.getElementById('route-change-live')
    if (el) el.textContent = `Navigated to ${pathname}`
  }, [pathname])

  /* ------------------------ Toast Bridge (React → Utils) --------------------- */
  const toastApi = useContext(ToastContext)

  useEffect(() => {
    const handler = toastApi
      ? (msg, opts = {}) => {
          const { duration, type } = opts || {}
          if (typeof toastApi === 'function') {
            toastApi(msg, { duration, type })
          } else if (typeof toastApi?.show === 'function') {
            toastApi.show(msg, duration, type)
          }
        }
      : null

    registerToastHandler(handler)
    return () => registerToastHandler(null)
  }, [toastApi])

  /* -------------------------- AI Coach Modal Logic --------------------------- */
  const [aiOpen, setAiOpen] = useState(false)
  const [aiContext, setAiContext] = useState('dashboard')

  const inferContextFromPath = useCallback(path => {
    if (!path) return 'dashboard'
    if (/\/profile($|\/)/i.test(path)) return 'profile'
    if (/checklist/i.test(path)) return 'checklists'
    if (/walkthrough/i.test(path)) return 'walkthrough'
    if (/practice-tests|test-engine|test-review|test-results/i.test(path))
      return 'practiceTests'
    return 'dashboard'
  }, [])

  const openCoach = useCallback(
    ctx => {
      setAiContext(ctx || inferContextFromPath(pathname))
      setAiOpen(true)
    },
    [inferContextFromPath, pathname]
  )

  const closeCoach = useCallback(() => setAiOpen(false), [])

  useEffect(() => {
    const onOpen = e => openCoach(e?.detail?.context)
    const onKey = e => {
      const metaK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'
      if (metaK) {
        e.preventDefault()
        openCoach('shortcut')
      }
      if (e.key === 'Escape' && aiOpen) closeCoach()
    }
    window.addEventListener('open-ai-coach', onOpen)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('open-ai-coach', onOpen)
      window.removeEventListener('keydown', onKey)
    }
  }, [aiOpen, openCoach, closeCoach])

  /* ------------------------------ Render Layout ------------------------------ */
  return (
    <div className={styles.root}>
      {/* SR-only live region */}
      <span
        id="route-change-live"
        aria-live="polite"
        className={styles.srOnly}
      />

      {/* Header */}
      <header className={styles.header} role="banner">
        <button
          className={styles.brandBtn}
          onClick={goHome}
          type="button"
          aria-label="Go to dashboard"
          title={name}
        >
          <img
            className={styles.logo}
            src={logo}
            alt={`${name} logo`}
            width="40"
            height="40"
            loading="eager"
            decoding="async"
          />
          <div>
            <div className={styles.schoolName}>{name}</div>
            {sub && <div className={styles.schoolSub}>{sub}</div>}
          </div>
        </button>
      </header>

      {/* Layout */}
      <div className={styles.layout}>
        {/* Left Rail */}
        <aside className={styles.rail} aria-label="Section navigation">
          <nav className={styles.railNav}>
            {rail.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${styles.railBtn} ${isActive ? styles.railActive : ''}`
                }
                end
              >
                <span aria-hidden="true">{icon || '•'}</span>
                <span className={styles.railLabel}>{label}</span>
              </NavLink>
            ))}

            {/* Logout */}
            <button
              className={styles.logoutBtn}
              type="button"
              onClick={handleLogout}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="4"
                  y="4"
                  width="12"
                  height="16"
                  rx="2"
                  stroke="#ffb3b3"
                  strokeWidth="2"
                />
                <path
                  d="M17 15l4-3-4-3m4 3H10"
                  stroke="#ffb3b3"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Logout</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <section className={styles.content} role="main">
          {title && <h1 className={styles.title}>{title}</h1>}
          <div className={styles.card}>{children}</div>
        </section>
      </div>

      {/* AI Coach FAB */}
      {showFab && (
        <button
          className={styles.fab}
          type="button"
          aria-label="Ask AI Coach"
          title="Ask AI Coach (⌘/Ctrl+K)"
          onClick={() => openCoach()}
        >
          💬
        </button>
      )}

      {/* Footer */}
      {showFooter && (
        <footer className={styles.footer} role="contentinfo">
          <div>
            © {new Date().getFullYear()} CDL Trainer • Powered by CDL Buddy
          </div>
          <div style={{ opacity: 0.85 }}>
            <a
              href="https://cdltrainerapp.com/help"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              Help Center
            </a>{' '}
            •{' '}
            <a
              href="https://cdltrainerapp.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              Docs
            </a>
          </div>
        </footer>
      )}

      {/* AI Coach Modal */}
      <AICoachModal open={aiOpen} onClose={closeCoach} context={aiContext} />
    </div>
  )
}
