// Path: src/components/useToast.js
// @ts-check
// ======================================================================
// useToast hook
// - Reads the ToastContext and returns a stable API (or a no-op fallback)
// - Dev-only one-time warning if <ToastProvider> is missing
// - SSR-safe, Vite + Node (process.env) compatible dev checks
// ======================================================================

import { useContext, useEffect, useRef } from 'react'
import ToastContext, { defaultToast } from './ToastContext.js'

/**
 * @typedef {Object} ToastAPI
 * @property {(msg:string, type?:"success"|"info"|"warning"|"error", opts?:any) => void} showToast
 * @property {() => void} clearToasts
 * @property {(id?:string|number) => void} hideToast
 */

/**
 * Hook: returns the Toast Provider API, or a no-op fallback.
 * @returns {ToastAPI}
 */
export function useToast() {
  /** @type {ToastAPI} */
  const api = useContext(ToastContext) || defaultToast

  // Warn exactly once in dev if the provider is missing
  const warned = useRef(false)

  useEffect(() => {
    // Prefer Vite flag when present; fall back to NODE_ENV
    // Avoids TS complaints in non-ESM environments.
    /** @type {boolean} */
    let isDev = false
    try {
      // @ts-ignore - import.meta is ESM/Vite; guarded by try/catch
      isDev = !!(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV)
    } catch {
      // ignore
    }
    if (!isDev && typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development') {
      isDev = true
    }

    if (isDev && api === defaultToast && !warned.current) {
      // SSR-safe console usage; will only log client-side after mount
      console.warn('[useToast] No <ToastProvider> found; toast calls will be no-ops.')
      warned.current = true
    }
  }, [api])

  return api
}

export default useToast