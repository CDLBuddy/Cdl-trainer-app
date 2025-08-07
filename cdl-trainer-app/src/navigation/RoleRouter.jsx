// src/navigation/RoleRouter.jsx

import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import StudentRouter from "../student/StudentRouter";
import InstructorRouter from "../instructor/InstructorRouter";
import AdminRouter from "../admin/AdminRouter";
import SuperadminRouter from "../superadmin/SuperadminRouter";

// Shared/public pages (add if needed)
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Welcome from "../pages/Welcome";
import NotFound from "../pages/NotFound";

// Auth helpers (replace with your actual logic)
import { getUserRole, isLoggedIn } from "../utils/auth";

// --- RequireAuth: Only renders children if user is logged in ---
function RequireAuth({ children }) {
  if (!isLoggedIn()) {
    // Not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }
  return children;
}

// --- RoleGuard: Only renders children if user has required role(s) ---
function RequireRole({ role, children }) {
  const userRole = getUserRole();
  const allowed = Array.isArray(role) ? role : [role];
  if (!userRole || !allowed.includes(userRole)) {
    // Not authorized for this role, send to login or their dashboard
    return <Navigate to="/login" replace />;
  }
  return children;
}

// --- NotFoundRedirect: Sends user to their home dashboard if unknown route ---
function NotFoundRedirect() {
  const role = getUserRole();
  switch (role) {
    case "superadmin":
      return <Navigate to="/superadmin/dashboard" replace />;
    case "admin":
      return <Navigate to="/admin/dashboard" replace />;
    case "instructor":
      return <Navigate to="/instructor/dashboard" replace />;
    case "student":
      return <Navigate to="/student/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default function RoleRouter() {
  // If you use context/provider for auth, you can get role that way too
  // This version uses helper functions (update as needed)

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/welcome" element={<Welcome />} />

      {/* --- STUDENT ROUTES --- */}
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

      {/* --- INSTRUCTOR ROUTES --- */}
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

      {/* --- ADMIN ROUTES --- */}
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

      {/* --- SUPERADMIN ROUTES --- */}
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

      {/* --- Root redirect based on login status/role --- */}
      <Route
        path="/"
        element={
          isLoggedIn() ? (
            // Send to appropriate dashboard
            <NotFoundRedirect />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* --- Catch-all: unknown routes --- */}
      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
  );
}