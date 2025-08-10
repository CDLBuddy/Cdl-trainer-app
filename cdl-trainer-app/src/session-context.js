// src/session-context.js
// Centralized session state for the whole app (no TypeScript)

import React, { createContext, useContext, useMemo } from "react";

/**
 * The canonical shape for session data across the app.
 * App.jsx is responsible for providing these values.
 */
const DEFAULT_SESSION = Object.freeze({
  loading: true,
  isLoggedIn: false,
  role: null, // 'student' | 'instructor' | 'admin' | 'superadmin' | null
  user: null, // { uid, email, displayName, ... } or null
});

export const SessionContext = createContext(DEFAULT_SESSION);

/**
 * Optional provider with light normalization & dev-time safety.
 * You can keep using <SessionContext.Provider> directly if you prefer.
 */
export function SessionProvider({ value, children }) {
  // Normalize and memoize so consumers don’t re-render unnecessarily.
  const normalized = useMemo(() => {
    const v = value || {};
    return {
      loading: !!v.loading,
      isLoggedIn: !!v.isLoggedIn,
      role: v.role ?? null,
      user: v.user ?? null,
    };
  }, [value]);

  if (process.env.NODE_ENV !== "production" && value == null) {
    console.warn(
      "[SessionProvider] No value passed. Falling back to DEFAULT_SESSION."
    );
  }

  return (
    <SessionContext.Provider value={normalized}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Use the full session object.
 * Warns (in dev) if used outside a provider.
 */
export function useSession() {
  const ctx = useContext(SessionContext);
  if (
    process.env.NODE_ENV !== "production" &&
    (ctx === DEFAULT_SESSION || ctx == null)
  ) {
    console.warn(
      "[useSession] Used outside <SessionContext.Provider>. " +
        "You’ll get default session values (logged out)."
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
    if (process.env.NODE_ENV !== "production") {
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
 * - hasRole('admin')
 * - hasAnyRole(['admin','superadmin'])
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
  const { user } = (typeof window !== "undefined" && window.__lastSession) || {};
  const ctx = safePeekContext();
  return (
    user?.email ||
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
 * Internal: best-effort peek for debugging/fallbacks (no crash if unavailable).
 */
function safePeekContext() {
  try {
    // This “reads” the current value without requiring a hook call site;
    // only used in the fallback helpers above.
    return SessionContext?._currentValue || DEFAULT_SESSION;
  } catch {
    return DEFAULT_SESSION;
  }
}

/**
 * Optional: expose the latest session on window for debugging.
 * Call this once where you compute the session (e.g., in App right after useMemo).
 * Example in App.jsx:
 *   if (process.env.NODE_ENV !== 'production') syncSessionDebug(sessionValue);
 */
export function syncSessionDebug(sessionValue) {
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    window.__lastSession = sessionValue;
  }
}
