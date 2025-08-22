// @ts-check
import { useContext, useMemo } from 'react'
import ToastContext, { defaultToast } from './ToastContext.js'

/**
 * useToast
 * Returns the callable toast API with helpers.
 *
 * Usage:
 *   const toast = useToast()
 *   toast('Saved!')
 *   toast.success('Saved!', { duration: 2000 })
 *   toast.show('Saved!', 'success', 2000) // legacy signature still works
 */
export function useToast() {
  const api = useContext(ToastContext)
  return useMemo(() => {
    // Dev guard: surface when the provider isn't mounted
    if (import.meta?.env?.DEV && api === defaultToast) {
      // eslint-disable-next-line no-console
      console.warn('[useToast] No <ToastProvider> found; toast() is a no-op.')
    }
    return api
  }, [api])
}

export default useToast