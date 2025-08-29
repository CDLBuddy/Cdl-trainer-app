// src/admin/settings/index.js
// ======================================================================
// Admin Settings — Barrel
// - Centralizes exports under "@/admin/settings"
// - Re-exports lazy & sync section entries from sections/index.js
// - Side-effect free for optimal tree-shaking & Fast Refresh
// ======================================================================

// Main screen (shell)
export { default as AdminSettings } from './AdminSettings.jsx'

// Hooks (VM + subhooks)
export * from './hooks/index.js'

// Services (CRUD for settings)
export * from './services/index.js'

// Utilities (validators, branding helpers, etc.)
export * from './utils/index.js'

// Sections
// - Sync components (Branding, Billing, …)
// - Lazy components (BrandingLazy, BillingLazy, …)
// - Registry helpers (SECTIONS, SECTION_ORDER, getSections)
export * from './sections/index.js'

// ----------------------------------------------------------------------
// Usage:
//   import { AdminSettings, BrandingLazy, getSections } from '@/admin/settings'
//   import { useAdminSettings, useBillingSettings } from '@/admin/settings'
// ----------------------------------------------------------------------
