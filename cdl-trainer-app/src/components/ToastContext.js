// Path: src/components/ToastContext.js
// ======================================================================
// Central toast context (pure module — no components, no re-exports).
// - Callable API + helper methods (success/error/info/warn)
// - Legacy helpers kept (show, showToast)
// - Compat aliases added (hideToast → dismiss, clearToasts → clear)
// - update(id, patch) supported (provider may ignore if not implemented)
// - PURE: no components, no provider imports (avoid circular deps)
// ======================================================================

// @ts-check
import { createContext } from 'react'

/** @typedef {'info'|'success'|'error'|'warning'} ToastType */
/** @typedef {'bottom'|'top'|'bottom-left'|'bottom-right'|'top-left'|'top-right'} ToastPosition */

/** @typedef {{ label: string, onClick: () => void }} ToastAction */

/**
 * Options accepted by the callable toast function.
 * Keep in sync with ToastProvider.
 * @typedef {Object} ToastOptions
 * @property {ToastType=} type
 * @property {number=} duration                 // ms; 0/undefined = sticky
 * @property {ToastPosition=} position
 * @property {ToastAction=} action
 * @property {boolean=} dismissible
 * @property {boolean=} showProgress
 */

/**
 * Callable toast function.
 *   toast('Saved!', { type: 'success', duration: 2000 })
 *   toast.success('Saved!')
 * Returns a toast id when the provider supplies one; otherwise void (no-op default).
 * @typedef {(message: string, options?: ToastOptions) => string|number|void} ToastCallable
 */

/**
 * Full Toast API exposed via context. Safe no-ops without a provider.
 * Matching both legacy and modern method names.
 * @typedef {ToastCallable & Object} ToastAPI
 * @property {(message: string, type?: ToastType, duration?: number, opts?: object) => string|number|void} show
 * @property {(message: string, type?: ToastType, duration?: number, opts?: object) => string|number|void} showToast
 * @property {(message: string, opts?: ToastOptions) => string|number|void} success
 * @property {(message: string, opts?: ToastOptions) => string|number|void} error
 * @property {(message: string, opts?: ToastOptions) => string|number|void} info
 * @property {(message: string, opts?: ToastOptions) => string|number|void} warn
 * @property {(id?: string|number) => void} dismiss
 * @property {(id?: string|number) => void} hideToast
 * @property {() => void} clear
 * @property {() => void} clearToasts
 * @property {(id: string|number, patch: Partial<ToastOptions & { message?: string, type?: ToastType }>) => void} update
 */

/** @type {ToastAPI} */
export const defaultToast = Object.assign(
  /** @type {ToastCallable} */ (() => {
    /* no-op callable */
  }),
  {
    // legacy shorthands (no-ops)
    show: () => {},
    showToast: () => {},

    // helpers (no-ops)
    success: () => {},
    error: () => {},
    info: () => {},
    warn: () => {},

    // controls (no-ops)
    dismiss: () => {},
    hideToast: () => {},      // compat alias
    clear: () => {},
    clearToasts: () => {},    // compat alias
    update: () => {},
  }
)

/**
 * Provider supplies a real callable with the same shape as `defaultToast`.
 * Consumers can treat the context as a function:
 *   const toast = useContext(ToastContext); toast('Hi')
 */
const ToastContext = createContext(defaultToast)

export default ToastContext
export { ToastContext } // named alias for convenience

// IMPORTANT: Keep this file PURE. Do not import ToastProvider/useToast here.