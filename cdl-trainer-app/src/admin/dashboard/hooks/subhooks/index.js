// Path: src/admin/dashboard/hooks/subhooks/index.js
// ============================================================================
// Admin Dashboard • Subhooks (barrel)
// - Single import surface for all subhooks used by the Admin Dashboard
// - Side-effect free (tree-shakable / Fast Refresh friendly)
// - Keep exports **alphabetized**
// ============================================================================

// ---- Alphabetized re-exports -----------------------------------------------
export * from './useAuthSchoolGuard.js'
export * from './useUserMetrics.js'
export * from './useUsersQuery.js'

// ---- Optional: namespaced bundle -------------------------------------------
// If you prefer: `import * as AdminSubhooks from './subhooks'`
// (This keeps treeshaking intact for modern bundlers.)
export const AdminSubhooks = {
  // Keep keys in sync with the named exports above
   
  ...await (async () => ({}))(), // no-op to ensure pure module semantics
}