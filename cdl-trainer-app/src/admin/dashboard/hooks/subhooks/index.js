// Path: src/admin/dashboard/hooks/subhooks/index.js
// ============================================================================
// Admin Dashboard • Subhooks (barrel)
// - Single import surface for all subhooks used by the Admin Dashboard
// - Side-effect free (tree-shakable / Fast Refresh friendly)
// - Keep exports **alphabetized**
// ============================================================================

// ---- Alphabetized re-exports -----------------------------------------------
export { default as useAuthSchoolGuard } from './useAuthSchoolGuard.js'
export { default as useUserMetrics } from './useUserMetrics.js'
export { default as useUsersQuery } from './useUsersQuery.jsx'

// Note:
// You can `import * as AdminSubhooks from './subhooks'` directly — no need to
// build a manual namespace object. ES modules already provide that shape from
// the named exports above.
