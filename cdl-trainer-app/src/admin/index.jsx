// src/admin/index.jsx

import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

// === Barrel Imports: Admin page components ===
import AdminDashboard from "./AdminDashboard";
import AdminProfile from "./AdminProfile";
import AdminUsers from "./AdminUsers";
import AdminCompanies from "./AdminCompanies";
import AdminReports from "./AdminReports";

// === Barrel Exports for direct imports elsewhere ===
export {
  AdminDashboard,
  AdminProfile,
  AdminUsers,
  AdminCompanies,
  AdminReports,
};

// --- (Optional) Admin layout: for sidebar/topbar, branding, etc. ---
function AdminLayout() {
  // Add admin sidebar, header, etc. here if needed
  return (
    <div className="admin-layout">
      {/* <AdminSidebar /> */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

/**
 * <AdminRouter />
 * Handles all admin routes. Pass currentUserRole and adminSchoolId as props.
 * Protects routes for admin role only.
 */
export function AdminRouter({ currentUserRole, adminSchoolId }) {
  if (currentUserRole !== "admin") {
    return (
      <div className="dashboard-card" style={{ margin: "2em auto", maxWidth: 460 }}>
        <h2>🔒 Access Denied</h2>
        <p>This page is for admin users only. Please log in with an admin account.</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard adminSchoolId={adminSchoolId} />} />
        <Route path="dashboard" element={<AdminDashboard adminSchoolId={adminSchoolId} />} />
        <Route path="profile" element={<AdminProfile adminSchoolId={adminSchoolId} />} />
        <Route path="users" element={<AdminUsers adminSchoolId={adminSchoolId} />} />
        <Route path="companies" element={<AdminCompanies adminSchoolId={adminSchoolId} />} />
        <Route path="reports" element={<AdminReports adminSchoolId={adminSchoolId} />} />
        {/* 404 fallback for unknown admin routes */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>
    </Routes>
  );
}