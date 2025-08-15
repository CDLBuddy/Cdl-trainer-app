// src/router-helpers.jsx
import React from 'react'
import { Navigate } from 'react-router-dom'

import { getDashboardRoute } from '@navigation/navigation.js'

export function RequireNotLoggedIn({ children }) {
  const role =
    (typeof localStorage !== 'undefined' && localStorage.getItem('userRole')) ||
    (typeof window !== 'undefined' && window.currentUserRole) ||
    null

  return role ? <Navigate to={getDashboardRoute(role)} replace /> : children
}

export function RootRedirect() {
  try {
    const role =
      (typeof localStorage !== 'undefined' && localStorage.getItem('userRole')) ||
      (typeof window !== 'undefined' && window.currentUserRole) ||
      null
    return role ? <Navigate to={getDashboardRoute(role)} replace /> : <Navigate to="/login" replace />
  } catch {
    return <Navigate to="/login" replace />
  }
}
