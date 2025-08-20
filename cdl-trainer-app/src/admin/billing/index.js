// Path: src/admin/billing/index.js
// ======================================================================
// Admin • Billing (public barrel)
// - Intentional PUBLIC surface for other admin areas (Dashboard, Companies)
// - Pure re-exports; no runtime side effects (keeps Fast Refresh snappy)
// - Tree-shakable: consumers import only what they need
// - IMPORTANT: Internal hooks/services are NOT exported here
//   (do not leak low-level APIs outside billing/)
// ======================================================================

// Screen (full Billing page)
export { default as Billing } from './Billing.jsx'

// Shared, reusable UI (safe for embedding in other admin pages)
export * from './components/shared/index.js'

// Public hooks (small, stable shapes for outside consumers)
export * from './hooks/public/index.js'

// Public utilities (formatters, CSV helpers, etc.)
export * from './utils/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// ❌ NOT EXPORTED (internal only):
//   - ./hooks/internal/*
//   - ./services/*  (billingApi + Firestore adapters)
// These remain private so you can refactor Billing without breaking Dashboard/
// Companies. If you need new data/actions, add a PUBLIC hook under hooks/public.
// ─────────────────────────────────────────────────────────────────────────────

// ----------------------------------------------------------------------
// Usage examples:
//
//   // Full screen
//   import { Billing } from '@admin/billing'
//
//   // Embed a compact snapshot in a Company panel
//   import { BillingSummaryCard } from '@admin/billing'
//
//   // Read-only KPIs for the Dashboard
//   import { useBillingSummary } from '@admin/billing'
//
//   // Utilities (if needed in other pages/components)
//   import { formatCurrency, fmtDate, downloadCsv } from '@admin/billing'
// ----------------------------------------------------------------------