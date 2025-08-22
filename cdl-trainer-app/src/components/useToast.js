// src/components/useToast.js
// @ts-check
import { useContext, useEffect, useRef } from 'react'

import ToastContext, { defaultToast } from './ToastContext.js'

export function useToast() {
  const api = useContext(ToastContext)
  const warned = useRef(false)

  useEffect(() => {
    // Determine "dev" in a TS-friendly way (works with CJS tsconfig too)
    let isDev =
      typeof process !== 'undefined' &&
      !!process.env &&
      process.env.NODE_ENV === 'development'

    if (!isDev) {
      // Prefer Vite’s flag when available, but guard for TS checkers that
      // disallow `import.meta` under non-ES module targets.
      // @ts-ignore -- Allowed in Vite/ESM builds; safe to ignore for CJS checking
      isDev = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV
    }

    if (isDev && api === defaultToast && !warned.current) {
      console.warn('[useToast] No <ToastProvider> found; toast() is a no-op.')
      warned.current = true
    }
  }, [api])

  return api
}

export default useToast
