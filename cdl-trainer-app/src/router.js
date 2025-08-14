// src/router.js
import React, { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import AppLayout from './App.jsx'
import SplashScreen from '@components/SplashScreen.jsx'
import { RequireRole } from '@utils/RequireRole.jsx'
import { getDashboardRoute } from '@navigation/navigation.js'

// Lazy pages (code-split)
const Welcome  = React.lazy(() => import('@pages/Welcome.jsx'))
const Login    = React.lazy(() => import('@pages/Login.jsx'))
const Signup   = React.lazy(() => import('@pages/Signup.jsx'))
const NotFound = React.lazy(() => import('@pages/NotFound.jsx'))

// Role routers (code-split)
const StudentRouter    = React.lazy(() => import('@student/StudentRouter.jsx'))
const InstructorRouter = React.lazy(() => import('@instructor/InstructorRouter.jsx'))
const AdminRouter      = React.lazy(() => import('@admin/AdminRouter.jsx'))
const SuperadminRouter = React.lazy(() => import('@superadmin/SuperadminRouter.jsx'))

// Small helper so our fallbacks are consistent
const withSuspense = (node, message) => (
  <Suspense fallback={<SplashScreen message={message} showTip={false} />}>
    {node}
  </Suspense>
)

/* =========================
   Public-guard helper
   ========================= */
function RequireNotLoggedIn({ children }) {
  const role =
    (typeof localStorage !== 'undefined' && localStorage.getItem('userRole')) ||
    (typeof window !== 'undefined' && window.currentUserRole) ||
    null

  // If we *know* the user has a role, bounce them to their dashboard.
  if (role) return <Navigate to={getDashboardRoute(role)} replace />
  return children
}

/* =========================
   Router (Data Router API)
   ========================= */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: (
      <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
        <h2>Something went wrong.</h2>
        <button className="btn" onClick={() => window.location.reload()} style={{ marginTop: 20 }}>
          Reload App
        </button>
      </div>
    ),
    children: [
      // ---------- Public ----------
      {
        path: '/',
        element: (
          <RequireNotLoggedIn>
            {withSuspense(<Welcome />, 'Loading…')}
          </RequireNotLoggedIn>
        ),
      },
      {
        path: '/login',
        element: (
          <RequireNotLoggedIn>
            {withSuspense(<Login />, 'Loading…')}
          </RequireNotLoggedIn>
        ),
      },
      {
        path: '/signup',
        element: (
          <RequireNotLoggedIn>
            {withSuspense(<Signup />, 'Loading…')}
          </RequireNotLoggedIn>
        ),
      },

      // Optional: a role-aware landing if someone visits /dashboard directly
      { path: '/dashboard', element: <RootRedirect /> },

      // ---------- Student ----------
      {
        path: '/student/*',
        element: (
          <RequireRole role="student" fallback={<SplashScreen message="Loading student…" showTip={false} />}>
            {withSuspense(<StudentRouter />, 'Loading student…')}
          </RequireRole>
        ),
      },

      // ---------- Instructor ----------
      {
        path: '/instructor/*',
        element: (
          <RequireRole role="instructor" fallback={<SplashScreen message="Loading instructor…" showTip={false} />}>
            {withSuspense(<InstructorRouter />, 'Loading instructor…')}
          </RequireRole>
        ),
      },

      // ---------- Admin ----------
      {
        path: '/admin/*',
        element: (
          <RequireRole role="admin" fallback={<SplashScreen message="Loading admin…" showTip={false} />}>
            {withSuspense(<AdminRouter />, 'Loading admin…')}
          </RequireRole>
        ),
      },

      // ---------- Superadmin ----------
      {
        path: '/superadmin/*',
        element: (
          <RequireRole role="superadmin" fallback={<SplashScreen message="Loading super admin…" showTip={false} />}>
            {withSuspense(<SuperadminRouter />, 'Loading super admin…')}
          </RequireRole>
        ),
      },

      // ---------- 404 ----------
      { path: '*', element: withSuspense(<NotFound />, 'Loading…') },
      // If you prefer a "role-aware" catch-all, swap the above with:
      // { path: '*', element: <RootRedirect /> },
    ],
  },
])

/* =========================
   Role-aware root redirect
   ========================= */
function RootRedirect() {
  try {
    const role =
      (typeof localStorage !== 'undefined' && localStorage.getItem('userRole')) ||
      (typeof window !== 'undefined' && window.currentUserRole) ||
      null
    if (!role) return <Navigate to="/login" replace />
    return <Navigate to={getDashboardRoute(role)} replace />
  } catch {
    return <Navigate to="/login" replace />
  }
}