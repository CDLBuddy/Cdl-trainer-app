// src/session/SessionProvider.jsx
// Component-only file to satisfy react-refresh rule

import React, { useMemo } from "react";

import SessionContext, { DEFAULT_SESSION } from "./SessionContext.js";

/**
 * Optional provider with light normalization & dev-time safety.
 * You can still use <SessionContext.Provider> directly if you prefer.
 */
export default function SessionProvider({ value, children }) {
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

  if (
    (import.meta?.env?.MODE !== "production") &&
    value == null
  ) {
    console.warn(
      "[SessionProvider] No value passed. Falling back to DEFAULT_SESSION."
    );
  }

  return (
    <SessionContext.Provider value={normalized || DEFAULT_SESSION}>
      {children}
    </SessionContext.Provider>
  );
}
