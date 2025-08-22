// src/router-helpers.jsx
// ======================================================================
// Lightweight route helpers (React Router v6+)
// - RequireNotLoggedIn: blocks login/signup for authed users,
//   redirecting to a safe destination (honors ?from= when valid).
// - RootRedirect: send "/" to dashboard if authed, else to "/login".
// - Loop-safe (no setState in render), SSR-safe guards.
// ======================================================================

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import SplashScreen from '@components/SplashScreen.jsx'
import {
  getDashboardRoute,
  sanitizeReturnPath, // ensures internal, non-/login path
} from '@navigation/navigation.js'
import { useAuthStatus } from '@utils/auth.js'

/**
 * RequireNotLoggedIn
 * Use this to wrap your Login/Signup pages. If the user is already logged in,
 * they’ll be redirected to a safe destination:
 *   - location.state.from.pathname (if present and safe), or
 *   - ?from=/some/path (if present and safe), or
 *   - the role’s dashboard
 */
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
  } catch { /* ignore parse errors */ }

  const candidate = sanitizeReturnPath(fromState || fromQuery || '')
  const dest = candidate || getDashboardRoute(role || 'student')

  return <Navigate to={dest} replace />
}

/**
 * RootRedirect
 * Use this for the "/" route. Sends authed users to their dashboard,
 * otherwise to the login page.
 */
export function RootRedirect({ loadingText = 'Loading…' }) {
  const { loading, isLoggedIn, role } = useAuthStatus() || {}

  if (loading) {
    return <SplashScreen message={loadingText} showTip={false} />
  }

  return isLoggedIn
    ? <Navigate to={getDashboardRoute(role || 'student')} replace />
    : <Navigate to="/login" replace />
}

export default { RequireNotLoggedIn, RootRedirect }