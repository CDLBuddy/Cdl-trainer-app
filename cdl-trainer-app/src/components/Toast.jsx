// src/components/Toast.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'

/**
 * @typedef {'info'|'success'|'error'|'warning'} ToastType
 *
 * Toast (presentational)
 * Props:
 * - id: string|number
 * - message: string|React.ReactNode
 * - type?: ToastType
 * - duration?: number (ms)
 * - onClose?: (id) => void
 * - onHoverChange?: (hovering:boolean) => void
 * - action?: { label: string, onClick: () => void }
 * - dismissible?: boolean
 * - index?: number (stack index)
 * - position?: 'bottom'|'top'|'bottom-left'|'bottom-right'|'top-left'|'top-right'
 * - showProgress?: boolean
 */
export const Toast = memo(function Toast({
  id,
  message,
  type = 'info',
  duration = 3000,
  onClose,
  onHoverChange,
  action,
  dismissible = true,
  index = 0,
  position = 'bottom-right',
  showProgress = true,
}) {
  const [leaving, setLeaving] = useState(false)
  const [drag, setDrag] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)

  const startX = useRef(null)

  // timers/raf + bookkeeping
  const timerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */(null))
  const rafIdRef = useRef(/** @type {number | null} */(null))
  const progressElRef = useRef(/** @type {HTMLDivElement | null} */(null))
  const mountedAtRef = useRef(0)
  const remainingRef = useRef(Math.max(0, duration))

  // a11y: assertive for errors, alert role; polite/status otherwise
  const ariaLive = type === 'error' ? 'assertive' : 'polite'
  const ariaRole = type === 'error' ? 'alert' : 'status'

  // Reduced motion preference (kept outside render)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(!!mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopRaf = useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [])

  const beginClose = useCallback(() => {
    setLeaving(true)
    clearTimer()
    stopRaf()
    // Allow fade-out to play before unmount (skip if reduced motion)
    const idToClose = id
    const delay = reduceMotion ? 0 : 180
    const t = setTimeout(() => onClose?.(idToClose), delay)
    // ensure no dangling timer if unmounted during delay
    return () => clearTimeout(t)
  }, [id, onClose, reduceMotion, clearTimer, stopRaf])

  // Keyboard: ESC to dismiss
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') beginClose() }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [beginClose])

  // progress tick (rAF; no React re-renders)
  const tickProgress = useCallback(() => {
    if (!progressElRef.current) return
    const elapsed = performance.now() - mountedAtRef.current
    const total = Math.max(1, remainingRef.current) // avoid /0
    const pct = Math.max(0, 100 - (elapsed / total) * 100)
    progressElRef.current.style.width = `${pct}%`
    if (elapsed < total && rafIdRef.current != null) {
      rafIdRef.current = requestAnimationFrame(tickProgress)
    }
  }, [])

  const startTimers = useCallback((ms) => {
    clearTimer()
    stopRaf()
    remainingRef.current = Math.max(0, ms)
    mountedAtRef.current = performance.now()

    if (ms > 0) {
      timerRef.current = setTimeout(() => { beginClose() }, ms)
      if (showProgress && progressElRef.current) {
        // reset bar first for smooth resume
        progressElRef.current.style.width = '100%'
        rafIdRef.current = requestAnimationFrame(tickProgress)
      }
    }
  }, [beginClose, clearTimer, stopRaf, tickProgress, showProgress])

  // mount/prop-change timer setup
  useEffect(() => {
    if (duration <= 0) return () => {}
    startTimers(duration)
    return () => { clearTimer(); stopRaf() }
  }, [duration, startTimers, clearTimer, stopRaf])

  // Hover pause/resume
  const onEnter = useCallback(() => {
    onHoverChange?.(true)
    // Pause timers and keep remaining
    const elapsed = performance.now() - mountedAtRef.current
    remainingRef.current = Math.max(0, remainingRef.current - elapsed)
    clearTimer()
    stopRaf()
  }, [onHoverChange, clearTimer, stopRaf])

  const onLeave = useCallback(() => {
    onHoverChange?.(false)
    if (remainingRef.current > 0) startTimers(remainingRef.current)
  }, [onHoverChange, startTimers])

  // Swipe to dismiss (mobile)
  const onTouchStart = useCallback((e) => {
    startX.current = e.changedTouches[0].clientX
  }, [])
  const onTouchMove = useCallback((e) => {
    if (startX.current == null) return
    const dx = e.changedTouches[0].clientX - startX.current
    setDrag(dx)
  }, [])
  const onTouchEnd = useCallback(() => {
    if (Math.abs(drag) > 80) {
      beginClose()
    } else {
      setDrag(0)
    }
    startX.current = null
  }, [drag, beginClose])

  // Palette via CSS vars; override-able from theme
  const palette = useMemo(() => {
    switch (type) {
      case 'success': return { bg: 'var(--success,#48bb78)',           fg: '#fff' }
      case 'error':   return { bg: 'var(--error,#e53e3e)',             fg: '#fff' }
      case 'warning': return { bg: 'var(--warning,#d69e2e)',           fg: '#111' }
      case 'info':
      default:        return { bg: 'var(--toast-bg, rgba(0,0,0,.85))', fg: 'var(--toast-text,#fff)' }
    }
  }, [type])

  // Container position (pointer-events on toast, not container)
  const baseOffset = 12 + index * 8
  const containerStyle = useMemo(() => {
    const common = { position: 'fixed', zIndex: 99999, pointerEvents: 'none' }
    switch (position) {
      case 'top':         return { ...common, top: baseOffset, left: '50%', transform: 'translateX(-50%)' }
      case 'bottom':      return { ...common, bottom: baseOffset, left: '50%', transform: 'translateX(-50%)' }
      case 'top-left':    return { ...common, top: baseOffset, left: baseOffset }
      case 'top-right':   return { ...common, top: baseOffset, right: baseOffset }
      case 'bottom-left': return { ...common, bottom: baseOffset, left: baseOffset }
      case 'bottom-right':
      default:            return { ...common, bottom: baseOffset, right: baseOffset }
    }
  }, [position, baseOffset])

  // Stack translate for top vs bottom groups
  const stackTranslateY = useMemo(() => {
    const per = 2 // subtle spacing multiplier
    return position.startsWith('top') ? index * 6 * per : -index * 6 * per
  }, [position, index])

  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : type === 'warning' ? '🚧' : '💬'

  // Resolve or create the portal root (SSR-safe)
  const portalTarget = useMemo(() => {
    if (typeof document === 'undefined') return null
    const existing = document.getElementById('toast-root')
    if (existing) return existing
    const el = document.createElement('div')
    el.id = 'toast-root'
    document.body.appendChild(el)
    return el
  }, [])

  if (!portalTarget) return null

  return createPortal(
    <div style={containerStyle} aria-live={ariaLive}>
      <div
        className={`toast ${type}${leaving ? ' toast--hide' : ''}`}
        role={ariaRole}
        aria-busy="true"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          pointerEvents: 'auto',
          background: palette.bg,
          color: palette.fg,
          padding: '12px 14px',
          borderRadius: 10,
          boxShadow: '0 10px 30px rgba(0,0,0,.25)',
          minWidth: 220,
          maxWidth: 420,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          transform: `translateX(${drag}px) translateY(${stackTranslateY}px)`,
          transition: reduceMotion ? 'none' : 'transform .15s ease, opacity .18s ease',
          opacity: leaving ? 0 : 1,
          userSelect: 'none',
        }}
      >
        {/* icon */}
        <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>

        {/* body */}
        <div style={{ flex: 1, fontWeight: 500, wordBreak: 'break-word' }}>
          {message}

          {/* progress (optional; DOM-driven for perf) */}
          {showProgress && duration > 0 && (
            <div
              aria-hidden
              style={{
                marginTop: 8,
                height: 3,
                width: '100%',
                borderRadius: 999,
                background: 'rgba(255,255,255,.25)',
                overflow: 'hidden',
              }}
            >
              <div
                ref={progressElRef}
                style={{
                  height: '100%',
                  width: '100%',
                  background: 'var(--brand-primary, #4e91ad)',
                }}
              />
            </div>
          )}
        </div>

        {/* optional action */}
        {action?.label && (
          <button
            className="toast-action"
            onClick={() => { try { action.onClick?.() } finally { beginClose() } }}
            style={{
              background: 'transparent',
              border: '1px solid currentColor',
              color: 'inherit',
              padding: '4px 8px',
              borderRadius: 7,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            type="button"
          >
            {action.label}
          </button>
        )}

        {/* close */}
        {dismissible && (
          <button
            aria-label="Dismiss notification"
            onClick={beginClose}
            style={{
              background: 'transparent',
              border: 0,
              color: 'inherit',
              fontSize: 18,
              cursor: 'pointer',
              marginLeft: 6,
            }}
            type="button"
          >
            ×
          </button>
        )}
      </div>
    </div>,
    portalTarget
  )
})

/**
 * ToastContainer – renders a list of toasts
 * Props:
 * - toasts: Array<{ id, message, type?, duration?, position?, ... }>
 * - onClose: (id) => void
 * - position?: default stack position
 */
export const ToastContainer = memo(function ToastContainer({ toasts, onClose, position = 'bottom-right' }) {
  return (
    <>
      {toasts.map((t, i) => (
        <Toast
          key={t.id}
          index={i}
          onClose={onClose}
          position={t.position || position}
          {...t}
        />
      ))}
    </>
  )
})
