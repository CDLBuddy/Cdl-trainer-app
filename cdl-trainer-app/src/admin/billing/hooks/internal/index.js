// Path: src/admin/billing/hooks/internal/index.js
// ============================================================================
// Admin • Billing • Hooks Barrel (INTERNAL ONLY)
// - Re-exports low-level hooks used within src/admin/billing/*
// - Outside consumers (Dashboard, Companies) should NOT import from here.
//   Use the public surface: `@admin/billing` (which exposes hooks/public/*).
// - Tree-shakable: importing files pull only what they use.
// ----------------------------------------------------------------------------
// @internal
// ============================================================================

export { default as useEmployerBilling } from './useEmployerBilling.js'
export { default as useIndividualBilling } from './useIndividualBilling.js'
