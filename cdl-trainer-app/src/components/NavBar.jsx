// src/components/NavBar.jsx
// ======================================================================
// NavBar (mobile-polished, dynamic-only preloads)
// - Locks page scroll when mobile menu is open
// - Focus mgmt for burger/profile dropdown
// - ESC + resize close guards
// - Intent prefetch via route-preload (hover/focus/touchstart)
// - Idle warming for the current role (deduped, network-aware)
// ======================================================================

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { getDashboardRoute, getTopNavForRole } from '@navigation/navConfig.js'
import {
  getCachedBrandingSummary,
  subscribeBrandingUpdated,
} from '@utils/school-branding.js'

// Central helpers (all dynamic under the hood — no static imports of role modules)
import {
  prefetchOnIntent, // returns { onMouseEnter, onFocus, onTouchStart }
  warmRoutesOnSession, // schedules idle warm for public + role shells
} from '@/utils/route-preload.js'

import { useSession } from '../session/useSession.js'

import styles from './NavBar.module.css'

/* -------------------------------- Component ------------------------------- */

function NavBar({ brand: brandProp }) {
  const session = useSession() || {}
  const { role, user, logout } = session

  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const profileRef = useRef(null)
  const burgerRef = useRef(null)
  const dropdownFirstItemRef = useRef(null)

  // Close the mobile menu on route change
  useEffect(() => {
    if (menuOpen) setMenuOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Scroll elevation (rAF + respects reduced motion)
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
    if (brandProp && (brandProp.logoUrl || brandProp.schoolName))
      return brandProp
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
        burgerRef.current?.focus?.()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [profileOpen])

  // Lock page scroll when the mobile menu is open (avoid layout shift)
  useEffect(() => {
    const body = document.body
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight

    if (menuOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth
      body.style.overflow = 'hidden'
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
    }
    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
    }
  }, [menuOpen])

  // Close mobile menu when resizing to desktop widths
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024 && menuOpen) setMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [menuOpen])

  // Idle warm-up for public + current role (deduped + network-aware)
  useEffect(() => {
    warmRoutesOnSession({
      loading: false,
      isLoggedIn: !!user,
      role: role || undefined,
    })
  }, [user, role])

  // Build visible nav from central config (remove extra 'Home')
  const links = useMemo(() => {
    const roleLinks = (getTopNavForRole(role || 'student') || []).map(l => ({
      exact: false, // nested routes remain active unless config says exact
      ...l,
    }))
    return roleLinks
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

  // Focus first dropdown item on open
  useEffect(() => {
    if (profileOpen) {
      const t = setTimeout(() => dropdownFirstItemRef.current?.focus?.(), 0)
      return () => clearTimeout(t)
    }
  }, [profileOpen])

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

  const email = user?.email || ''
  const avatarUrl = user?.photoURL || '/default-avatar.svg'
  const notifications = Number(session.notifications ?? 0)

  return (
    <nav
      className={styles.navbar}
      aria-label="Main Navigation"
      data-scrolled={scrolled ? 'true' : 'false'}
      style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
    >
      {/* Branding */}
      <button
        className={styles.left}
        onClick={goHome}
        type="button"
        aria-label="Go to dashboard"
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
        {/* ← hover/focus/touch prefetch */}
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ''}`
            }
            onClick={() => setMenuOpen(false)}
            {...prefetchOnIntent(link.to)}
            end={!!link.exact}
            role="menuitem"
            // data-preload-key is harmless metadata for analytics/debug
            data-preload-key={link.preloadKey || undefined}
          >
            {link.icon ? (
              <span className={styles.linkIcon} aria-hidden>
                {link.icon}
              </span>
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
              {userMenu.map((item, i) => (
                <button
                  key={item.label}
                  className={styles.dropdownItem}
                  role="menuitem"
                  ref={i === 0 ? dropdownFirstItemRef : undefined}
                  onClick={() => {
                    item.action()
                    setProfileOpen(false)
                    burgerRef.current?.focus?.()
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
        ref={burgerRef}
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
