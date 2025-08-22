//src/components/ToastContext.js
//============================================
// Central toast context (no components, no re-exports).
// Pure module to avoid circular imports/chunk order issues.
// ===========================================

// @ts-check
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
 * Legacy:
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
export const defaultToast = Object.assign(
  /** @type {ToastCallable} */ (() => { /* no-op */ }),
  {
    show:      () => { /* no-op */ },
    showToast: () => { /* no-op */ },
    success:   () => { /* no-op */ },
    error:     () => { /* no-op */ },
    info:      () => { /* no-op */ },
    warn:      () => { /* no-op */ },
    dismiss:   () => { /* no-op */ },
    clear:     () => { /* no-op */ },
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
// Do NOT re-export ToastProvider, useToast, or any other module from here.
// Keeping this file pure prevents circular imports between context <-> provider.