// src/components/ToastContext.js
// ======================================================================
// Central toast context (no components).
// Exposes a callable context value with helper methods, and also
// back-compat re-exports so old imports keep working.
// ======================================================================

import { createContext } from 'react'

/**
 * @typedef {'info'|'success'|'error'|'warning'} ToastType
 *
 * Callable toast API:
 *   toast('Saved!', { type: 'success', duration: 2000 })
 *   toast.success('Saved!')
 *   toast.dismiss(id)
 *   toast.clear()
 *
 * For legacy sites:
 *   toast.show('Saved!', 'success', 2000)
 *   toast.showToast('Saved!', 'success', 2000)
 *
 * @typedef {(message: string, options?: {
 *   type?: ToastType,
 *   duration?: number,
 *   position?: 'bottom'|'top'|'bottom-left'|'bottom-right'|'top-left'|'top-right',
 *   action?: { label: string, onClick: () => void },
 *   dismissible?: boolean,
 *   showProgress?: boolean,
 * }) => string|void} ToastCallable
 *
 * @typedef {ToastCallable & {
 *   show: (message: string, type?: ToastType, duration?: number, opts?: object) => string|void,
 *   showToast: (message: string, type?: ToastType, duration?: number, opts?: object) => string|void,
 *   success: (message: string, opts?: object) => string|void,
 *   error: (message: string, opts?: object) => string|void,
 *   info: (message: string, opts?: object) => string|void,
 *   warn: (message: string, opts?: object) => string|void,
 *   dismiss: (id?: string) => void,
 *   clear: () => void,
 * }} ToastAPI
 */

/** @type {ToastAPI} */
const defaultToast = Object.assign(
  /** @type {ToastCallable} */ ((_message, _options) => { /* no-op */ }),
  {
    show: (_m, _t, _d, _o) => { /* no-op */ },
    showToast: (_m, _t, _d, _o) => { /* no-op */ },
    success: (_m, _o) => { /* no-op */ },
    error: (_m, _o) => { /* no-op */ },
    info: (_m, _o) => { /* no-op */ },
    warn: (_m, _o) => { /* no-op */ },
    dismiss: (_id) => { /* no-op */ },
    clear: () => { /* no-op */ },
  }
)

/**
 * ToastContext:
 * - Provider supplies a real callable with the same shape as `defaultToast`.
 * - Consumers can treat the context as a function: `const toast = useContext(ToastContext); toast('Hi')`
 */
const ToastContext = createContext(defaultToast)

// Default export for ergonomics:
//   import ToastContext from '@/components/ToastContext.js'
export default ToastContext

// Also allow named import if some files do:
//   import { ToastContext } from '@/components/ToastContext.js'
export { ToastContext }

/* ------------------------------------------------------------------ */
/* Back-compat re-exports (keep older call sites working)              */
/* ------------------------------------------------------------------ */

// Hook (canonical in ./useToast.js)
export { useToast } from './useToast.js'

// Provider component (canonical in ./ToastProvider.jsx)
export { default as ToastProvider } from './ToastProvider.jsx'

// Legacy/global toast function for non-React callers (compat bridge)
export { showToast } from './toast-compat.js'

// Some older files pulled utility helpers from here.
// Re-export to avoid breakage (canonical: @utils/ui-helpers.js)
export { getUserInitials } from '@utils/ui-helpers.js'