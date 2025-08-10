// src/components/ToastContext.jsx
import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react'

import { __bindToastCompat } from './toast-compat.js'
import { Toast } from './Toast.jsx' // named export from your file

/**
 * React toast provider with legacy bridge.
 * useToast().showToast(message, type = 'info', duration = 3000, opts?)
 * opts: { position?, action?, dismissible? }
 */

const ToastContext = createContext({
  showToast: (_msg, _type = 'info', _duration = 3000, _opts = {}) => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children, defaultPosition = 'bottom-right' }) {
  const [queue, setQueue] = useState([]) // pending toasts
  const activeRef = useRef(null)
  const timerRef = useRef(null)

  const showToast = useCallback(
    (message, type = 'info', duration = 3000, opts = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      setQueue((q) => [
        ...q,
        {
          id,
          message: String(message ?? ''),
          type,
          duration,
          position: opts.position || defaultPosition,
          action: opts.action,
          dismissible: opts.dismissible ?? true,
        },
      ])
    },
    [defaultPosition]
  )

  // Bind/unbind legacy bridge so non-React code can call showToast()
  useEffect(() => {
    __bindToastCompat({ showToast })
    return () => __bindToastCompat(null)
  }, [showToast])

  // Pull one toast at a time from the queue
  useEffect(() => {
    if (activeRef.current || queue.length === 0) return

    const [next, ...rest] = queue
    activeRef.current = next
    setQueue(rest)

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      activeRef.current = null
      setQueue((q) => q.slice()) // trigger to grab next
    }, next.duration || 3000)

    return () => clearTimeout(timerRef.current)
  }, [queue])

  const dismiss = useCallback((id) => {
    if (activeRef.current && (!id || id === activeRef.current.id)) {
      clearTimeout(timerRef.current)
      activeRef.current = null
      setQueue((q) => q.slice())
    }
  }, [])

  const ctx = useMemo(() => ({ showToast }), [showToast])
  const active = activeRef.current

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {active ? (
        <Toast
          id={active.id}
          message={active.message}
          type={active.type}
          duration={active.duration}
          position={active.position}
          action={active.action}
          dismissible={active.dismissible}
          onClose={() => dismiss(active.id)} // Toast expects onClose(id)
        />
      ) : null}
    </ToastContext.Provider>
  )
}

export default ToastContext
