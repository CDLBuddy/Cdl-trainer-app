// src/App.jsx
// ======================================================================
// Layout Route Element (Data Router)
// - Renders global chrome (NavBar) + routed content via <Outlet/>
// - Suspense fallback for lazy pages
// - Scroll restoration between navigations
// - Branding + NavBar-visibility handled via layout hooks
// ======================================================================

import React, { Suspense } from 'react'
import { Outlet, ScrollRestoration } from 'react-router-dom'

// Global UI
import NavBar from '@components/NavBar.jsx'
import SplashScreen from '@components/SplashScreen.jsx'

// Layout hooks (centralized in utils/layout-hooks.js)
import { useBrandingSync, useHideNavBar } from '@utils/layout-hooks'

export default function AppLayout() {
  const brand = useBrandingSync()
  const hideNav = useHideNavBar()

  return (
    <>
      {!hideNav && <NavBar brand={brand} />}

      {/* Route-level code-splitting fallback */}
      <Suspense fallback={<SplashScreen message="Loading CDL Trainer…" showTip={false} />}>
        <Outlet />
      </Suspense>

      {/* Restores scroll on navigation (data router feature) */}
      <ScrollRestoration />
    </>
  )
}