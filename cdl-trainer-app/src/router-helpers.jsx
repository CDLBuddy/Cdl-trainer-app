// src/router-helpers.jsx
// ======================================================================
// Lightweight route helpers (React Router v6+)
// - Loop-safe: never navigate to the same path you’re already on
// - RequireNotLoggedIn: blocks login/signup for authed users
// - RootRedirect: "/" -> dashboard (authed) or "/login" (guest)
// ======================================================================

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import SplashScreen from '@components/SplashScreen.jsx'
import {
  getDashboardRoute,
  sanitizeReturnPath, // ensures internal, non-/login path
} from '@navigation/navigation.js'
import { useAuthStatus } from '@utils/auth.js'

// Normalize to a bare pathname and strip trailing slashes
function pathOnly(p = '') {
  const s = String(p || '')
  const hashFree = s.split('#', 1)[0]
  const qFree = hashFree.split('?', 1)[0]
  const trimmed = qFree.replace(/\/+$/, '')
  return trimmed || '/'
}

export function RequireNotLoggedIn({ children, loadingText = 'Loading…' }) {
  const { loading, isLoggedIn, role } = useAuthStatus() || {}
  const location = useLocation()

  if (loading) {
    return <SplashScreen message={loadingText} showTip={false} />
  }

  if (!isLoggedIn) {
    return children
  }

  // If already authed, try to honor a safe "from" destination
  const fromState = location?.state?.from?.pathname
  let fromQuery = null
  try {
    fromQuery = new URLSearchParams(location?.search || '').get('from')
  } catch {
    /* ignore parse errors */
  }

  const candidate = sanitizeReturnPath(fromState || fromQuery || '')
  const dest = candidate || getDashboardRoute(role || 'student')

  // ⛔️ Loop guard: only navigate if destination differs
  if (pathOnly(location.pathname) === pathOnly(dest)) return null

  return <Navigate to={dest} replace />
}

export function RootRedirect({ loadingText = 'Loading…' }) {
  const { loading, isLoggedIn, role } = useAuthStatus() || {}
  const location = useLocation()

  if (loading) {
    return <SplashScreen message={loadingText} showTip={false} />
  }

  const dest = isLoggedIn ? getDashboardRoute(role || 'student') : '/login'

  // ⛔️ Loop guard
  if (pathOnly(location.pathname) === pathOnly(dest)) return null

  return <Navigate to={dest} replace />
}

export default { RequireNotLoggedIn, RootRedirect }
