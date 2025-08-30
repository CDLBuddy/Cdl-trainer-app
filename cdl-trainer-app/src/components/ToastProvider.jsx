// Path: src/components/ToastProvider.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { __DEV__ } from '@utils/env.js'
import ToastContext from './ToastContext.js'
import { ToastContainer } from './Toast.jsx'

// Bridge for non-React callers (optional; guard at runtime)
let bindCompat = null
try {
  // eslint-disable-next-line import/no-unresolved
  // @ts-ignore: optional module
  bindCompat = (await import('./toast-compat.js')).__bindToastCompat || null
} catch {
  /* compat is optional */
}

/**
 * @typedef {'info'|'success'|'error'|'warning'} ToastType
 * @typedef {'bottom-right'|'bottom-left'|'bottom'|'top-right'|'top-left'|'top'} ToastPosition
 *
 * @typedef {Object} ShowToastObject
 * @property {string=} id
 * @property {React.ReactNode|string} message
 * @property {ToastType=} type
 * @property {number=} duration
 * @property {{ label:string, onClick:()=>void }=} action
 * @property {boolean=} dismissible
 * @property {ToastPosition=} position
 * @property {boolean=} showProgress
 * @property {() => void=} onClose
 */

const VALID_POSITIONS = new Set([
  'bottom-right',
  'bottom-left',
  'bottom',
  'top-right',
  'top-left',
  'top',
])

