// src/components/NavBar.jsx
// ======================================================================
// NavBar
// - Brand (logo + schoolName) from prop or branding bus
// - Role-aware links from central navigation config
// - Role router preloading on hover (idle-aware)
// - Accessible menus, keyboard toggles, outside-click & ESC handling
// - Active link styling works for nested routes
// ======================================================================

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'

import {
  getDashboardRoute,
  getNavLinksForRole,
} from '@navigation/navigation.js'
import { preloadRoutesForRole } from '@/utils/route-preload.js'
import {
  getCachedBrandingSummary,
  subscribeBrandingUpdated,
} from '@utils/school-branding.js'

import { useSession } from '../session/useSession.js'

import styles from './NavBar.module.css'

/** Infer role from a path target like "/student", "/instructor", etc. */
function roleFromPath(path = '') {
  const m = /^\/(student|instructor|admin|superadmin)(?:\/|$)/i.exec(String(path))
  return m?.[1] || null
}

function NavBar({ brand: brandProp }) {
  const { role, user, logout, notifications: notifCount } = useSession() || {}
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const profileRef = useRef(null)

  // Close the mobile menu on route change
  useEffect(() => {
    if (menuOpen) setMenuOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Scroll elevation (rAF + prefers-reduced-motion)
  useEffect(() => {
    let ticking = false
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const onScroll = () => {
      if (prefersReduced) {
        setScrolled(window.scrollY > 6)
        return
      }
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 6)
        ticking = false
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Branding (prop wins; else cached + live updates)
  const [brand, setBrand] = useState(() => {
    if (brandProp && (brandProp.logoUrl || brandProp.schoolName)) return brandProp
    return getCachedBrandingSummary()
  })

  useEffect(() => {
    if (!brandProp) return
    setBrand(prev => ({
      logoUrl: brandProp.logoUrl ?? prev?.logoUrl ?? '/default-logo.svg',
      schoolName: brandProp.schoolName ?? prev?.schoolName ?? 'CDL Trainer',
      primaryColor: brandProp.primaryColor ?? prev?.primaryColor ?? '',
    }))
  }, [brandProp])

  useEffect(() => {
    if (brandProp) return
    const unsub = subscribeBrandingUpdated(detail => {
      setBrand(prev => ({
        logoUrl: detail?.logoUrl ?? prev?.logoUrl ?? '/default-logo.svg',
        schoolName: detail?.schoolName ?? prev?.schoolName ?? 'CDL Trainer',
        primaryColor: detail?.primaryColor ?? prev?.primaryColor ?? '',
      }))
    })
    return unsub
  }, [brandProp])

  // Close dropdowns on outside click + ESC
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) {
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

  // Build visible nav from central config
  const links = useMemo(() => {
    const base = [{ to: '/', label: 'Home', icon: '🏠', exact: true, prefetchRole: null }]
    const roleLinks = (getNavLinksForRole(role || 'student') || []).map(l => ({
      exact: false,              // nested routes remain active
      prefetchRole: roleFromPath(l.to),
      ...l,
    }))
    return [...base, ...roleLinks]
  }, [role])

  // Profile dropdown items
  const userMenu = useMemo(() => {
    if (!role) return []
    return [
      { label: 'Profile',   action: () => navigate(`/${role}/profile`) },
      { label: 'Dashboard', action: () => navigate(getDashboardRoute(role)) },
      {
        label: 'Logout',
        action: () => (typeof logout === 'function' ? logout() : navigate('/login')),
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

  // Preload role router on nav intent (hover/focus)
  const handleLinkPrefetch = useCallback((to) => {
    try {
      const r = roleFromPath(to)
      if (r) preloadRoutesForRole(r) // util is idle/network-aware
    } catch {
      /* best-effort only */
    }
  }, [])

  const email = user?.email || ''
  const avatarUrl = user?.photoURL || '/default-avatar.svg'
  const notifications = Number(notifCount ?? 0)

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
        <span className={styles.brand}>{brand?.schoolName || 'CDL Trainer'}</span>
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
            onMouseEnter={() => handleLinkPrefetch(link.to)}
            onFocus={() => handleLinkPrefetch(link.to)}
            end={!!link.exact}
            role="menuitem"
          >
            {/* optional icon from nav config */}
            {link.icon ? (
              <span className={styles.linkIcon} aria-hidden>{link.icon}</span>
            ) : null}
            <span className={styles.linkLabel}>{link.label}</span>
          </NavLink>
        ))}

        {/* Theme toggle (optional) */}
        <button
          className={styles.themeBtn}
          aria-label="Toggle theme"
          onClick={handleThemeSwitch}
          type="button"
        >
          <span role="img" aria-label="Theme">🌓</span>
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