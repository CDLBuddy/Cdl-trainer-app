// src/superadmin/SuperadminRouter.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Lazy-load pages (match filenames exactly)
const SuperAdminDashboard = lazy(() => import("./SuperAdminDashboard.jsx"));
const SchoolManagement    = lazy(() => import("./SchoolManagement.jsx"));
const UserManagement      = lazy(() => import("./UserManagement.jsx"));
const ComplianceCenter    = lazy(() => import("./ComplianceCenter.jsx"));
const Billings            = lazy(() => import("./Billings.jsx")); // <-- fixed name
const Settings            = lazy(() => import("./Settings.jsx"));
const Logs                = lazy(() => import("./Logs.jsx"));
const Permissions         = lazy(() => import("./Permissions.jsx"));

class SuperadminErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error){ return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="dashboard-card" style={{ maxWidth: 560, margin: "2em auto" }}>
          <h2>Something went wrong</h2>
          <p style={{ opacity: 0.9 }}>{this.state.error?.message || "An unexpected error occurred."}</p>
          <button className="btn" onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Loading() {
  return (
    <div style={{ textAlign: "center", marginTop: "4em" }}>
      <div className="spinner" />
      <p>Loading super admin panel…</p>
    </div>
  );
}

export default function SuperadminRouter() {
  return (
    <SuperadminErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="schools" element={<SchoolManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="compliance" element={<ComplianceCenter />} />
          <Route path="billing" element={<Billings />} /> {/* <-- fixed usage */}
          <Route path="settings" element={<Settings />} />
          <Route path="logs" element={<Logs />} />
          <Route path="permissions" element={<Permissions />} />
          <Route path="*" element={<Navigate to="/superadmin/dashboard" replace />} />
        </Routes>
      </Suspense>
    </SuperadminErrorBoundary>
  );
}