// src/admin/index.jsx
// ===== ADMIN BARREL INDEX =====
// Central export hub for all admin pages, components, hooks, and utilities
// Ensures filenames & component names match your AdminRouter exactly

import React, { lazy } from "react";

/* =========================
   ROUTE CONSTANTS
   ========================= */
export const ADMIN_BASE          = "/admin";
export const ADMIN_ROUTE_DASH    = `${ADMIN_BASE}/dashboard`;
export const ADMIN_ROUTE_PROFILE = `${ADMIN_BASE}/profile`;
export const ADMIN_ROUTE_USERS   = `${ADMIN_BASE}/users`;
export const ADMIN_ROUTE_COMPANIES = `${ADMIN_BASE}/companies`;
export const ADMIN_ROUTE_REPORTS = `${ADMIN_BASE}/reports`;

/* =========================
   LAZY-LOADED PAGES (for Router)
   ========================= */
export const LazyAdminDashboard  = lazy(() => import("./AdminDashboard"));
export const LazyAdminProfile    = lazy(() => import("./AdminProfile"));
export const LazyAdminUsers      = lazy(() => import("./AdminUsers"));
export const LazyAdminCompanies  = lazy(() => import("./AdminCompanies"));
export const LazyAdminReports    = lazy(() => import("./AdminReports"));

/* =========================
   DIRECT (NON-LAZY) EXPORTS
   ========================= */
export { default as AdminDashboard }  from "./AdminDashboard";
export { default as AdminProfile }    from "./AdminProfile";
export { default as AdminUsers }      from "./AdminUsers";
export { default as AdminCompanies }  from "./AdminCompanies";
export { default as AdminReports }    from "./AdminReports";

/* =========================
   ROUTE REGISTRY (optional)
   ========================= */
export const ADMIN_ROUTES = [
  { key: "dashboard", path: ADMIN_ROUTE_DASH,     element: <LazyAdminDashboard /> },
  { key: "profile",   path: ADMIN_ROUTE_PROFILE,  element: <LazyAdminProfile /> },
  { key: "users",     path: ADMIN_ROUTE_USERS,    element: <LazyAdminUsers /> },
  { key: "companies", path: ADMIN_ROUTE_COMPANIES,element: <LazyAdminCompanies /> },
  { key: "reports",   path: ADMIN_ROUTE_REPORTS,  element: <LazyAdminReports /> },
];

/* =========================
   HOOKS & HELPERS
   ========================= */
// Example: export * from "../hooks/useAdminData";
// Example: export * from "../utils/admin-helpers";

/* =========================
   ROUTER EXPORT
   ========================= */
export { default as AdminRouter } from "./AdminRouter";

/* =========================
   USAGE NOTES
   =========================
- Keep this index in sync with AdminRouter.
- Import Lazy* exports for route definitions to optimize bundle size.
- Use direct exports when you need a component outside of routing.
- ADMIN_ROUTES can be consumed by your router for DRY mapping.
*/