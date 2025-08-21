// src/components/NavBar.jsx
// ======================================================================
// NavBar (mobile-polished)
// - Locks page scroll when mobile menu is open
// - Focus management for burger/profile dropdown
// - ESC + resize close guards
// - Intent prefetch for role routers (hover/focus/touchstart)
// - Uses dynamic imports for admin/instructor preloaders to avoid
//   static/dynamic chunk conflicts with route-preload.js
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
  getTopNavForRole,
} from '@navigation/navConfig.js'
import {
  getCachedBrandingSummary,
  subscribeBrandingUpdated,
} from '@utils/school-branding.js'

// Central helper that itself dynamically imports role preloaders.
import { preloadRoutesForRole } from '@/utils/route-preload.js'

import { useSession } from '../session/useSession.js'

import styles from './NavBar.module.css'

/* --------------------------------- Helpers -------------------------------- */

const noop = () => {}

/** Infer role segment from a URL path */
function roleFromPath(path = '') {
  const m = /^\/(student|instructor|admin|superadmin)(?:\/|$)/i.exec(String(path))
  return m ? m[1].toLowerCase() : null
}

/** Dynamic wrappers (avoid static imports of admin/instructor preloaders) */
async function warmAdminOnIdleDyn() {
  try { return (await import('@admin/preload.js')).warmAdminOnIdle?.() } catch { return noop() }
}
async function warmInstructorOnIdleDyn() {
  try { return (await import('@instructor/preload.js')).warmInstructorOnIdle?.() } catch { return noop() }
}
async function prefetchAdminByPathDyn(path) {
  try { return (await import('@admin/preload.js')).prefetchAdminByPath?.(path) } catch { /* ignore */ }
}
async function prefetchInstructorByPathOrRouteDyn(path) {
  try {
    const mod = await import('@instructor/preload.js')
    if (typeof mod.prefetchInstructorByPath === 'function') {
      return mod.prefetchInstructorByPath(path)
    }
    return mod.preloadRoute?.(path)
  } catch { /* ignore */ }
}

/* -------------------------------- Component ------------------------------- */

function NavBar({ brand: brandProp }) {
  const session = useSession() || {}
  const { role, user, logout, notifications: notifCount } = session

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
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
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

  // Idle warm-up for role routers (gentle, idempotent) — now via dynamic import
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const cancelAdmin = (await warmAdminOnIdleDyn()) || noop
        const cancelInstr = (await warmInstructorOnIdleDyn()) || noop
        if (cancelled) {
          // try to cancel immediately if effect already unmounted
          try { cancelAdmin() } catch {
            // intentionally ignored
          }
          try { cancelInstr() } catch {
            // intentionally ignored
          }
        } else {
          // store no-ops locally on cleanup
          ;(NavBar.__adminCancel = cancelAdmin), (NavBar.__instrCancel = cancelInstr)
        }
      } catch { /* ignore */ }
    })()
    return () => {
      cancelled = true
      try { NavBar.__adminCancel?.() } catch { /* intentionally ignored */ }
      try { NavBar.__instrCancel?.() } catch {
        // intentionally ignored
      }
    }
  }, [])

  // Build visible nav from central config
  const links = useMemo(() => {
    const base = [{ to: '/', label: 'Home', icon: '🏠', exact: true }]
    const roleLinks = (getTopNavForRole(role || 'student') || []).map(l => ({
      exact: false, // nested routes remain active
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

  // Preload role router on nav intent (hover/focus/touch) — best-effort
  const handleLinkPrefetch = useCallback((to) => {
    const r = roleFromPath(to)
    if (!r) return
    try {
      // If central preloader exists, let it decide (it does dynamic imports internally)
      if (typeof preloadRoutesForRole === 'function') {
        // Some apps accept (role, path), others only (role)
        const res = preloadRoutesForRole.length >= 2
          ? preloadRoutesForRole(r, to)
          : preloadRoutesForRole(r)
        void res
        return
      }
      // Fallback to direct dynamic imports per role:
      if (r === 'admin') {
        void prefetchAdminByPathDyn(to)
      } else if (r === 'instructor') {
        void prefetchInstructorByPathOrRouteDyn(to)
      }
    } catch {
      /* ignore prefetch errors */
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
      style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
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
            onTouchStart={() => handleLinkPrefetch(link.to)}
            end={!!link.exact}
            role="menuitem"
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
