// ============================================================
// Session Module Barrel
// Centralizes exports for context, provider, and hooks/utilities.
// Usage example:
//   import { SessionProvider, useSession, useRole } from '@session'
// ============================================================

// --- Context + defaults ---
export { default as SessionContext, DEFAULT_SESSION } from './SessionContext.js'

// --- Provider ---
export { default as SessionProvider } from './SessionProvider.jsx'

// --- Hooks + utilities ---
export {
  default as useSession,
  useSessionSelector,
  useUser,
  useRole,
  useIsLoggedIn,
  useIsLoading,
  useHasRole,
  useHasAnyRole,
  getCurrentUserEmailFallback,
  getCurrentRoleFallback,
  syncSessionDebug,
} from './useSession.js'