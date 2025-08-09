// src/admin/AdminRouter.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Lazy-load all admin page components
const AdminDashboard = lazy(() => import("./AdminDashboard.jsx"));
const AdminProfile   = lazy(() => import("./AdminProfile.jsx"));
const AdminUsers     = lazy(() => import("./AdminUsers.jsx"));
const AdminCompanies = lazy(() => import("./AdminCompanies.jsx"));
const AdminReports   = lazy(() => import("./AdminReports.jsx"));
// const AdminBilling = lazy(() => import("./AdminBilling.jsx")); // when ready

function Loading() {
  return (
    <div style={{ textAlign: "center", marginTop: "4em" }}>
      <div className="spinner" />
      <p>Loading admin page…</p>
    </div>
  );
}

export default function AdminRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* /admin */}
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="companies" element={<AdminCompanies />} />
        <Route path="reports" element={<AdminReports />} />
        {/* <Route path="billing" element={<AdminBilling />} /> */}

        {/* Fallback inside admin namespace */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}