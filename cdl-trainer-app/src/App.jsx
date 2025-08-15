// src/App.jsx
// ======================================================================
// Layout Route Element (React Router Data Router)
// - Renders global chrome (NavBar) + routed content via <Outlet/>
// - Local Suspense fallback for lazy sub-routes
// - Scroll restoration between navigations
// - Branding + NavBar visibility handled via layout hooks
// ======================================================================

import React, { Suspense } from 'react'
import { Outlet, ScrollRestoration } from 'react-router-dom'

// Global UI
import NavBar from '@components/NavBar.jsx'
import SplashScreen from '@components/SplashScreen.jsx'

// Layout hooks (centralized)
import { useBrandingSync, useHideNavBar } from '@utils/layout-hooks.js'

export default function AppLayout() {
  const brand = useBrandingSync()
  const hideNav = useHideNavBar()

  return (
    <>
      {/* Global navigation (can be hidden per-route via hook) */}
      {!hideNav && <NavBar brand={brand} />}

      {/* Route-level code-splitting fallback */}
      <Suspense fallback={<SplashScreen message="Loading CDL Trainer…" showTip={false} />}>
        {/* Landmark for a11y + skip links */}
        <main id="main" role="main">
          <Outlet />
        </main>
      </Suspense>

      {/* Restores scroll on navigation (Data Router feature) */}
      <ScrollRestoration />
    </>
  )
}