export default function ToastProvider({
  children,
  defaultPosition = 'bottom-right',
  defaultDuration = 3000,
  maxPerPosition = 4,
}) {
  /** @type {[Array<ShowToastObject & { id:string, createdAt:number }>, React.Dispatch<any>]} */
  const [toasts, setToasts] = useState([])
  const idSeed = useRef(0)

  /* ------------------------------- utils --------------------------------- */

  const validPos = useCallback(
    (p) => (VALID_POSITIONS.has(p) ? p : defaultPosition),
    [defaultPosition]
  )

  const genId = () => {
    idSeed.current += 1
    const rand = Math.random().toString(36).slice(2, 6)
    return `t_${Date.now()}_${idSeed.current}_${rand}`
  }

  /** @returns {ShowToastObject & { id:string, createdAt:number }} */
  const normalizeInput = useCallback(
    (messageOrObj, type, duration, opts) => {
      // Object signature
      if (messageOrObj && typeof messageOrObj === 'object' && 'message' in messageOrObj) {
        const o = /** @type {ShowToastObject} */ (messageOrObj)
        const dur =
          Number.isFinite(o.duration) ? Number(o.duration) : defaultDuration
        return {
          id: o.id || genId(),
          message: o.message,
          type: o.type || 'info',
          duration: dur,
          position: validPos(o.position || defaultPosition),
          action: o.action,
          dismissible: o.dismissible ?? true,
          showProgress: o.showProgress ?? true,
          onClose: o.onClose,
          createdAt: Date.now(),
        }
      }

      // message + (type|opts) overload
      const merged = typeof type === 'object' && type !== null ? type : opts || {}
      const dur = Number.isFinite(duration)
        ? Number(duration)
        : Number.isFinite(merged.duration)
          ? Number(merged.duration)
          : defaultDuration
      return {
        id: genId(),
        message: String(messageOrObj ?? ''),
        type: (typeof type === 'string' ? type : merged.type) || 'info',
        duration: dur,
        position: validPos(merged.position || defaultPosition),
        action: merged.action,
        dismissible: merged.dismissible ?? true,
        showProgress: merged.showProgress ?? true,
        onClose: merged.onClose,
        createdAt: Date.now(),
      }
    },
    [defaultDuration, defaultPosition, validPos]
  )

  const enforceCaps = useCallback(
    (list) => {
      // Cap count per position; keep most recent within each stack
      const groups = new Map()
      for (const t of list) {
        const pos = validPos(t.position)
        if (!groups.has(pos)) groups.set(pos, [])
        groups.get(pos).push(t)
      }
      const keepIds = new Set()
      for (const arr of groups.values()) {
        for (const t of arr.slice(-maxPerPosition)) keepIds.add(t.id)
      }
      return list.filter((t) => keepIds.has(t.id))
    },
    [maxPerPosition, validPos]
  )

  /* --------------------------- remove helper ----------------------------- */

  /** Remove a toast by id (fires onClose unless disabled) */
  const remove = useCallback((id, { fireOnClose = true } = {}) => {
    if (!id) return
    setToasts((curr) => {
      const found = curr.find((x) => x.id === id)
      if (fireOnClose) {
        try {
          found?.onClose?.()
        } catch {
          /* ignore */
        }
      }
      return curr.filter((x) => x.id !== id)
    })
  }, [])

  /* ---------------------- show / update / dismiss / clear ---------------- */

  /** showToast: supports all call signatures and returns id */
  const showToast = useCallback(
    (messageOrObj, type, duration, opts) => {
      const toast = normalizeInput(messageOrObj, type, duration, opts)
      setToasts((curr) => {
        const exists = curr.some((t) => t.id === toast.id)
        const next = exists
          ? curr.map((t) => (t.id === toast.id ? { ...t, ...toast } : t))
          : [...curr, toast]
        next.sort((a, b) => a.createdAt - b.createdAt) // stable order
        return enforceCaps(next)
      })
      return toast.id
    },
    [normalizeInput, enforceCaps]
  )

  /** Shallow-merge an existing toast by id (no-op if missing) */
  const update = useCallback((id, patch) => {
    if (!id || !patch) return
    setToasts((curr) => curr.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  /**
   * dismiss:
   * - with id ⇒ remove that toast (fires onClose)
   * - without id ⇒ clear all (fires onClose for each)
   */
  const dismiss = useCallback(
    (id) => {
      if (!id) {
        setToasts((curr) => {
          for (const t of curr) {
            try {
              t.onClose?.()
            } catch {
              /* ignore */
            }
          }
          return []
        })
        return
      }
      remove(id, { fireOnClose: true })
    },
    [remove]
  )

  /** Clear all or by position (fires onClose for removed items) */
  const clear = useCallback(
    (position) => {
      if (!position) {
        dismiss()
        return
      }
      setToasts((curr) => {
        const keep = []
        const posNorm = validPos(position)
        for (const t of curr) {
          if (validPos(t.position) === posNorm) {
            try {
              t.onClose?.()
            } catch {
              /* ignore */
            }
          } else {
            keep.push(t)
          }
        }
        return keep
      })
    },
    [dismiss, validPos]
  )

  // Typed helpers
  const showSuccess = useCallback(
    (message, opts = {}) => showToast(message, 'success', opts.duration, opts),
    [showToast]
  )
  const showError = useCallback(
    (message, opts = {}) => showToast(message, 'error', opts.duration, opts),
    [showToast]
  )
  const showInfo = useCallback(
    (message, opts = {}) => showToast(message, 'info', opts.duration, opts),
    [showToast]
  )
  const showWarn = useCallback(
    (message, opts = {}) => showToast(message, 'warning', opts.duration, opts),
    [showToast]
  )

  /* ----------------------- Legacy DOM bridge (optional) ------------------ */

  useEffect(() => {
    if (!bindCompat) return
    bindCompat({
      showToast: (msg, params = {}) =>
        showToast(msg, params.type, params.duration, params),
      dismiss,
      clear,
      update,
    })
    return () => bindCompat && bindCompat(null)
  }, [showToast, dismiss, clear, update])

  /* --------------------------- Context callable -------------------------- */

  const ctx = useMemo(() => {
    const callable = (message, options = {}) => showToast({ message, ...options })
    // Legacy shorthands
    callable.show = showToast
    callable.showToast = showToast
    // Typed helpers
    callable.success = showSuccess
    callable.error = showError
    callable.info = showInfo
    callable.warn = showWarn
    // Controls
    callable.update = update
    callable.dismiss = dismiss
    callable.hideToast = dismiss        // compat alias
    callable.clear = clear
    callable.clearToasts = clear        // compat alias

    if (__DEV__) {
      try {
        // @ts-ignore
        window.toast = callable
      } catch {
        /* SSR-safe */
      }
    }
    return callable
  }, [showToast, showSuccess, showError, showInfo, showWarn, update, dismiss, clear])

  /* ----------------------- Group by position & render --------------------- */

  const byPosition = useMemo(() => {
    /** @type {Record<ToastPosition, any[]>} */
    const map = /** @type any */ ({})
    for (const t of toasts) {
      const pos = validPos(t.position)
      ;(map[pos] || (map[pos] = [])).push(t)
    }
    return map
  }, [toasts, validPos])

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {Object.entries(byPosition).map(([pos, list]) => (
        <ToastContainer
          key={pos}
          toasts={list}
          position={/** @type {ToastPosition} */ (pos)}
          onClose={(id) => remove(id, { fireOnClose: true })}
        />
      ))}
    </ToastContext.Provider>
  )
}