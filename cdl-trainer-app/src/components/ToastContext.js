// src/components/ToastContext.js
// ======================================================================
// Central toast context (pure module — no components, no re-exports).
// - Exposes a callable API with helpers (success/error/info/warn)
// - Includes legacy helpers (show, showToast)
// - Adds update(id, patch) so in-place changes are possible
// - Kept side-effect free to avoid circular imports/chunk order issues
// ======================================================================

// @ts-check
import { createContext } from 'react'

/** @typedef {'info'|'success'|'error'|'warning'} ToastType */
/** @typedef {'bottom'|'top'|'bottom-left'|'bottom-right'|'top-left'|'top-right'} ToastPosition */

/** @typedef {{ label: string, onClick: () => void }} ToastAction */

/**
 * Options accepted by the callable toast function.
 * NOTE: Keep in sync with ToastProvider + toast-compat.
 * @typedef {Object} ToastOptions
 * @property {ToastType=} type
 * @property {number=} duration              // ms; 0/undefined = stick around until dismissed
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
 * @typedef {(message: string, options?: ToastOptions) => string|void} ToastCallable
 */

/**
 * Full Toast API exposed via context. All methods are safe to call even
 * without a provider (no-ops).
 * @typedef {ToastCallable & {
 *   show: (message: string, type?: ToastType, duration?: number, opts?: object) => string|void,   // legacy
 *   showToast: (message: string, type?: ToastType, duration?: number, opts?: object) => string|void, // legacy alias
 *   success: (message: string, opts?: ToastOptions) => string|void,
 *   error:   (message: string, opts?: ToastOptions) => string|void,
 *   info:    (message: string, opts?: ToastOptions) => string|void,
 *   warn:    (message: string, opts?: ToastOptions) => string|void,
 *   dismiss: (id?: string) => void,
 *   clear:   () => void,
 *   update:  (id: string, patch: Partial<ToastOptions & { message?: string, type?: ToastType }>) => void,
 * }} ToastAPI
 */

/** @type {ToastAPI} */
export const defaultToast = Object.assign(
  /** @type {ToastCallable} */ (
    () => {
      /* no-op */
    }
  ),
  {
    show: () => {
      /* no-op */
    },
    showToast: () => {
      /* no-op */
    },
    success: () => {
      /* no-op */
    },
    error: () => {
      /* no-op */
    },
    info: () => {
      /* no-op */
    },
    warn: () => {
      /* no-op */
    },
    dismiss: () => {
      /* no-op */
    },
    clear: () => {
      /* no-op */
    },
    update: () => {
      /* no-op */
    },
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

// IMPORTANT:
// Keep this file PURE. Do not re-export ToastProvider/useToast/etc here.
// That prevents circular imports between context <-> provider.
