// src/superadmin/index.jsx
// ===== SUPERADMIN BARREL INDEX =====
// Central export hub for all superadmin pages, components, hooks, and utilities
// Ensures filenames & component names match your SuperadminRouter exactly

import React, { lazy } from "react";

/* =========================
   ROUTE CONSTANTS
   ========================= */
export const SA_BASE            = "/superadmin";
export const SA_ROUTE_DASH      = `${SA_BASE}/dashboard`;
export const SA_ROUTE_SCHOOLS   = `${SA_BASE}/schools`;
export const SA_ROUTE_USERS     = `${SA_BASE}/users`;
export const SA_ROUTE_COMPLIANCE= `${SA_BASE}/compliance`;
export const SA_ROUTE_BILLING   = `${SA_BASE}/billing`;
export const SA_ROUTE_SETTINGS  = `${SA_BASE}/settings`;
export const SA_ROUTE_LOGS      = `${SA_BASE}/logs`;

/* =========================
   LAZY-LOADED PAGES (for Router)
   ========================= */
export const LazySuperAdminDashboard  = lazy(() => import("./SuperAdminDashboard"));
export const LazySuperAdminSchools    = lazy(() => import("./SuperAdminSchools"));
export const LazySuperAdminUsers      = lazy(() => import("./SuperAdminUsers"));
export const LazySuperAdminCompliance = lazy(() => import("./SuperAdminCompliance"));
export const LazySuperAdminBilling    = lazy(() => import("./SuperAdminBilling"));
export const LazySuperAdminSettings   = lazy(() => import("./SuperAdminSettings"));
export const LazySuperAdminLogs       = lazy(() => import("./SuperAdminLogs"));

/* =========================
   DIRECT (NON-LAZY) EXPORTS
   ========================= */
export { default as SuperAdminDashboard }  from "./SuperAdminDashboard";
export { default as SuperAdminSchools }    from "./SuperAdminSchools";
export { default as SuperAdminUsers }      from "./SuperAdminUsers";
export { default as SuperAdminCompliance } from "./SuperAdminCompliance";
export { default as SuperAdminBilling }    from "./SuperAdminBilling";
export { default as SuperAdminSettings }   from "./SuperAdminSettings";
export { default as SuperAdminLogs }       from "./SuperAdminLogs";

/* =========================
   ROUTE REGISTRY (optional)
   ========================= */
export const SUPERADMIN_ROUTES = [
  { key: "dashboard",  path: SA_ROUTE_DASH,       element: <LazySuperAdminDashboard /> },
  { key: "schools",    path: SA_ROUTE_SCHOOLS,    element: <LazySuperAdminSchools /> },
  { key: "users",      path: SA_ROUTE_USERS,      element: <LazySuperAdminUsers /> },
  { key: "compliance", path: SA_ROUTE_COMPLIANCE, element: <LazySuperAdminCompliance /> },
  { key: "billing",    path: SA_ROUTE_BILLING,    element: <LazySuperAdminBilling /> },
  { key: "settings",   path: SA_ROUTE_SETTINGS,   element: <LazySuperAdminSettings /> },
  { key: "logs",       path: SA_ROUTE_LOGS,       element: <LazySuperAdminLogs /> },
];

/* =========================
   HOOKS & HELPERS
   ========================= */
export * from "../hooks/useSuperadminData";     // Data-fetching & management hooks
export * from "../utils/superadmin-helpers";    // Utility functions for superadmin tasks

/* =========================
   CONTEXT PROVIDERS (optional)
   ========================= */
// export { SuperadminProvider } from "../context/SuperadminContext";

/* =========================
   USAGE NOTES
   =========================
- Keep this index in sync with your SuperadminRouter.
- Import Lazy* exports for route definitions to optimize bundle size.
- Use direct exports when you need a component outside of routing.
- SUPERADMIN_ROUTES can be consumed by your router for DRY mapping.
*/