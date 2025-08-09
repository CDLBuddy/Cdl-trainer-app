// src/admin/index.js
// ===== ADMIN BARREL (pure) =====

// Pages / Views
export { default as AdminDashboard }  from "./AdminDashboard.jsx";
export { default as AdminProfile }    from "./AdminProfile.jsx";
export { default as AdminUsers }      from "./AdminUsers.jsx";
export { default as AdminCompanies }  from "./AdminCompanies.jsx";
export { default as AdminReports }    from "./AdminReports.jsx";

// UI Controls (components only — safe for Fast Refresh)
export { default as ExportUsersControls }     from "./ExportUsersControls.jsx";
export { default as ExportCompaniesControls } from "./ExportCompaniesControls.jsx";

// Optional barrels (uncomment when ready)
// export * from "../hooks/useAdminData.js";
// export * from "../utils/admin-helpers.js";
// export * from "./components";
