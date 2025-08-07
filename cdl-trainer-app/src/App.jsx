// src/App.jsx

import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import NavBar from "./components/NavBar";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Role-based routers (modular, for clarity/scale)
import { StudentRouter } from "./student";        // Barrel includes all /student-* pages
import { InstructorRouter } from "./instructor";  // (if ready; stub if not)
import { AdminRouter } from "./admin";            // (if ready; stub if not)
import SuperAdminDashboard from "./pages/SuperAdminDashboard";

// --- Roles ---
const ROLES = ["student", "instructor", "admin", "superadmin"];

// --- Role/session helpers ---
function getUserRole() {
  const role =
    localStorage.getItem("userRole") ||
    window.currentUserRole ||
    "student";
  return ROLES.includes(role) ? role : null;
}
function isLoggedIn() {
  return !!(
    window.currentUserEmail ||
    localStorage.getItem("currentUserEmail")
  );
}

// --- Scroll to top on route change ---
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// --- Generic role guard (array or string of roles) ---
function RequireRole({ role, children }) {
  const userRole = getUserRole();
  const roles = Array.isArray(role) ? role : [role];
  if (!userRole || !roles.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// --- Public-only guard (redirects if logged in) ---
function RequireNotLoggedIn({ children }) {
  if (isLoggedIn()) {
    const role = getUserRole();
    return role
      ? <Navigate to={`/${role}-dashboard`} replace />
      : <Navigate to="/login" replace />;
  }
  return children;
}

// --- Main App Component ---
export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <NavBar />

      <Routes>
        {/* === Public Routes === */}
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

        {/* === Student (all /student-* routes, role-guarded inside StudentRouter) === */}
        <Route path="/*" element={<StudentRouter RequireRole={RequireRole} />} />

        {/* === Instructor (all /instructor-* routes) === */}
        <Route path="/instructor/*" element={<InstructorRouter RequireRole={RequireRole} />} />

        {/* === Admin (all /admin-* routes) === */}
        <Route path="/admin/*" element={<AdminRouter RequireRole={RequireRole} />} />

        {/* === Superadmin (single page for now, or add SuperAdminRouter) === */}
        <Route
          path="/superadmin-dashboard"
          element={
            <RequireRole role="superadmin">
              <SuperAdminDashboard />
            </RequireRole>
          }
        />

        {/* === 404 fallback === */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
