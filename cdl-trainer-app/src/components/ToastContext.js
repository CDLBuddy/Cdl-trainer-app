// src/components/ToastContext.js
// Central toast context (no components). Also exposes compat re-exports so
// old imports like `import { useToast, ToastProvider, showToast } from '@components/ToastContext'` keep working.

import { createContext } from 'react';

/**
 * Minimal default; the Provider swaps this with a real showToast().
 */
const ToastContext = createContext({
  showToast: (_msg, _type = 'info', _duration = 3000, _opts = {}) => {},
});

// Default export for ergonomics: `import ToastContext from '@components/ToastContext'`
export default ToastContext;

// Also allow named import if some files do:
// `import { ToastContext } from '@components/ToastContext'`
export { ToastContext };

/* ------------------------------------------------------------------ */
/* Back-compat re-exports (so you don't have to fix every call site)   */
/* ------------------------------------------------------------------ */

// Hook (new canonical location: ./useToast.js)
export { useToast } from './useToast.js';

// Provider component (new canonical location: ./ToastProvider.jsx)
export { default as ToastProvider } from './ToastProvider.jsx';

// Legacy/global toast function for non-React callers (compat bridge)
export { showToast } from './toast-compat.js';

// A few files imported non-toast helpers from here in the past.
// Re-export to avoid breaking them. (Canonical location: @utils/ui-helpers.js)
export { getUserInitials } from '@utils/ui-helpers.js';
