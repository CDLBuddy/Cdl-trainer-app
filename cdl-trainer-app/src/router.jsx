// src/router.jsx
// ======================================================================
// Central route table (React Router Data Router)
// - AppLayout wraps all routes
// - Public pages (welcome/login/signup)
// - Role routers (student/instructor/admin/superadmin)
// - Role-aware redirects + consistent fallbacks
// - Suspense fallbacks for all lazy chunks
// - Env 'basename' support for subfolder deploys
// ======================================================================

import React from 'react'
import { createBrowserRouter } from 'react-router-dom'

import SplashScreen from '@components/SplashScreen.jsx'
import { RequireRole } from '@utils/RequireRole.jsx'

import AppLayout from './App.jsx'
import { RequireNotLoggedIn, RootRedirect } from './router-helpers.jsx'

// ===== Lazy pages (code-split) =========================================
const Welcome = React.lazy(() => import('@pages/Welcome.jsx'))
const Login = React.lazy(() => import('@pages/Login.jsx'))
const Signup = React.lazy(() => import('@pages/Signup.jsx'))
const NotFound = React.lazy(() => import('@pages/NotFound.jsx'))

// ===== Role routers (code-split) =======================================
const StudentRouter = React.lazy(() => import('@student/StudentRouter.jsx'))
const InstructorRouter = React.lazy(
  () => import('@instructor/InstructorRouter.jsx')
)
const AdminRouter = React.lazy(() => import('@admin/AdminRouter.jsx'))
const SuperadminRouter = React.lazy(
  () => import('@superadmin/SuperadminRouter.jsx')
)

// Small helper to wrap lazy elements with a consistent splash
const withSuspense = (node, message) => (
  <React.Suspense fallback={<SplashScreen message={message} showTip={false} />}>
    {node}
  </React.Suspense>
)

// Optional basename (for subfolder deploys); Vite exposes BASE_URL.
// You can also set VITE_ROUTER_BASENAME if you prefer.
const BASENAME =
  (typeof import.meta !== 'undefined' &&
    import.meta?.env?.VITE_ROUTER_BASENAME) ||
  (typeof import.meta !== 'undefined' && import.meta?.env?.BASE_URL) ||
  '/'

/* =========================
   Router (Data Router API)
   ========================= */
export const router = createBrowserRouter(
  [
    {
      element: <AppLayout />,
      errorElement: (
        <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
          <h2>Something went wrong.</h2>
          {import.meta?.env?.DEV ? (
            <p style={{ opacity: 0.8, marginTop: 8 }}>
              Check the browser console for details.
            </p>
          ) : null}
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
          index: true,
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
              {withSuspense(<Login />, 'Loading login…')}
            </RequireNotLoggedIn>
          ),
        },
        {
          path: '/signup',
          element: (
            <RequireNotLoggedIn>
              {withSuspense(<Signup />, 'Loading signup…')}
            </RequireNotLoggedIn>
          ),
        },

        // Role-aware landing for post-auth redirects
        { path: '/dashboard', element: <RootRedirect /> },

        // ---------- Student ----------
        {
          path: '/student/*',
          element: (
            <RequireRole
              requiredRole="student"
              fallback={
                <SplashScreen message="Loading student…" showTip={false} />
              }
            >
              {withSuspense(<StudentRouter />, 'Loading student…')}
            </RequireRole>
          ),
        },

        // ---------- Instructor ----------
        {
          path: '/instructor/*',
          element: (
            <RequireRole
              requiredRole="instructor"
              fallback={
                <SplashScreen message="Loading instructor…" showTip={false} />
              }
            >
              {withSuspense(<InstructorRouter />, 'Loading instructor…')}
            </RequireRole>
          ),
        },

        // ---------- Admin ----------
        {
          path: '/admin/*',
          element: (
            <RequireRole
              requiredRole="admin"
              fallback={
                <SplashScreen message="Loading admin…" showTip={false} />
              }
            >
              {withSuspense(<AdminRouter />, 'Loading admin…')}
            </RequireRole>
          ),
        },

        // ---------- Superadmin ----------
        {
          path: '/superadmin/*',
          element: (
            <RequireRole
              requiredRole="superadmin"
              fallback={
                <SplashScreen message="Loading super admin…" showTip={false} />
              }
            >
              {withSuspense(<SuperadminRouter />, 'Loading super admin…')}
            </RequireRole>
          ),
        },

        // ---------- 404 ----------
        { path: '/404', element: withSuspense(<NotFound />, 'Loading…') },
        { path: '*', element: withSuspense(<NotFound />, 'Loading…') },
      ],
    },
  ],
  { basename: BASENAME }
)

export default router
