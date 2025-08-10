import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Toast - purely presentational.
 * Props:
 * - id, message, type ('info' | 'success' | 'error' | 'warning')
 * - duration (ms)
 * - onClose(id)
 * - onHoverChange?(boolean)      // lets container pause the timer
 * - action?: { label: string, onClick: () => void }
 * - dismissible?: boolean        // show an X button
 * - index?: number               // stack index (for small offset)
 * - position?: 'bottom'|'top'|'bottom-left'|'bottom-right'|'top-left'|'top-right'
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
  position = 'bottom',
}) {
  const [leaving, setLeaving] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [drag, setDrag] = useState(0)
  const closeRef = useRef(null)
  const startX = useRef(null)
  const timerRef = useRef(null)

  // a11y: assertive for errors, polite otherwise
  const ariaLive = type === 'error' ? 'assertive' : 'polite'

  const beginClose = useCallback(() => {
    setLeaving(true)
    // let the animation run before unmounting
    setTimeout(() => onClose?.(id), 180)
  }, [id, onClose])

  // auto-dismiss
  useEffect(() => {
    if (hovering) return // paused
    timerRef.current = setTimeout(() => beginClose(), duration)
    return () => clearTimeout(timerRef.current)
  }, [hovering, duration, beginClose])

  // hover handlers (pause/resume)
  function onEnter() {
    setHovering(true)
    onHoverChange?.(true)
    clearTimeout(timerRef.current)
  }
  function onLeave() {
    setHovering(false)
    onHoverChange?.(false)
  }

  // swipe to dismiss (mobile)
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

  // basic theming via CSS variables (from your app)
  const palette = {
    info: {
      bg: 'var(--toast-bg, rgba(0,0,0,.85))',
      fg: 'var(--toast-text,#fff)',
    },
    success: { bg: 'var(--success,#48bb78)', fg: '#fff' },
    error: { bg: 'var(--error,#e53e3e)', fg: '#fff' },
    warning: { bg: '#d69e2e', fg: '#111' },
  }[type] || {
    bg: 'var(--toast-bg, rgba(0,0,0,.85))',
    fg: 'var(--toast-text,#fff)',
  }

  const baseOffset = 12 + index * 8 // small offset for stacked toasts

  const containerStyle = (() => {
    const common = {
      position: 'fixed',
      zIndex: 99999,
      pointerEvents: 'none', // container ignores clicks; toast handles them
    }
    switch (position) {
      case 'top':
        return {
          ...common,
          top: baseOffset,
          left: '50%',
          transform: 'translateX(-50%)',
        }
      case 'bottom':
        return {
          ...common,
          bottom: baseOffset,
          left: '50%',
          transform: 'translateX(-50%)',
        }
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
  })()

  return createPortal(
    <div style={containerStyle} aria-live={ariaLive}>
      <div
        className={`toast ${type}${leaving ? ' toast--hide' : ''}`}
        role="status"
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
          maxWidth: 400,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          transform: `translateX(${drag}px)`,
          transition: 'transform .15s ease, opacity .18s ease',
          opacity: leaving ? 0 : 1,
        }}
      >
        {/* icon */}
        <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
          {type === 'success'
            ? '✅'
            : type === 'error'
              ? '⚠️'
              : type === 'warning'
                ? '🚧'
                : '💬'}
        </span>

        {/* body */}
        <div style={{ flex: 1, fontWeight: 500 }}>{message}</div>

        {/* optional action */}
        {action?.label && (
          <button
            className="toast-action"
            onClick={() => {
              action.onClick?.()
              beginClose()
            }}
            style={{
              background: 'transparent',
              border: '1px solid currentColor',
              color: 'inherit',
              padding: '4px 8px',
              borderRadius: 7,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {action.label}
          </button>
        )}

        {/* close */}
        {dismissible && (
          <button
            ref={closeRef}
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
    document.body
  )
}

/**
 * ToastContainer – renders a list of Toasts (kept separate so the Provider can stay tiny)
 */
export function ToastContainer({ toasts, onClose, position }) {
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
