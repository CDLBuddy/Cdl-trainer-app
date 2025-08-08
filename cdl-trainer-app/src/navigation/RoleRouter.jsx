// src/navigation/RoleRouter.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { RequireRole } from "../utils/RequireRole"; // your polished guard
import { useAuthStatus } from "../utils/auth";      // see note below
import { getDashboardRoute } from "../utils/navigation";

// --- Lazy role routers for better code-splitting ---
const StudentRouter    = lazy(() => import("../student/StudentRouter"));
const InstructorRouter = lazy(() => import("../instructor/InstructorRouter"));
const AdminRouter      = lazy(() => import("../admin/AdminRouter"));
const SuperadminRouter = lazy(() => import("../superadmin/SuperadminRouter"));

// --- Shared/public pages (lazy too if you like) ---
const Login    = lazy(() => import("../pages/Login"));
const Signup   = lazy(() => import("../pages/Signup"));
const Welcome  = lazy(() => import("../pages/Welcome"));
const NotFound = lazy(() => import("../pages/NotFound"));

// ---- Small wrapper that waits for auth to resolve ----
function RequireAuth({ children }) {
  const { loading, isLoggedIn } = useAuthStatus(); // { loading, isLoggedIn, role }
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "4em" }}>
        <div className="spinner" />
        <p>Checking your session…</p>
      </div>
    );
  }
  if (!isLoggedIn) {
    // Preserve where the user was heading
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

// ---- Redirect unknown routes to the current role’s dashboard ----
function NotFoundRedirect() {
  const { role } = useAuthStatus();
  if (!role) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardRoute(role)} replace />;
}

export default function RoleRouter() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", marginTop: "4em" }}>
          <div className="spinner" />
          <p>Loading…</p>
        </div>
      }
    >
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/welcome" element={<Welcome />} />

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

        {/* Root: send to dashboard if logged-in, else login */}
        <Route
          path="/"
          element={
            <RootRedirect />
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
    </Suspense>
  );
}

// Sends to the right place based on auth state
function RootRedirect() {
  const { loading, isLoggedIn, role } = useAuthStatus();
  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "4em" }}>
        <div className="spinner" />
        <p>Loading…</p>
      </div>
    );
  }
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardRoute(role)} replace />;
}