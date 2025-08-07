// src/admin/AdminRouter.jsx

import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { RequireRole } from "../utils/RequireRole";

// === Lazy-load all admin page components ===
const AdminDashboard   = lazy(() => import("./AdminDashboard"));
const AdminProfile     = lazy(() => import("./AdminProfile"));
const AdminUsers       = lazy(() => import("./AdminUsers"));
const AdminCompanies   = lazy(() => import("./AdminCompanies"));
const AdminReports     = lazy(() => import("./AdminReports"));
// Add more as needed:
// const AdminBilling  = lazy(() => import("./AdminBilling"));

// --- Optional: Admin-specific error fallback ---
function AdminErrorFallback({ error }) {
  return (
    <div className="dashboard-card" style={{ maxWidth: 520, margin: "2em auto" }}>
      <h2>Something went wrong</h2>
      <p>{error?.message || "An unexpected error occurred."}</p>
      <button className="btn" onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}

// --- Main Admin Router ---
export default function AdminRouter() {
  // All admin pages/routes are role-guarded
  return (
    <RequireRole role="admin">
      <Suspense
        fallback={
          <div style={{ textAlign: "center", marginTop: "4em" }}>
            <div className="spinner" />
            <p>Loading admin dashboard…</p>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="reports" element={<AdminReports />} />
          {/* Add new admin features here */}
          {/* <Route path="billing" element={<AdminBilling />} /> */}
          {/* Fallback: unknown admin routes go to dashboard */}
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </Suspense>
    </RequireRole>
  );
}

/*
================ USAGE NOTES ================
- All routes are lazy-loaded for snappy navigation.
- <RequireRole role="admin"> blocks non-admins (including students/instructors/superadmins).
- Expand as needed for new admin-only features.
- 404s under /admin/* always land on admin dashboard.
- Customize fallback/error UI as you wish.
=============================================
*/