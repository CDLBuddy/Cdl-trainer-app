// src/App.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  Suspense,
  lazy,
} from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'

// Guards & utils
import NavBar from './components/NavBar.jsx'
import SplashScreen from './components/SplashScreen.jsx'
import { getDashboardRoute } from './navigation/navigation.js' // ✅ fixed path
import { SessionContext } from './session-context.jsx'
import { useAuthStatus, getUserRole } from './utils/auth.js'
import { RequireRole } from './utils/RequireRole.jsx'
import {
  subscribeBrandingUpdated,
  getCachedBrandingSummary,
} from './utils/school-branding.js'

// Layout

// Lazy public pages
const Welcome = lazy(() => import('./pages/Welcome.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Signup = lazy(() => import('./pages/Signup.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

// Lazy role routers
const StudentRouter = lazy(() => import('./student/StudentRouter.jsx'))
const InstructorRouter = lazy(() => import('./instructor/InstructorRouter.jsx'))
const AdminRouter = lazy(() => import('./admin/AdminRouter.jsx'))
const SuperadminRouter = lazy(() => import('./superadmin/SuperadminRouter.jsx'))

/* =========================
/* =========================
   Session Context (read-only)
   ========================= */
// moved to session-context.js to avoid Fast Refresh warning (non-component exports)
/* =========================
   ScrollToTop on route change
   ========================= */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

/* =========================
   Branding sync (logo/name/color)
   ========================= */
function useBrandingSync() {
  const [brand, setBrand] = useState(getCachedBrandingSummary())
  useEffect(() => {
    const unsub = subscribeBrandingUpdated(detail => {
      if (detail?.primaryColor) {
        document.documentElement.style.setProperty(
          '--brand-primary',
          detail.primaryColor
        )
      }
      setBrand({
        logoUrl: detail?.logoUrl || '',
        schoolName: detail?.schoolName || '',
        primaryColor: detail?.primaryColor || '',
        subHeadline: detail?.subHeadline || '',
      })
    })
    return unsub
  }, [])
  return brand
}

/* =========================
   NavBar visibility
   ========================= */
const NAVBAR_HIDDEN_PATHS = [
  /^\/$/,
  /^\/login$/,
  /^\/signup$/,
  /^\/reset-password/,
]
function useHideNavBar() {
  const { pathname } = useLocation()
  return NAVBAR_HIDDEN_PATHS.some(pat =>
    pat instanceof RegExp ? pat.test(pathname) : pathname === pat
  )
}
function ConditionalNavBar({ brand }) {
  const hide = useHideNavBar()
  return hide ? null : <NavBar brand={brand} />
}

/* =========================
   Guards
   ========================= */
function RequireAuth({ children }) {
  const { loading, isLoggedIn } = useAuthStatus()
  const location = useLocation()
  if (loading) return <SplashScreen message="Checking your session…" />
  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}

function RequireNotLoggedIn({ children }) {
  const { loading, isLoggedIn, role } = useAuthStatus()
  if (loading) return <SplashScreen message="Loading…" />
  if (!isLoggedIn) return children
  return <Navigate to={getDashboardRoute(role || getUserRole())} replace />
}

// Optional role-aware root
function RootRedirect() {
  const { loading, isLoggedIn, role } = useAuthStatus()
  if (loading) return <SplashScreen />
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <Navigate to={getDashboardRoute(role || getUserRole())} replace />
}

/* =========================
   Error Boundary
   ========================= */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('Uncaught app error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="error-overlay"
          style={{ textAlign: 'center', padding: '6em 1em' }}
        >
          <h2>Something went wrong.</h2>
          <p style={{ color: '#b22' }}>
            {this.state.error?.toString() || 'Unknown error'}
          </p>
          <button
            className="btn"
            onClick={() => window.location.reload()}
            style={{ marginTop: 20 }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

/* =========================
   App
   ========================= */
export default function App() {
  const authState = useAuthStatus() // { loading, isLoggedIn, role, user }
  const brand = useBrandingSync()

  // Stable memo so consumers don’t rerender on unrelated changes
  const sessionValue = useMemo(
    () => ({
      loading: authState.loading,
      isLoggedIn: authState.isLoggedIn,
      role: authState.role,
      user: authState.user,
    }),
    [authState.loading, authState.isLoggedIn, authState.role, authState.user]
  )

  return (
    <SessionContext.Provider value={sessionValue}>
      <ErrorBoundary>
        <Router>
          <ScrollToTop />
          <ConditionalNavBar brand={brand} />
          <Suspense
            fallback={
              <SplashScreen message="Loading CDL Trainer…" showTip={false} />
            }
          >
            <Routes>
              {/* Public */}
              <Route
                path="/"
                element={
                  <RequireNotLoggedIn>
                    <Welcome />
                  </RequireNotLoggedIn>
                }
              />
              <Route
                path="/login"
                element={
                  <RequireNotLoggedIn>
                    <Login />
                  </RequireNotLoggedIn>
                }
              />
              <Route
                path="/signup"
                element={
                  <RequireNotLoggedIn>
                    <Signup />
                  </RequireNotLoggedIn>
                }
              />

              {/* Student */}
              <Route
                path="/student/*"
                element={
                  <RequireAuth>
                    <RequireRole role="student">
                      <StudentRouter />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              {/* Instructor */}
              <Route
                path="/instructor/*"
                element={
                  <RequireAuth>
                    <RequireRole role="instructor">
                      <InstructorRouter />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              {/* Admin */}
              <Route
                path="/admin/*"
                element={
                  <RequireAuth>
                    <RequireRole role="admin">
                      <AdminRouter />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              {/* Superadmin */}
              <Route
                path="/superadmin/*"
                element={
                  <RequireAuth>
                    <RequireRole role="superadmin">
                      <SuperadminRouter />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              {/* 404 or role-aware fallback */}
              <Route path="*" element={<NotFound />} />
              {/* Or swap for: <Route path="*" element={<RootRedirect />} /> */}
            </Routes>
          </Suspense>
        </Router>
      </ErrorBoundary>
    </SessionContext.Provider>
  )
}
