// src/components/useToast.js
import { useContext } from 'react'
import ToastContext from './ToastContext.js'

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
  // ToastContext default is a no-op API, so this is always safe to call
  return useContext(ToastContext)
}

export default useToast