// src/App.jsx
// ======================================================================
// Layout Route Element (React Router Data Router)
// - Renders global chrome (NavBar) + routed content via <Outlet/>
// - Local Suspense fallback for lazy sub-routes
// - Scroll restoration between navigations
// - A11y polish: skip link + focus management on route change
// - Branding + NavBar visibility handled via layout hooks
// ======================================================================

import React, { Suspense, useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'

// Global UI
import NavBar from '@components/NavBar.jsx'
import SplashScreen from '@components/SplashScreen.jsx'
// Layout hooks (centralized)
import { useBrandingSync, useHideNavBar } from '@utils/layout-hooks.js'

export default function AppLayout() {
  const brand = useBrandingSync()
  const hideNav = useHideNavBar()

  // -------- Focus management: move focus to <main> on route changes ------
  const mainRef = useRef(null)
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    // Don’t steal focus if navigating to an in-page anchor
    if (hash) return
    const el = mainRef.current
    if (!el) return
    // Make sure it can receive programmatic focus
    el.setAttribute('tabIndex', '-1')
    el.focus({ preventScroll: true })
  }, [pathname, search, hash])

  // Simple visually-hidden-until-focus style for the skip link
  const skipStyles = {
    position: 'absolute',
    left: '8px',
    top: '-40px',
    padding: '8px 12px',
    background: 'var(--color-bg, #fff)',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,.1)',
    transition: 'top .15s',
    zIndex: 1000,
  }

  return (
    <>
      {/* Skip link for keyboard users */}
      <a
        href="#main"
        onFocus={e => (e.currentTarget.style.top = '8px')}
        onBlur={e => (e.currentTarget.style.top = '-40px')}
        style={skipStyles}
      >
        Skip to content
      </a>

      {/* Global navigation (can be hidden per-route via hook) */}
      {!hideNav && <NavBar brand={brand} />}

      {/* Route-level code-splitting fallback */}
      <Suspense
        fallback={
          <SplashScreen message="Loading CDL Trainer…" showTip={false} />
        }
      >
        {/* Landmark for a11y + skip links */}
        <main
          id="main"
          ref={mainRef}
          role="main"
          // Safe-area nicety for mobile devices with notches/home indicators
          style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
        >
          <Outlet />
        </main>
      </Suspense>

      {/* Restores scroll on navigation (Data Router feature) */}
      <ScrollRestoration />

      {/* Optional gentle live region (non-disruptive) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      />
    </>
  )
}
