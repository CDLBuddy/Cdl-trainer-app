// src/session/index.js
// ============================================================
// Session Module Barrel (pure)
// Centralizes exports for context, provider, and hooks/utilities.
//
// Usage:
//   import { SessionProvider } from '@session'
//   import { useSession, useRole, syncSessionDebug } from '@session'
//
// NOTE: This file must stay side-effect free to play nicely with
// react-refresh and tree-shaking.
// ============================================================

// --- Context + defaults ---
export { default as SessionContext, DEFAULT_SESSION } from './SessionContext.js'

// --- Provider (component-only module) ---
export { default as SessionProvider } from './SessionProvider.jsx'

// --- Hooks + utilities ---
// Ensure ./useSession.js exports:
//   export default function useSession() { ... }
//   export function useSessionSelector(sel) { ... }
//   export function useUser() { ... }
//   export function useRole() { ... }
//   export function useIsLoggedIn() { ... }
//   export function useIsLoading() { ... }
//   export function useHasRole(role) { ... }
//   export function useHasAnyRole(roles) { ... }
//   export function getCurrentUserEmailFallback() { ... }
//   export function getCurrentRoleFallback() { ... }
//   export function syncSessionDebug(value) { ... }
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