// src/components/ToastProvider.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { __bindToastCompat } from './toast-compat.js'
import { ToastContainer } from './Toast.jsx'
import ToastContext from './ToastContext.js'

/**
 * ToastProvider
 *
 * Props:
 * - children
 * - defaultPosition?: 'bottom-right' | 'bottom-left' | 'bottom' | 'top-right' | 'top-left' | 'top'
 * - maxPerPosition?: number   // cap per position stack
 * - defaultDuration?: number  // default toast duration (ms)
 */
export default function ToastProvider({
  children,
  defaultPosition = 'bottom-right',
  defaultDuration = 3000,
  maxPerPosition = 4,
}) {
  const [toasts, setToasts] = useState([])
  const idSeed = useRef(0)

  // --- utils --------------------------------------------------------------
  const genId = () => {
    idSeed.current += 1
    return `t_${Date.now()}_${idSeed.current}`
  }

  const normalizeInput = useCallback((messageOrObj, type, duration, opts) => {
    // Supports:
    // - showToast("Saved!", "success", 2000, { position })
    // - showToast("Saved!", { type: "success", duration: 2000, position })
    // - showToast({ message: "Saved!", type: "success", duration, position })
    if (typeof messageOrObj === 'object' && messageOrObj && 'message' in messageOrObj) {
      const o = messageOrObj
      return {
        id: o.id || genId(),
        message: o.message,
        type: o.type || 'info',
        duration: Number.isFinite(o.duration) ? o.duration : defaultDuration,
        position: o.position || defaultPosition,
        action: o.action,
        dismissible: o.dismissible ?? true,
        showProgress: o.showProgress ?? true,
      }
    }
    // message + (type|opts) overload
    const merged = typeof type === 'object' && type !== null ? type : opts || {}
    return {
      id: genId(),
      message: String(messageOrObj ?? ''),
      type: typeof type === 'string' ? type : merged.type || 'info',
      duration: Number.isFinite(duration) ? duration : (merged.duration ?? defaultDuration),
      position: merged.position || defaultPosition,
      action: merged.action,
      dismissible: merged.dismissible ?? true,
      showProgress: merged.showProgress ?? true,
    }
  }, [defaultDuration, defaultPosition])

  const enforceCaps = useCallback((list) => {
    // Cap per position stack length
    const groups = new Map()
    for (const t of list) {
      const pos = t.position || defaultPosition
      const arr = groups.get(pos) || []
      arr.push(t)
      groups.set(pos, arr)
    }
    const trimmed = []
    for (const [_, arr] of groups.entries()) {
      // Keep most recent "maxPerPosition" toasts in that position
      const keep = arr.slice(-maxPerPosition)
      trimmed.push(...keep)
    }
    // Preserve original order among kept toasts
    const ids = new Set(trimmed.map(t => t.id))
    return list.filter(t => ids.has(t.id))
  }, [defaultPosition, maxPerPosition])

  // --- API: show / dismiss / clear ---------------------------------------
  const showToast = useCallback((messageOrObj, type, duration, opts) => {
    const toast = normalizeInput(messageOrObj, type, duration, opts)
    // Avoid duplicate IDs if caller supplied one
    setToasts(curr => enforceCaps([...curr.filter(t => t.id !== toast.id), toast]))
    return toast.id
  }, [enforceCaps, normalizeInput])

  const dismiss = useCallback((id) => {
    if (!id) return
    setToasts(curr => curr.filter(t => t.id !== id))
  }, [])

  const clear = useCallback(() => setToasts([]), [])

  // Convenience helpers
  const showSuccess = useCallback((message, opts = {}) => showToast(message, 'success', opts.duration, opts), [showToast])
  const showError   = useCallback((message, opts = {}) => showToast(message, 'error',   opts.duration, opts), [showToast])
  const showInfo    = useCallback((message, opts = {}) => showToast(message, 'info',    opts.duration, opts), [showToast])
  const showWarn    = useCallback((message, opts = {}) => showToast(message, 'warning', opts.duration, opts), [showToast])

  // Legacy DOM bridge so non-React code can call showToast()
  useEffect(() => {
    __bindToastCompat({
      showToast: (msg, params = {}) =>
        showToast(msg, params.type, params.duration, params),
      dismiss,
      clear,
    })
    return () => __bindToastCompat(null)
  }, [showToast, dismiss, clear])

  // Also keep context ergonomic: allow calling as fn(message, { type, duration })
  const ctx = useMemo(() => {
    const callable = (message, options = {}) =>
      showToast({ message, ...options })
    callable.show = showToast
    callable.success = showSuccess
    callable.error = showError
    callable.info = showInfo
    callable.warn = showWarn
    callable.dismiss = dismiss
    callable.clear = clear
    return callable
  }, [showToast, showSuccess, showError, showInfo, showWarn, dismiss, clear])

  // Group by position so stacks render cleanly
  const byPosition = useMemo(() => {
    /** @type {Record<string, any[]>} */
    const map = {}
    for (const t of toasts) {
      const pos = t.position || defaultPosition
      if (!map[pos]) map[pos] = []
      map[pos].push(t)
    }
    return map
  }, [toasts, defaultPosition])

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Render one container per occupied position */}
      {Object.entries(byPosition).map(([pos, list]) => (
        <ToastContainer
          key={pos}
          toasts={list}
          position={pos}
          onClose={(id) => dismiss(id)}
        />
      ))}
    </ToastContext.Provider>
  )
}