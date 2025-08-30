// src/student/walkthrough/services/walkthroughApi.js
// ======================================================================
// Walkthrough • Service Facade (thin, treeshake-friendly)
// - Keeps page/hooks imports clean and centralized
// - Backward-compatible re-exports from @utils/ui-helpers
// - Also re-exports resolver & label helper from walkthrough-data
// - No side effects; safe for SSR
// ======================================================================

// ---- Progress (existing callers depend on these) ---------------------
export {
  getUserProgress,
  markStudentWalkthroughComplete,
  updateELDTProgress,
} from '@utils/ui-helpers.js'

// ---- Walkthrough data utilities -------------------------------------
// Keep consumers from importing multiple packages directly.
export {
  resolveWalkthrough,   // async resolver (custom per-school + overlays)
  getWalkthroughLabel,  // UI-friendly label for a class token/code
} from '@walkthrough-data'

// ---- Session helpers -------------------------------------------------
export { getCurrentUserEmail } from '../utils/session.js'

// NOTE: If you later add server-bound calls (e.g., to fetch enriched
// script metadata or to log drill analytics), prefer adding them here
// so consumers keep a single import path:
//
//   import { resolveWalkthrough, getUserProgress, ... } from
//   '@/student/walkthrough/services/walkthroughApi.js'
//
// This file intentionally avoids importing firebase directly to prevent
// tight coupling; Firestore reads/writes live in hooks that need them.