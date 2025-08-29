// src/admin/settings/hooks/index.js
// ======================================================================
// Admin Settings — hooks barrel
// - Exports the main VM hook (useAdminSettings)
// - Re-exports all subhooks from ./subhooks
// ======================================================================

export * from './subhooks/index.js'
export { useAdminSettings } from './useAdminSettings.js'
