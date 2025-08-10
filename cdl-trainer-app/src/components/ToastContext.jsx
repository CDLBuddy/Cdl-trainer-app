// src/components/ToastContext.jsx

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

import { __bindToastCompat } from './toast-compat.js'
import Toast from './Toast.jsx'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      window.setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    addToast(message, type, duration)
  }, [addToast])

  useMemo(() => {
    __bindToastCompat({ showToast })
    return undefined
  }, [showToast])

  const value = useMemo(() => ({ addToast, removeToast, showToast }), [addToast, removeToast, showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="region" aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastContext
