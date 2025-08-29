// src/components/ToastProvider.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { __DEV__ } from '@utils/env.js'

import { __bindToastCompat } from './toast-compat.js'
import { ToastContainer } from './Toast.jsx'
import ToastContext from './ToastContext.js'
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

// useToast hook is now in a separate file

export default function ToastProvider({
  children,
  defaultPosition = 'bottom-right',
  defaultDuration = 3000,
  maxPerPosition = 4,
}) {
  /** @type {[Array<ShowToastObject & { id:string, createdAt:number }>, Function]} */
  const [toasts, setToasts] = useState([])
  const idSeed = useRef(0)

  // ---------- utils -------------------------------------------------------

  const validPos = p =>
    p === 'bottom-right' ||
    p === 'bottom-left' ||
    p === 'bottom' ||
    p === 'top-right' ||
    p === 'top-left' ||
    p === 'top'

  const genId = () => {
    idSeed.current += 1
    const rand = Math.random().toString(36).slice(2, 6)
    return `t_${Date.now()}_${idSeed.current}_${rand}`
  }

  /** @returns {ShowToastObject & { id:string, createdAt:number }} */
  const normalizeInput = useCallback(
    (messageOrObj, type, duration, opts) => {
      // 1) Object signature
      if (
        messageOrObj &&
        typeof messageOrObj === 'object' &&
        'message' in messageOrObj
      ) {
        const o = /** @type {ShowToastObject} */ (messageOrObj)
        const dur = Number.isFinite(o.duration)
          ? Number(o.duration)
          : defaultDuration
        const pos = validPos(o.position) ? o.position : defaultPosition
        return {
          id: o.id || genId(),
          message: o.message,
          type: o.type || 'info',
          duration: dur,
          position: pos,
          action: o.action,
          dismissible: o.dismissible ?? true,
          showProgress: o.showProgress ?? true,
          onClose: o.onClose,
          createdAt: Date.now(),
        }
      }

      // 2) message + (type|opts) overload
      const merged =
        typeof type === 'object' && type !== null ? type : opts || {}
      const dur = Number.isFinite(duration)
        ? Number(duration)
        : Number.isFinite(merged.duration)
          ? Number(merged.duration)
          : defaultDuration
      const pos = validPos(merged.position) ? merged.position : defaultPosition
      return {
        id: genId(),
        message: String(messageOrObj ?? ''),
        type: (typeof type === 'string' ? type : merged.type) || 'info',
        duration: dur,
        position: pos,
        action: merged.action,
        dismissible: merged.dismissible ?? true,
        showProgress: merged.showProgress ?? true,
        onClose: merged.onClose,
        createdAt: Date.now(),
      }
    },
    [defaultDuration, defaultPosition]
  )

  const enforceCaps = useCallback(
    list => {
      // Cap the number of visible toasts per position (keep most recent)
      const groups = new Map()
      for (const t of list) {
        const pos = validPos(t.position) ? t.position : defaultPosition
        if (!groups.has(pos)) groups.set(pos, [])
        groups.get(pos).push(t)
      }
      const keepIds = new Set()
      for (const arr of groups.values()) {
        for (const t of arr.slice(-maxPerPosition)) keepIds.add(t.id)
      }
      return list.filter(t => keepIds.has(t.id))
    },
    [defaultPosition, maxPerPosition]
  )

  // ---------- core remove (fires onClose consistently) -------------------

  /** Remove a toast by id, optionally filtering by position. */
  const remove = useCallback((id, { fireOnClose = true } = {}) => {
    if (!id) return
    setToasts(curr => {
      const t = curr.find(x => x.id === id)
      if (fireOnClose) {
        try {
          t?.onClose?.()
        } catch {
          /* ignore */
        }
      }
      return curr.filter(x => x.id !== id)
    })
  }, [])

  // ---------- API: show / update / dismiss / clear -----------------------

  /** showToast: supports all call signatures and returns id */
  const showToast = useCallback(
    (messageOrObj, type, duration, opts) => {
      const toast = normalizeInput(messageOrObj, type, duration, opts)
      setToasts(curr => {
        // If caller supplied an id and it already exists, replace in place
        const exists = curr.some(t => t.id === toast.id)
        const next = exists
          ? curr.map(t => (t.id === toast.id ? { ...t, ...toast } : t))
          : [...curr, toast]
        // Keep overall order stable by createdAt when trimming
        next.sort((a, b) => a.createdAt - b.createdAt)
        return enforceCaps(next)
      })
      return toast.id
    },
    [normalizeInput, enforceCaps]
  )

  /** update: shallow-merge an existing toast by id (no-op if missing) */
  const update = useCallback((id, patch) => {
    if (!id || !patch) return
    setToasts(curr => curr.map(t => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  /**
   * dismiss:
   * - with id ⇒ remove that toast (fires onClose)
   * - without id ⇒ clear all toasts (fires onClose for each)
   */
  const dismiss = useCallback(
    id => {
      if (!id) {
        // clear all (with onClose)
        setToasts(curr => {
          for (const t of curr) {
            try {
              t.onClose?.()
            } catch {
              /* ignore error */
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

  /** Clear by position or everything (fires onClose) */
  const clear = useCallback(
    position => {
      if (!position) {
        dismiss() // no id ⇒ clear all
        return
      }
      setToasts(curr => {
        const keep = []
        for (const t of curr) {
          const pos = validPos(t.position) ? t.position : defaultPosition
          if (pos === position) {
            try {
              t.onClose?.()
            } catch {
              /* ignore error */
            }
          } else {
            keep.push(t)
          }
        }
        return keep
      })
    },
    [defaultPosition, dismiss]
  )

  // Convenience helpers
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

  // ---------- Legacy DOM bridge (non-React callers) ----------------------

  useEffect(() => {
    __bindToastCompat({
      showToast: (msg, params = {}) =>
        showToast(msg, params.type, params.duration, params),
      dismiss,
      clear,
      update,
    })
    return () => __bindToastCompat(null)
  }, [showToast, dismiss, clear, update])

  // ---------- Context value (callable + helpers) -------------------------

  const ctx = useMemo(() => {
    const callable = (message, options = {}) =>
      showToast({ message, ...options })
    callable.show = showToast // legacy
    callable.showToast = showToast // legacy alias
    callable.update = update
    callable.success = showSuccess
    callable.error = showError
    callable.info = showInfo
    callable.warn = showWarn
    callable.dismiss = dismiss
    callable.clear = clear

    if (__DEV__) {
      try {
        /* @ts-ignore */ window.toast = callable
      } catch {
        /* SSR-safe */
      }
    }
    return callable
  }, [
    showToast,
    update,
    showSuccess,
    showError,
    showInfo,
    showWarn,
    dismiss,
    clear,
  ])

  // ---------- Group by position (render one container per stack) ----------

  const byPosition = useMemo(() => {
    /** @type {Record<ToastPosition, any[]>} */
    const map = /** @type any */ ({})
    for (const t of toasts) {
      const pos = validPos(t.position) ? t.position : defaultPosition
      ;(map[pos] || (map[pos] = [])).push(t)
    }
    return map
  }, [toasts, defaultPosition])

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {Object.entries(byPosition).map(([pos, list]) => (
        <ToastContainer
          key={pos}
          toasts={list}
          position={/** @type {ToastPosition} */ (pos)}
          onClose={id => remove(id, { fireOnClose: true })}
        />
      ))}
    </ToastContext.Provider>
  )
}

export { ToastContext }
