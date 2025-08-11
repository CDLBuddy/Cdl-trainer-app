// src/session/SessionContext.js
// Central session context + defaults (no components)

import { createContext } from "react";

/** Default session shape used when not provided by a parent */
export const DEFAULT_SESSION = {
  loading: false,
  isLoggedIn: false,
  role: null,
  user: null,
};

/** React context holding the current session */
export const SessionContext = createContext(DEFAULT_SESSION);

export default SessionContext;
