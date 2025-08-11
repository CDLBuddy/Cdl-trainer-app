// src/session/useSession.js
// Hooks + helpers (no components). Import these where needed.

import { useContext } from "react";

import SessionContext, { DEFAULT_SESSION } from "./SessionContext.js";

const __DEV__ = (import.meta?.env?.MODE !== "production");

/**
 * Use the full session object.
 * Warns (in dev) if used outside a provider.
 */
export function useSession() {
  const ctx = useContext(SessionContext);
  if (__DEV__ && (ctx === DEFAULT_SESSION || ctx == null)) {
    console.warn(
      "[useSession] Used outside <SessionProvider>. Returning default (logged out)."
    );
  }
  return ctx || DEFAULT_SESSION;
}

/**
 * Select a slice of session state without re-creating selector logic everywhere.
 * Example: const email = useSessionSelector(s => s.user?.email)
 */
export function useSessionSelector(selector) {
  const session = useSession();
  try {
    return selector ? selector(session) : session;
  } catch (e) {
    if (__DEV__) {
      console.warn("[useSessionSelector] Selector threw:", e);
    }
    return undefined;
  }
}

/** Convenience helpers */
export function useUser() {
  return useSessionSelector((s) => s.user);
}
export function useRole() {
  return useSessionSelector((s) => s.role);
}
export function useIsLoggedIn() {
  return useSessionSelector((s) => s.isLoggedIn);
}
export function useIsLoading() {
  return useSessionSelector((s) => s.loading);
}

/**
 * Role utilities (client-only checks).
 * - useHasRole('admin')
 * - useHasAnyRole(['admin','superadmin'])
 */
export function useHasRole(role) {
  const current = useRole();
  return current === role;
}
export function useHasAnyRole(roles = []) {
  const current = useRole();
  return Array.isArray(roles) && roles.includes(current);
}

/**
 * Safe accessors with localStorage fallback (useful during early boot).
 */
export function getCurrentUserEmailFallback() {
  const last =
    (typeof window !== "undefined" && window.__lastSession) || {};
  const ctx = safePeekContext();
  return (
    last.user?.email ||
    ctx?.user?.email ||
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("currentUserEmail")) ||
    null
  );
}
export function getCurrentRoleFallback() {
  const ctx = safePeekContext();
  return (
    ctx?.role ||
    (typeof localStorage !== "undefined" && localStorage.getItem("userRole")) ||
    null
  );
}

/**
 * Optional: expose the latest session on window for debugging.
 * Call this once where you compute the session (e.g., in App right after useMemo).
 * Example:
 *   if (import.meta.env.MODE !== 'production') syncSessionDebug(sessionValue);
 */
export function syncSessionDebug(sessionValue) {
  if (__DEV__ && typeof window !== "undefined") {
    window.__lastSession = sessionValue;
  }
}

/** Internal: best-effort peek for fallbacks (no crash if unavailable). */
function safePeekContext() {
  try {
    // This peeks the current value without a hook; fine for debug/fallbacks.
    // React sets _currentValue on contexts in modern builds.
    return SessionContext?._currentValue || DEFAULT_SESSION;
  } catch {
    return DEFAULT_SESSION;
  }
}

// Optional default export for ergonomics
export default useSession;
