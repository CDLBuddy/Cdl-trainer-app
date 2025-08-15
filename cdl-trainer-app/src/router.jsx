// src/router.jsx
// ======================================================================
// Central route table (React Router Data Router)
// - AppLayout wraps all routes
// - Public pages (welcome/login/signup)
// - Role routers (student/instructor/admin/superadmin)
// - Role-aware redirects + consistent fallbacks
// ======================================================================

import React from 'react'
import { createBrowserRouter } from 'react-router-dom'

import SplashScreen from '@components/SplashScreen.jsx'
import { RequireRole } from '@utils/RequireRole.jsx'

import AppLayout from './App.jsx'
// Helpers moved out to keep this file export-only (no local components)
import { RequireNotLoggedIn, RootRedirect } from './router-helpers.jsx'

// ---- Lazy pages (code-split) -------------------------------------------
const Welcome  = React.lazy(() => import('@pages/Welcome.jsx'))
const Login    = React.lazy(() => import('@pages/Login.jsx'))
const Signup   = React.lazy(() => import('@pages/Signup.jsx'))
const NotFound = React.lazy(() => import('@pages/NotFound.jsx'))

// ---- Role routers (code-split) -----------------------------------------
const StudentRouter    = React.lazy(() => import('@student/StudentRouter.jsx'))
const InstructorRouter = React.lazy(() => import('@instructor/InstructorRouter.jsx'))
const AdminRouter      = React.lazy(() => import('@admin/AdminRouter.jsx'))
const SuperadminRouter = React.lazy(() => import('@superadmin/SuperadminRouter.jsx'))

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
        index: true,
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

      // Optional: a role-aware landing if someone visits /dashboard directly
      { path: '/dashboard', element: <RootRedirect /> },

      // ---------- Student ----------
      {
        path: '/student/*',
        element: (
          <RequireRole requiredRole="student" fallback={<SplashScreen message="Loading student…" showTip={false} />}>
            <StudentRouter />
          </RequireRole>
        ),
      },

      // ---------- Instructor ----------
      {
        path: '/instructor/*',
        element: (
          <RequireRole requiredRole="instructor" fallback={<SplashScreen message="Loading instructor…" showTip={false} />}>
            <InstructorRouter />
          </RequireRole>
        ),
      },

      // ---------- Admin ----------
      {
        path: '/admin/*',
        element: (
          <RequireRole requiredRole="admin" fallback={<SplashScreen message="Loading admin…" showTip={false} />}>
            <AdminRouter />
          </RequireRole>
        ),
      },

      // ---------- Superadmin ----------
      {
        path: '/superadmin/*',
        element: (
          <RequireRole requiredRole="superadmin" fallback={<SplashScreen message="Loading super admin…" showTip={false} />}>
            <SuperadminRouter />
          </RequireRole>
        ),
      },

      // ---------- 404 ----------
      { path: '/404', element: <NotFound /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default router
