// src/superadmin/SuperadminRouter.jsx
import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { RequireRole } from "../utils/RequireRole";

// Lazy-load pages (match filenames exactly)
const SuperAdminDashboard = lazy(() => import("./SuperAdminDashboard"));
const SchoolManagement    = lazy(() => import("./SchoolManagement"));
const UserManagement      = lazy(() => import("./UserManagement"));
const ComplianceCenter    = lazy(() => import("./ComplianceCenter"));
const Billing             = lazy(() => import("./Billing"));      // fixed
const Settings            = lazy(() => import("./Settings"));
const Logs                = lazy(() => import("./Logs"));
const Permissions         = lazy(() => import("./Permissions"));  // added

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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [pathname]);
  return null;
}

export default function SuperadminRouter() {
  return (
    <RequireRole role="superadmin">
      <ScrollToTop />
      <SuperadminErrorBoundary>
        <Suspense fallback={
          <div style={{ textAlign: "center", marginTop: "4em" }}>
            <div className="spinner" />
            <p>Loading super admin panel…</p>
          </div>
        }>
          <Routes>
            <Route index element={<SuperAdminDashboard />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="schools" element={<SchoolManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="compliance" element={<ComplianceCenter />} />
            <Route path="billing" element={<Billing />} />          {/* fixed */}
            <Route path="settings" element={<Settings />} />
            <Route path="logs" element={<Logs />} />
            <Route path="permissions" element={<Permissions />} />  {/* new */}
            <Route path="*" element={<Navigate to="/superadmin/dashboard" replace />} />
          </Routes>
        </Suspense>
      </SuperadminErrorBoundary>
    </RequireRole>
  );
}