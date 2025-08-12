// src/router.js
import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import AppLayout from './App.jsx'
import SplashScreen from '@components/SplashScreen.jsx'
import { RequireRole } from '@utils/RequireRole.jsx'
import { getDashboardRoute } from '@navigation/navigation.js'

// Lazy pages (code-split)
const Welcome       = React.lazy(() => import('@pages/Welcome.jsx'))
const Login         = React.lazy(() => import('@pages/Login.jsx'))
const Signup        = React.lazy(() => import('@pages/Signup.jsx'))
const NotFound      = React.lazy(() => import('@pages/NotFound.jsx'))

// Role routers (code-split)
const StudentRouter     = React.lazy(() => import('@student/StudentRouter.jsx'))
const InstructorRouter  = React.lazy(() => import('@instructor/InstructorRouter.jsx'))
const AdminRouter       = React.lazy(() => import('@admin/AdminRouter.jsx'))
const SuperadminRouter  = React.lazy(() => import('@superadmin/SuperadminRouter.jsx'))

/* =========================
   Public-guard helpers
   ========================= */
function RequireNotLoggedIn({ children }) {
  // Lightweight check using localStorage/window so the public pages render fast.
  // Your real auth gating happens in <RequireRole/>.
  const role = (typeof localStorage !== 'undefined' && localStorage.getItem('userRole')) ||
               (typeof window !== 'undefined' && window.currentUserRole) ||
               null
  // If we *know* the user is logged in (role present), bounce to dashboard.
  // (If role is absent but user is actually logged in, RequireRole will still guard protected routes.)
  if (role) {
    return <Navigate to={getDashboardRoute(role)} replace />
  }
  return children
}

/* =========================
   Router (Data Router API)
   ========================= */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    // If a route element throws before it renders (rare), show a friendly recovery.
    errorElement: (
      <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
        <h2>Something went wrong.</h2>
        <button
          className="btn"
          onClick={() => window.location.reload()}
          style={{ marginTop: 20 }}
        >
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
            <Welcome />
          </RequireNotLoggedIn>
        ),
      },
      {
        path: '/login',
        element: (
          <RequireNotLoggedIn>
            <Login />
          </RequireNotLoggedIn>
        ),
      },
      {
        path: '/signup',
        element: (
          <RequireNotLoggedIn>
            <Signup />
          </RequireNotLoggedIn>
        ),
      },

      // ---------- Student ----------
      {
        path: '/student/*',
        element: (
          <RequireRole role="student" fallback={<SplashScreen message="Loading student…" showTip={false} />}>
            <StudentRouter />
          </RequireRole>
        ),
      },

      // ---------- Instructor ----------
      {
        path: '/instructor/*',
        element: (
          <RequireRole role="instructor" fallback={<SplashScreen message="Loading instructor…" showTip={false} />}>
            <InstructorRouter />
          </RequireRole>
        ),
      },

      // ---------- Admin ----------
      {
        path: '/admin/*',
        element: (
          <RequireRole role="admin" fallback={<SplashScreen message="Loading admin…" showTip={false} />}>
            <AdminRouter />
          </RequireRole>
        ),
      },

      // ---------- Superadmin ----------
      {
        path: '/superadmin/*',
        element: (
          <RequireRole role="superadmin" fallback={<SplashScreen message="Loading super admin…" showTip={false} />}>
            <SuperadminRouter />
          </RequireRole>
        ),
      },

      // ---------- 404 ----------
      { path: '*', element: <NotFound /> },
      // If you prefer a "role-aware" catch-all, swap the above with:
      // { path: '*', element: <RootRedirect /> },
    ],
  },
])

/* =========================
   Optional: role-aware root redirect
   Use this instead of NotFound if you always want to bounce unknown paths
   back to the right dashboard when logged in.
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