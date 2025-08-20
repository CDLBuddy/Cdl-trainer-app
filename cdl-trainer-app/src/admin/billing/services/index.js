// Path: src/admin/billing/services/index.js
// ============================================================================
// Admin • Billing • Services Barrel
// - Internal-only re-exports of low-level Firestore/mocked service functions
// - Exposes billingApi (default + named fns) for use inside billing hooks
// - DO NOT import directly from outside billing/ — use @admin/billing public surface
// ============================================================================

export * from './billingApi.js'
export { default as billingApi } from './billingApi.js'