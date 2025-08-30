// Path: src/components/useToast.js
// @ts-check
// ======================================================================
// useToast hook
// - Returns the ToastContext API (callable + helpers) or a no-op fallback
// - Dev-only one-time warning if <ToastProvider> is missing
// - SSR-safe, Vite + Node (process.env) compatible dev checks
// ======================================================================

import { useContext, useEffect, useRef } from 'react'

import ToastContext, { defaultToast } from './ToastContext.js'
// Use ToastAPI type via JSDoc type annotations (no direct import needed)
/**
 * @typedef {import('./ToastContext.js').ToastAPI} ToastAPI
 */

/** @typedef {'info'|'success'|'error'|'warning'} ToastType */

/**
 * Callable toast function:
 *   toast('Saved!', { type: 'success' })
 *   const id = toast.success('Great job', { duration: 2500 })
 * Also exposes helpers like dismiss/clear/update, etc.
 *
 * Keep this signature in sync with ToastContext.js.
 * @typedef {(message: string, options?: {
 *   type?: ToastType,
 *   duration?: number,
 *   position?: 'bottom'|'top'|'bottom-left'|'bottom-right'|'top-left'|'top-right',
 *   action?: { label: string, onClick: () => void },
 *   dismissible?: boolean,
 *   showProgress?: boolean,
 * }) => string|void} ToastCallable
 */

/**
 * Full Toast API (matches ToastContext/defaultToast shape).
 * Methods are no-ops if no provider is mounted.
 * @typedef {ToastCallable & {
 *   // legacy helpers
 *   show: (message: string, type?: ToastType, duration?: number, opts?: object) => string|void,
 *   showToast: (message, type, duration, opts) => string|void,
 *   // typed helpers
 *   success: (message, opts) => string|void,
 *   error:   (message, opts) => string|void,
 *   info:    (message, opts) => string|void,
 *   warn:    (message, opts) => string|void,
 *   dismiss: (id) => void,
 *   clear:   () => void,
 *   update:  (id, patch) => void,
 * }} ToastAPI
 */
/** @type {import('./ToastContext.js').ToastAPI} */

/**
 * Hook: returns the Toast Provider API, or a no-op fallback in its absence.
 * @returns {ToastAPI}
 */
export function useToast() {
  /** @type {ToastAPI} */
  const api = /** @type {ToastAPI} */ (useContext(ToastContext) || defaultToast)

  // Warn exactly once in dev if the provider is missing
  const warned = useRef(false)

  useEffect(() => {
    let isDev = false
    try {
      // Vite / ESM
      // @ts-ignore - guarded
      isDev = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV)
    } catch {
      /* noop */
    }
    if (!isDev && typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development') {
      isDev = true
    }

    if (isDev && api === /** @type {any} */ (defaultToast) && !warned.current) {
      // Logs only on the client after mount
      console.warn('[useToast] No <ToastProvider> found; toast calls will be no-ops.')
      warned.current = true
    }
  }, [api])

  return api
}

export default useToast
