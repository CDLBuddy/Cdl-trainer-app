// src/components/NavBar.jsx
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'

import { useSession } from '@/App.jsx' // { loading, isLoggedIn, role, user, logout, notifications? }
import {
  getDashboardRoute,
  getNavLinksForRole, // ⬅ pull top nav from navConfig via navigation helper
} from '@navigation/navigation.js'
import {
  getCachedBrandingSummary,
  subscribeBrandingUpdated,
} from '@utils/school-branding.js'

import styles from './NavBar.module.css'

/**
 * Props:
 * - brand?: { logoUrl?: string; schoolName?: string; primaryColor?: string }
 *   (Optional override; otherwise the bar listens for branding:updated)
 */
function NavBar({ brand: brandProp }) {
  const session = useSession?.() || {}
  const { role, user, logout } = session
  const email = user?.email || session.email || ''
  const avatarUrl = user?.photoURL || session.avatarUrl || '/default-avatar.svg'
  const notifications = Number(session.notifications ?? 0)

  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false) // elevated navbar on scroll
  const profileRef = useRef(null)

  // Close the mobile menu when route changes
  useEffect(() => {
    if (menuOpen) setMenuOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // --- Scroll elevation ---
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 6)
        ticking = false
      })
    }
    onScroll() // initialize once
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // --- Branding (prefer prop from App; else cached + live updates) ---
  const [brand, setBrand] = useState(() => {
    if (brandProp && (brandProp.logoUrl || brandProp.schoolName))
      return brandProp
    return getCachedBrandingSummary()
  })

  // Update when parent passes a new brand
  useEffect(() => {
    if (brandProp && (brandProp.logoUrl || brandProp.schoolName)) {
      setBrand(prev => ({
        logoUrl: brandProp.logoUrl ?? prev.logoUrl ?? '/default-logo.svg',
        schoolName: brandProp.schoolName ?? prev.schoolName ?? 'CDL Trainer',
        primaryColor: brandProp.primaryColor ?? prev.primaryColor ?? '',
      }))
    }
  }, [brandProp?.logoUrl, brandProp?.schoolName, brandProp?.primaryColor])

  // Subscribe for runtime school switches (only if no prop provided)
  useEffect(() => {
    if (brandProp) return // parent controls branding; no subscription needed
    const unsub = subscribeBrandingUpdated(detail => {
      setBrand(prev => ({
        logoUrl: detail?.logoUrl ?? prev.logoUrl ?? '/default-logo.svg',
        schoolName: detail?.schoolName ?? prev.schoolName ?? 'CDL Trainer',
        primaryColor: detail?.primaryColor ?? prev.primaryColor ?? '',
      }))
    })
    return unsub
  }, [brandProp])

  // --- Close dropdowns on outside click / ESC
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        profileOpen &&
        profileRef.current &&
        !profileRef.current.contains(e.target)
      ) {
        setProfileOpen(false)
      }
    }
    function handleEsc(e) {
      if (e.key === 'Escape') {
        setProfileOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [profileOpen])

  // --- Build visible nav (from central config) ---
  const links = useMemo(() => {
    // Always show Home first; rest comes from central config per role
    const base = [{ to: '/', label: 'Home', always: true }]
    const roleLinks = getNavLinksForRole(role || 'student')
    return [...base, ...roleLinks]
  }, [role])

  // Profile dropdown items
  const userMenu = useMemo(() => {
    if (!role) return []
    return [
      { label: 'Profile', action: () => navigate(`/${role}/profile`) },
      { label: 'Dashboard', action: () => navigate(getDashboardRoute(role)) },
      {
        label: 'Logout',
        action: () =>
          typeof logout === 'function' ? logout() : navigate('/login'),
      },
    ]
  }, [navigate, role, logout])

  // Handlers
  const handleMenuToggle = useCallback(() => setMenuOpen(v => !v), [])
  const handleAvatarKey = useCallback(e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setProfileOpen(v => !v)
    }
  }, [])
  const handleThemeSwitch = useCallback(() => {
    document.body.classList.toggle('dark-mode')
  }, [])
  const goHome = useCallback(() => {
    navigate(role ? getDashboardRoute(role) : '/')
  }, [navigate, role])

  return (
    <nav
      className={styles.navbar}
      aria-label="Main Navigation"
      data-scrolled={scrolled ? 'true' : 'false'}
    >
      {/* Branding */}
      <button
        className={styles.left}
        onClick={goHome}
        type="button"
        aria-label="Go to home"
      >
        <img
          src={brand?.logoUrl || '/default-logo.svg'}
          alt={`${brand?.schoolName || 'School'} logo`}
          className={styles.logo}
          loading="lazy"
          decoding="async"
        />
        <span className={styles.brand}>
          {brand?.schoolName || 'CDL Trainer'}
        </span>
      </button>

      {/* Desktop links / mobile panel */}
      <div
        className={`${styles.links} ${menuOpen ? styles.linksOpen : ''}`}
        id="main-navigation"
        role="menubar"
      >
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ''}`
            }
            onClick={() => setMenuOpen(false)}
            end
            role="menuitem"
          >
            {link.label}
          </NavLink>
        ))}

        {/* Theme toggle (optional) */}
        <button
          className={styles.themeBtn}
          aria-label="Toggle theme"
          onClick={handleThemeSwitch}
          type="button"
        >
          <span role="img" aria-label="Theme">
            🌓
          </span>
        </button>
      </div>

      {/* User menu */}
      {role ? (
        <div className={styles.user} ref={profileRef}>
          <button
            className={styles.avatarBtn}
            onClick={() => setProfileOpen(v => !v)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onKeyDown={handleAvatarKey}
            aria-label="Open user menu"
            type="button"
          >
            <img src={avatarUrl} alt="User avatar" className={styles.avatar} />
            {notifications > 0 && (
              <span
                className={styles.notifBadge}
                aria-label={`${notifications} notifications`}
              >
                {notifications}
              </span>
            )}
          </button>

          {profileOpen && (
            <div className={styles.dropdown} role="menu">
              <div className={styles.dropdownUser}>
                <span className={styles.dropdownEmail} title={email}>
                  {email}
                </span>
                <span className={styles.dropdownRole}>{role}</span>
              </div>
              {userMenu.map(item => (
                <button
                  key={item.label}
                  className={styles.dropdownItem}
                  role="menuitem"
                  onClick={() => {
                    item.action()
                    setProfileOpen(false)
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Hamburger (mobile) */}
      <button
        className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ''}`}
        onClick={handleMenuToggle}
        aria-label="Toggle navigation menu"
        aria-controls="main-navigation"
        aria-expanded={menuOpen}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>
    </nav>
  )
}

export default memo(NavBar)
