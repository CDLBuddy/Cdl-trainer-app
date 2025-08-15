// src/components/Toast.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
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
export function Toast({
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
  const [, setHovering] = useState(false)
  const [drag, setDrag] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)

  const startX = useRef(null)
  const timerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */(null))
  const progressRef = useRef(/** @type {ReturnType<typeof setInterval> | null} */(null))
  const progressPctRef = useRef(100)
  const mountedAtRef = useRef(performance.now())
  const remainingRef = useRef(duration)

  // a11y: assertive for errors, alert role; polite/status otherwise
  const ariaLive = type === 'error' ? 'assertive' : 'polite'
  const ariaRole = type === 'error' ? 'alert' : 'status'

  // Reduced motion preference
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(!!mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  const beginClose = useCallback(() => {
    setLeaving(true)
    // Let the fade-out play before unmount
    const idToClose = id
    setTimeout(() => onClose?.(idToClose), reduceMotion ? 0 : 180)
  }, [id, onClose, reduceMotion])

  // Keyboard: ESC to dismiss
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') beginClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [beginClose])

  // Auto-dismiss timer with pause/resume on hover
  const clearAllTimers = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null }
  }, [])

  const startTimers = useCallback((ms) => {
    clearAllTimers()
    remainingRef.current = ms
    mountedAtRef.current = performance.now()

    timerRef.current = setTimeout(() => beginClose(), ms)

    if (showProgress) {
      progressRef.current = setInterval(() => {
        const elapsed = performance.now() - mountedAtRef.current
        const pct = Math.max(0, 100 - (elapsed / remainingRef.current) * 100)
        progressPctRef.current = pct
      }, 100)
    }
  }, [beginClose, clearAllTimers, showProgress])

  useEffect(() => {
    if (duration <= 0) return
    startTimers(duration)
    return clearAllTimers
  }, [duration, startTimers, clearAllTimers])

  function onEnter() {
    setHovering(true)
    onHoverChange?.(true)
    // Pause timers
    const elapsed = performance.now() - mountedAtRef.current
    remainingRef.current = Math.max(0, remainingRef.current - elapsed)
    clearAllTimers()
  }
  function onLeave() {
    setHovering(false)
    onHoverChange?.(false)
    // Resume with remaining time
    if (remainingRef.current > 0) startTimers(remainingRef.current)
  }

  // Swipe to dismiss (mobile)
  function onTouchStart(e) {
    startX.current = e.changedTouches[0].clientX
  }
  function onTouchMove(e) {
    if (startX.current == null) return
    const dx = e.changedTouches[0].clientX - startX.current
    setDrag(dx)
  }
  function onTouchEnd() {
    if (Math.abs(drag) > 80) {
      beginClose()
    } else {
      setDrag(0)
    }
    startX.current = null
  }

  // Palette via CSS vars; override-able from theme
  const palette = {
    info:    { bg: 'var(--toast-bg, rgba(0,0,0,.85))', fg: 'var(--toast-text,#fff)' },
    success: { bg: 'var(--success,#48bb78)',           fg: '#fff' },
    error:   { bg: 'var(--error,#e53e3e)',             fg: '#fff' },
    warning: { bg: 'var(--warning,#d69e2e)',           fg: '#111' },
  }[type] || { bg: 'var(--toast-bg, rgba(0,0,0,.85))', fg: 'var(--toast-text,#fff)' }

  // Container position (pointer-events on toast, not container)
  const baseOffset = 12 + index * 8
  const containerStyle = useMemo(() => {
    const common = { position: 'fixed', zIndex: 99999, pointerEvents: 'none' }
    switch (position) {
      case 'top':
        return { ...common, top: baseOffset, left: '50%', transform: 'translateX(-50%)' }
      case 'bottom':
        return { ...common, bottom: baseOffset, left: '50%', transform: 'translateX(-50%)' }
      case 'top-left':
        return { ...common, top: baseOffset, left: baseOffset }
      case 'top-right':
        return { ...common, top: baseOffset, right: baseOffset }
      case 'bottom-left':
        return { ...common, bottom: baseOffset, left: baseOffset }
      case 'bottom-right':
      default:
        return { ...common, bottom: baseOffset, right: baseOffset }
    }
  }, [position, baseOffset])

  // Stack translate for top vs bottom groups
  const stackTranslateY = useMemo(() => {
    const per = 2 // subtle spacing multiplier
    if (position.startsWith('top')) return index * 6 * per
    return -index * 6 * per
  }, [position, index])

  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : type === 'warning' ? '🚧' : '💬'

  // Choose portal root if available
  const portalTarget =
    document.getElementById('toast-root') ||
    document.body

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
          {/* progress (optional) */}
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
                style={{
                  height: '100%',
                  width: `${progressPctRef.current}%`,
                  background: 'var(--brand-primary, #4e91ad)',
                  transition: reduceMotion ? 'none' : 'width .1s linear',
                }}
              />
            </div>
          )}
        </div>

        {/* optional action */}
        {action?.label && (
          <button
            className="toast-action"
            onClick={() => { action.onClick?.(); beginClose() }}
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
          >
            ×
          </button>
        )}
      </div>
    </div>,
    portalTarget
  )
}

/**
 * ToastContainer – renders a list of toasts
 * Props:
 * - toasts: Array<{ id, message, type?, duration?, position?, ... }>
 * - onClose: (id) => void
 * - position?: default stack position
 */
export function ToastContainer({ toasts, onClose, position = 'bottom-right' }) {
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
}