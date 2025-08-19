// Path: src/admin/billing/hooks/index.js
// ============================================================================
// Admin • Billing • Hooks barrel
// - Central export hub for billing-related React hooks
// - Keeps import paths clean (e.g. `import { useEmployerBilling } from '@admin/billing/hooks'`)
// - Tree-shakable: only pulls in what’s used
// ============================================================================

export { useEmployerBilling } from './useEmployerBilling.js'
export { useIndividualBilling } from './useIndividualBilling.js'