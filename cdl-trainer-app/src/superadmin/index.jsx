// src/superadmin/index.jsx
// ===== SUPERADMIN BARREL INDEX =====

import React, { lazy } from "react";

/* ROUTE CONSTANTS */
export const SA_BASE               = "/superadmin";
export const SA_ROUTE_DASH         = `${SA_BASE}/dashboard`;
export const SA_ROUTE_SCHOOLS      = `${SA_BASE}/schools`;
export const SA_ROUTE_USERS        = `${SA_BASE}/users`;
export const SA_ROUTE_COMPLIANCE   = `${SA_BASE}/compliance`;
export const SA_ROUTE_BILLING      = `${SA_BASE}/billing`;
export const SA_ROUTE_SETTINGS     = `${SA_BASE}/settings`;
export const SA_ROUTE_LOGS         = `${SA_BASE}/logs`;
export const SA_ROUTE_PERMISSIONS  = `${SA_BASE}/permissions`; // you have this page too

/* LAZY PAGES (for router) -- match filenames exactly */
export const LazySuperAdminDashboard = lazy(() => import("./SuperAdminDashboard"));
export const LazySchoolManagement    = lazy(() => import("./SchoolManagement"));
export const LazyUserManagement      = lazy(() => import("./UserManagement"));
export const LazyComplianceCenter    = lazy(() => import("./ComplianceCenter"));
export const LazyBilling             = lazy(() => import("./Billing"));
export const LazySettings            = lazy(() => import("./Settings"));
export const LazyLogs                = lazy(() => import("./Logs"));
export const LazyPermissions         = lazy(() => import("./Permissions"));

/* DIRECT EXPORTS (non-lazy) */
export { default as SuperAdminDashboard } from "./SuperAdminDashboard";
export { default as SchoolManagement }    from "./SchoolManagement";
export { default as UserManagement }      from "./UserManagement";
export { default as ComplianceCenter }    from "./ComplianceCenter";
export { default as Billing }             from "./Billing";
export { default as Settings }            from "./Settings";
export { default as Logs }                from "./Logs";
export { default as Permissions }         from "./Permissions";

/* ROUTER EXPORT */
export { default as SuperadminRouter } from "./SuperadminRouter";

/* ROUTE REGISTRY (optional DRY map) */
export const SUPERADMIN_ROUTES = [
  { key: "dashboard",   path: SA_ROUTE_DASH,        element: <LazySuperAdminDashboard /> },
  { key: "schools",     path: SA_ROUTE_SCHOOLS,     element: <LazySchoolManagement /> },
  { key: "users",       path: SA_ROUTE_USERS,       element: <LazyUserManagement /> },
  { key: "compliance",  path: SA_ROUTE_COMPLIANCE,  element: <LazyComplianceCenter /> },
  { key: "billing",     path: SA_ROUTE_BILLING,     element: <LazyBilling /> },
  { key: "settings",    path: SA_ROUTE_SETTINGS,    element: <LazySettings /> },
  { key: "logs",        path: SA_ROUTE_LOGS,        element: <LazyLogs /> },
  { key: "permissions", path: SA_ROUTE_PERMISSIONS, element: <LazyPermissions /> },
];

/* (optional) hooks/helpers/context */
// export * from "../hooks/useSuperadminData";
// export * from "../utils/superadmin-helpers";
// export { SuperadminProvider } from "../context/SuperadminContext";