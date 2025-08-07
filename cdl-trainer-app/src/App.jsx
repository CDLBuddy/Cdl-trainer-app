// src/App.jsx

import React, { useEffect, useMemo, useState, createContext, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

// Components
import NavBar from "./components/NavBar";
import SplashScreen from "./components/SplashScreen"; // Simple centered spinner/brand
import NotFound from "./pages/NotFound";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Role Routers
import StudentRouter from "./student/StudentRouter";
import InstructorRouter from "./instructor/InstructorRouter";
import AdminRouter from "./admin/AdminRouter";
import SuperadminRouter from "./superadmin/SuperadminRouter";

// === Session Context: Holds auth/role and exposes login/logout ===
const SessionContext = createContext();
export function useSession() {
  return useContext(SessionContext);
}

// --- Auth/role loader (simulate async check) ---
function getRoleFromStorage() {
  return (
    localStorage.getItem("userRole") ||
    window.currentUserRole ||
    null
  );
}
function getEmailFromStorage() {
  return (
    localStorage.getItem("currentUserEmail") ||
    window.currentUserEmail ||
    null
  );
}
function useSessionProvider() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState(null);

  useEffect(() => {
    // Simulate async auth (e.g., Firebase onAuthStateChanged)
    setLoading(true);
    setTimeout(() => {
      setRole(getRoleFromStorage());
      setEmail(getEmailFromStorage());
      setLoading(false);
    }, 100); // Replace with real auth listener
  }, []);

  // Allow live updates if needed
  const login = (newRole, newEmail) => {
    setRole(newRole);
    setEmail(newEmail);
    localStorage.setItem("userRole", newRole);
    localStorage.setItem("currentUserEmail", newEmail);
  };
  const logout = () => {
    setRole(null);
    setEmail(null);
    localStorage.removeItem("userRole");
    localStorage.removeItem("currentUserEmail");
  };

  return useMemo(
    () => ({ loading, role, email, login, logout }),
    [loading, role, email]
  );
}

// --- Scroll to top on navigation ---
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// --- Route guards ---
function RequireRole({ role, children }) {
  const { loading, role: userRole } = useSession();
  if (loading) return <SplashScreen />;
  const allowed = Array.isArray(role) ? role : [role];
  if (!userRole || !allowed.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
function RequireNotLoggedIn({ children }) {
  const { loading, email, role } = useSession();
  if (loading) return <SplashScreen />;
  if (email && role) {
    switch (role) {
      case "student": return <Navigate to="/student/dashboard" replace />;
      case "instructor": return <Navigate to="/instructor/dashboard" replace />;
      case "admin": return <Navigate to="/admin/dashboard" replace />;
      case "superadmin": return <Navigate to="/superadmin/dashboard" replace />;
      default: return <Navigate to="/login" replace />;
    }
  }
  return children;
}

// --- Pattern-matching NavBar hiding (add as needed) ---
const NAVBAR_HIDDEN_PATHS = [
  /^\/$/, /^\/login$/, /^\/signup$/, /^\/reset-password/,
];
function useHideNavBar() {
  const { pathname } = useLocation();
  return NAVBAR_HIDDEN_PATHS.some((pat) =>
    typeof pat === "string"
      ? pathname === pat
      : pat instanceof RegExp
        ? pat.test(pathname)
        : false
  );
}
function ConditionalNavBar() {
  const hide = useHideNavBar();
  return hide ? null : <NavBar />;
}

// --- Error boundary (catches all render errors) ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Log error if needed
    // eslint-disable-next-line
    console.error("Uncaught app error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-overlay" style={{ textAlign: "center", padding: "6em 1em" }}>
          <h2>Something went wrong.</h2>
          <p style={{ color: "#b22" }}>{this.state.error?.toString() || "Unknown error"}</p>
          <button
            className="btn"
            onClick={() => window.location.reload()}
            style={{ marginTop: 20 }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App ---
export default function App() {
  const session = useSessionProvider();

  // You can add a maintenance mode here
  // if (maintenance) return <MaintenanceScreen />;

  return (
    <SessionContext.Provider value={session}>
      <ErrorBoundary>
        <Router>
          <ScrollToTop />
          <ConditionalNavBar />
          {session.loading ? (
            <SplashScreen />
          ) : (
            <Routes>
              {/* --- Public routes --- */}
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

              {/* --- Student --- */}
              <Route
                path="/student/*"
                element={
                  <RequireRole role="student">
                    <StudentRouter />
                  </RequireRole>
                }
              />
              {/* --- Instructor --- */}
              <Route
                path="/instructor/*"
                element={
                  <RequireRole role="instructor">
                    <InstructorRouter />
                  </RequireRole>
                }
              />
              {/* --- Admin --- */}
              <Route
                path="/admin/*"
                element={
                  <RequireRole role="admin">
                    <AdminRouter />
                  </RequireRole>
                }
              />
              {/* --- Superadmin --- */}
              <Route
                path="/superadmin/*"
                element={
                  <RequireRole role="superadmin">
                    <SuperadminRouter />
                  </RequireRole>
                }
              />

              {/* --- 404 fallback --- */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}
        </Router>
      </ErrorBoundary>
    </SessionContext.Provider>
  );
}