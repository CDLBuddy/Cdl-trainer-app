// src/session/index.js
// ============================================================
// Session Module Barrel (pure, side-effect free)
//
// Usage:
//   import { SessionProvider } from '@session'
//   import { useSession, useRole, syncSessionDebug } from '@session'
// ============================================================

// --- Context + defaults (+ helpers) ---
export {
  DEFAULT_SESSION,
  SESSION_KEYS,
  isSessionLike,
  default as SessionContext,
} from './SessionContext.js'

// --- Provider (component-only module) ---
export { default as SessionProvider } from './SessionProvider.jsx'

// --- Hooks + utilities ---
export {
  // hooks
  default as useSession,
  useSessionSelector,
  useUser,
  useRole,
  useIsLoggedIn,
  useIsLoading,
  useHasRole,
  useHasAnyRole,
  // fallbacks + debug
  getCurrentUserEmailFallback,
  getCurrentRoleFallback,
  syncSessionDebug,
} from './useSession.js'