// src/router-helpers.jsx
import React from 'react'
import { Navigate } from 'react-router-dom'

import SplashScreen from '@components/SplashScreen.jsx'
import { getDashboardRoute } from '@navigation/navigation.js'
import { useAuthStatus } from '@utils/auth.js'

export function RequireNotLoggedIn({ children }) {
  const { loading, isLoggedIn, role } = useAuthStatus() || {}

  if (loading) {
    return <SplashScreen message="Loading…" showTip={false} />
  }

  return isLoggedIn
    ? <Navigate to={getDashboardRoute(role || 'student')} replace />
    : children
}

export function RootRedirect() {
  const { loading, isLoggedIn, role } = useAuthStatus() || {}

  if (loading) {
    return <SplashScreen message="Loading…" showTip={false} />
  }

  return isLoggedIn
    ? <Navigate to={getDashboardRoute(role || 'student')} replace />
    : <Navigate to="/login" replace />
}
