// src/admin/index.jsx

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// === Barrel Imports: React admin page components ===
import AdminDashboard from "./AdminDashboard";
import AdminProfile from "./AdminProfile";
import AdminUsers from "./AdminUsers";
import AdminCompanies from "./AdminCompanies";
import AdminReports from "./AdminReports";

// === Barrel Exports ===
export {
  AdminDashboard,
  AdminProfile,
  AdminUsers,
  AdminCompanies,
  AdminReports,
};

/**
 * Utility: Programmatic admin navigation handler (optional).
 * Returns { title, component } based on route and role.
 */
export function handleAdminNav(page, currentUserRole, navigate) {
  if (currentUserRole !== "admin") {
    if (navigate) navigate("/access-denied");
    return {
      title: "Admin | Access Denied - CDL Trainer",
      component: () => (
        <div className="dashboard-card" style={{ margin: "2em auto", maxWidth: 460 }}>
          <h2>🔒 Access Denied</h2>
          <p>This page is for admin users only. Please log in with an admin account.</p>
        </div>
      ),
    };
  }

  switch ((page || "").toLowerCase()) {
    case "admin-dashboard":
      return { title: "Admin Dashboard - CDL Trainer", component: AdminDashboard };
    case "admin-profile":
      return { title: "Admin Profile - CDL Trainer", component: AdminProfile };
    case "admin-users":
      return { title: "Manage Users - CDL Trainer", component: AdminUsers };
    case "admin-companies":
      return { title: "Manage Companies - CDL Trainer", component: AdminCompanies };
    case "admin-reports":
      return { title: "Reports & Export - CDL Trainer", component: AdminReports };
    default:
      return { title: "Admin Dashboard - CDL Trainer", component: AdminDashboard };
  }
}

/**
 * <AdminRouter />
 * Use for all admin routes with React Router.
 * All admin routes are role-guarded. Pass props as needed (context, schoolId).
 */
export function AdminRouter({ currentUserRole, adminSchoolId }) {
  // Defensive role guard: block all non-admins (even if route is guessed)
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
      <Route path="/" element={<AdminDashboard adminSchoolId={adminSchoolId} />} />
      <Route path="admin-dashboard" element={<AdminDashboard adminSchoolId={adminSchoolId} />} />
      <Route path="admin-profile" element={<AdminProfile adminSchoolId={adminSchoolId} />} />
      <Route path="admin-users" element={<AdminUsers adminSchoolId={adminSchoolId} />} />
      <Route path="admin-companies" element={<AdminCompanies adminSchoolId={adminSchoolId} />} />
      <Route path="admin-reports" element={<AdminReports adminSchoolId={adminSchoolId} />} />
      {/* 404 fallback for admin routes */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
