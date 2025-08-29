// Path: src/admin/companies/add-student/DrawerShell.jsx
import PropTypes from 'prop-types'
import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import styles from '../AddStudentDrawer.module.css'
import { trapFocus } from '../utils' // from the utils barrel

// Respect prefers-reduced-motion: shorten or disable transitions
function getAnimMs() {
  if (typeof window === 'undefined' || !window.matchMedia) return 240
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 240
}

/**
 * DrawerShell — accessible slide-over container.
 *
 * Props:
 *  - open: boolean
 *  - title: string | ReactNode
 *  - onClose?: () => void
 *  - children: ReactNode
 *  - footer?: ReactNode
 *  - size?: 'sm' | 'md' | 'lg'     (default 'md') maps to CSS widths
 *  - className?: string
 *  - closeOnEsc?: boolean          (default true)
 *  - closeOnScrim?: boolean        (default true)
 *  - initialFocusRef?: React.RefObject<HTMLElement>
 *  - ariaDescribedBy?: string
 */
export default function DrawerShell({
  open = false,
  title,
  onClose,
  children,
  footer = null,
  size = 'md',
  className = '',
  closeOnEsc = true,
  closeOnScrim = true,
  initialFocusRef,
  ariaDescribedBy,
}) {
  const ANIM_MS = useMemo(getAnimMs, [])
  const [render, setRender] = useState(Boolean(open))
  const panelRef = useRef(null)
  const lastActiveRef = useRef(null)
  const titleId = useId() // unique per instance

  // Mount/unmount with animation
  useEffect(() => {
    if (open) {
      setRender(true)
      return
    }
    const t = setTimeout(() => setRender(false), ANIM_MS)
    return () => clearTimeout(t)
  }, [open, ANIM_MS])

  // Scroll lock while open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const { body } = document
    const prev = body.style.overflow
    body.style.overflow = 'hidden'
    return () => {
      body.style.overflow = prev
    }
  }, [open])

  // Focus management + Esc/Tab handling
  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    // record the element that had focus
    lastActiveRef.current = document.activeElement

    // focus target: provided ref or first focusable within
    const toFocus =
      initialFocusRef?.current ||
      panelRef.current?.querySelector(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
    toFocus?.focus?.()

    const onKey = e => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.stopPropagation()
        onClose?.()
      } else if (e.key === 'Tab') {
        trapFocus(e, panelRef.current)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      // restore focus if the opener is still in the document
      const el = lastActiveRef.current
      if (el && typeof document !== 'undefined') {
        try {
          if (document.contains(el)) el.focus()
        } catch {
          /* ignore */
        }
      }
    }
  }, [open, onClose, closeOnEsc, initialFocusRef])

  if (!render || typeof document === 'undefined') return null

  const widthClass =
    size === 'sm'
      ? styles.panelSm
      : size === 'lg'
        ? styles.panelLg
        : styles.panelMd

  return createPortal(
    <div className={styles.portalWrap} aria-hidden={!open}>
      {/* Scrim (not focusable; click to close if enabled) */}
      <div
        role="presentation"
        onClick={closeOnScrim ? onClose : undefined}
        className={styles.scrim}
        style={{ opacity: open ? 1 : 0, transitionDuration: `${ANIM_MS}ms` }}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedBy || undefined}
        className={[styles.panel, widthClass, className]
          .filter(Boolean)
          .join(' ')}
        style={{
          transform: `translateX(${open ? '0%' : '100%'})`,
          transitionDuration: `${ANIM_MS}ms`,
        }}
      >
        <header className={styles.header}>
          <h3 id={titleId} className={styles.title}>
            {title}
          </h3>
          {/* Close button for mouse/touch users */}
          <button
            type="button"
            className="btn icon outline"
            aria-label="Close"
            onClick={() => onClose?.()}
          >
            ✕
          </button>
        </header>

        <div className={styles.body}>{children}</div>

        {footer ? <footer className={styles.footerBar}>{footer}</footer> : null}
      </aside>
    </div>,
    document.body
  )
}

DrawerShell.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.node.isRequired,
  onClose: PropTypes.func,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  closeOnEsc: PropTypes.bool,
  closeOnScrim: PropTypes.bool,
  initialFocusRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ariaDescribedBy: PropTypes.string,
}
