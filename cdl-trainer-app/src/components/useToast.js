//src/components/useToast.js======================================================================
// useToast (pure JS, ESLint-friendly)
// - Returns the ToastContext API or a no-op fallback
// - Dev-only one-time warning if <ToastProvider> is missing
// - SSR-safe; works in Vite (import.meta.env) and Node (process.env)
// ======================================================================

import { useContext, useEffect, useRef } from 'react'
import ToastContext, { defaultToast } from './ToastContext.js'

export function useToast() {
  // If no provider, return the no-op API so callers never crash
  const api = useContext(ToastContext) || defaultToast

  // Warn exactly once in dev if the provider is missing
  const warned = useRef(false)

  useEffect(() => {
    let isDev = false
    try {
      // Prefer Vite flag when available
      // eslint-disable-next-line no-undef
      isDev = Boolean(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV)
    } catch {
      // ignore
    }
    if (!isDev && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      isDev = true
    }

    if (isDev && api === defaultToast && !warned.current) {
      // Logs only on the client after mount
      // eslint-disable-next-line no-console
      console.warn('[useToast] No <ToastProvider> found; toast calls will be no-ops.')
      warned.current = true
    }
  }, [api])

  return api
}

export default useToast