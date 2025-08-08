// src/App.jsx
import React, { useEffect, createContext, useContext, useMemo, useState, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

// Shared guards & utils
import { RequireRole } from "./utils/RequireRole";
import { useAuthStatus, getUserRole } from "./utils/auth";
import { getDashboardRoute } from "./utils/navigation";
import { subscribeBrandingUpdated, getCachedBrandingSummary } from "./utils/school-branding";

// Layout
import NavBar from "./components/NavBar";
import SplashScreen from "./components/SplashScreen";

// Lazy public pages
const Welcome = lazy(() => import("./pages/Welcome"));
const Login   = lazy(() => import("./pages/Login"));
const Signup  = lazy(() => import("./pages/Signup"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy role routers
const StudentRouter    = lazy(() => import("./student/StudentRouter"));
const InstructorRouter = lazy(() => import("./instructor/InstructorRouter"));
const AdminRouter      = lazy(() => import("./admin/AdminRouter"));
const SuperadminRouter = lazy(() => import("./superadmin/SuperadminRouter"));

/* =========================================================================
   Session Context (read-only)
   We expose the auth snapshot from useAuthStatus() so components can read
   { loading, isLoggedIn, role, user } anywhere with useSession().
   ========================================================================= */
const SessionContext = createContext(null);
export function useSession() {
  return useContext(SessionContext);
}

/* =========================================================================
   ScrollToTop on route change
   ========================================================================= */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

/* =========================================================================
   Branding listener (optional)
   Keeps CSS/UI in sync when school branding changes
   ========================================================================= */
function useBrandingSync() {
  const [brand, setBrand] = useState(getCachedBrandingSummary());
  useEffect(() => {
    const unsub = subscribeBrandingUpdated((detail) => {
      // set CSS variable if present
      if (detail?.primaryColor) {
        document.documentElement.style.setProperty("--brand-primary", detail.primaryColor);
      }
      setBrand({
        logoUrl: detail?.logoUrl || "",
        schoolName: detail?.schoolName || "",
        primaryColor: detail?.primaryColor || "",
      });
    });
    return unsub;
  }, []);
  return brand; // not used here, but you can pass to NavBar if you want
}

/* =========================================================================
   NavBar visibility
   ========================================================================= */
const NAVBAR_HIDDEN_PATHS = [/^\/$/, /^\/login$/, /^\/signup$/, /^\/reset-password/];
function useHideNavBar() {
  const { pathname } = useLocation();
  return NAVBAR_HIDDEN_PATHS.some((pat) => (pat instanceof RegExp ? pat.test(pathname) : pathname === pat));
}
function ConditionalNavBar() {
  const hide = useHideNavBar();
  return hide ? null : <NavBar />;
}

/* =========================================================================
   RequireAuth wrapper: waits for Firebase to resolve; preserves "from"
   ========================================================================= */
function RequireAuth({ children }) {
  const { loading, isLoggedIn } = useAuthStatus();
  const location = useLocation();

  if (loading) return <SplashScreen />;
  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

/* =========================================================================
   NotLoggedInOnly: if already logged in, bounce to proper dashboard
   ========================================================================= */
function RequireNotLoggedIn({ children }) {
  const { loading, isLoggedIn, role } = useAuthStatus();
  if (loading) return <SplashScreen />;
  if (!isLoggedIn) return children;
  return <Navigate to={getDashboardRoute(role || getUserRole())} replace />;
}

/* =========================================================================
   RootRedirect: send user to dashboard or login once auth is known
   ========================================================================= */
function RootRedirect() {
  const { loading, isLoggedIn, role } = useAuthStatus();
  if (loading) return <SplashScreen />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardRoute(role || getUserRole())} replace />;
}

/* =========================================================================
   Error Boundary (global)
   ========================================================================= */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Uncaught app error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-overlay" style={{ textAlign: "center", padding: "6em 1em" }}>
          <h2>Something went wrong.</h2>
          <p style={{ color: "#b22" }}>{this.state.error?.toString() || "Unknown error"}</p>
          <button className="btn" onClick={() => window.location.reload()} style={{ marginTop: 20 }}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* =========================================================================
   App
   ========================================================================= */
export default function App() {
  const authState = useAuthStatus(); // { loading, isLoggedIn, role, user }
  useBrandingSync(); // subscribe to branding changes (CSS var + localStorage)

  // memoize session value so consumers don't rerender unnecessarily
  const sessionValue = useMemo(() => authState, [authState.loading, authState.isLoggedIn, authState.role, authState.user]);

  return (
    <SessionContext.Provider value={sessionValue}>
      <ErrorBoundary>
        <Router>
          <ScrollToTop />
          <ConditionalNavBar />
          <Suspense
            fallback={
              <div style={{ textAlign: "center", marginTop: "4em" }}>
                <div className="spinner" />
                <p>Loading…</p>
              </div>
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

              {/* Unknown → 404 (or you could use a role-aware redirect) */}
              <Route path="*" element={<NotFound />} />
              {/* Or: <Route path="*" element={<RootRedirect />} /> */}
            </Routes>
          </Suspense>
        </Router>
      </ErrorBoundary>
    </SessionContext.Provider>
  );
}