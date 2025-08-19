// Path: src/admin/billing/index.js
// ======================================================================
// Admin • Billing (barrel)
// - Pure re-exports (no JSX executed here) so Fast Refresh stays quick
// - Tree-shakable: consumers can cherry-pick from submodules
// - Intentional surface: default screen + tab components + hooks + utils
// ======================================================================

// Screen
export { default as Billing } from './Billing.jsx'

// Components (tables, filters, shared UI like StatusPill)
export * from './components'

// Hooks (data + state for tabs)
export * from './hooks'

// Services (mock data or Firestore adapters; safe to tree-shake)
export * from './services'

// Utils (formatters, csv helpers, etc.)
export * from './utils'

// ----------------------------------------------------------------------
// Usage examples:
//
//   import { Billing } from '@admin/billing'
//
//   // Cherry-pick tab UIs if you need to embed only one:
//   import { EmployerTab, IndividualTab } from '@admin/billing'
//
//   // Hooks for custom shells:
//   import { useEmployerBilling, useIndividualBilling } from '@admin/billing'
//
//   // UI primitives:
//   import { StatusPill } from '@admin/billing'
//
//   // Utils:
//   import { formatCurrency, fmtDate, downloadCsv } from '@admin/billing'
// ----------------------------------------------------------------------