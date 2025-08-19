// Path: src/admin/companies/add-student/DrawerShell.jsx
import React, { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { trapFocus } from './utils'          // <- from the utils barrel
import styles from './AddStudentDrawer.module.css'

const ANIM_MS = 240

/**
 * DrawerShell — accessible slide-over container.
 *
 * Props:
 *  - open: boolean
 *  - title: string | ReactNode
 *  - onClose?: () => void
 *  - children: ReactNode
 *  - footer?: ReactNode
 *  - size?: 'sm' | 'md' | 'lg'            (default 'md') maps to CSS widths
 *  - className?: string                   extra class on the panel
 *  - closeOnEsc?: boolean                 default true
 *  - closeOnScrim?: boolean               default true
 *  - initialFocusRef?: React.RefObject<HTMLElement> // focuses on open
 *  - ariaDescribedBy?: string             id of descriptive element
 */
export default function DrawerShell({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  className = '',
  closeOnEsc = true,
  closeOnScrim = true,
  initialFocusRef,
  ariaDescribedBy,
}) {
  const [render, setRender] = useState(open)
  const panelRef = useRef(null)
  const lastActiveRef = useRef(null)
  const titleId = useId() // unique per instance

  // Mount/unmount with animation
  useEffect(() => {
    if (open) setRender(true)
    else {
      const t = setTimeout(() => setRender(false), ANIM_MS)
      return () => clearTimeout(t)
    }
  }, [open])

  // Scroll lock while open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Focus management + Esc/Tab handling
  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    // record the element that had focus
    lastActiveRef.current = document.activeElement

    // focus the provided ref (or first focusable inside panel)
    const toFocus = initialFocusRef?.current ||
      panelRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    toFocus?.focus?.()

    const onKey = (e) => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.stopPropagation()
        onClose?.()
      } else if (e.key === 'Tab') {
        trapFocus(e, panelRef.current)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // restore focus if the opener is still in the document
      const el = lastActiveRef.current
      try {
        if (el && document.contains(el)) el.focus()
      } catch { /* noop */ }
    }
  }, [open, onClose, closeOnEsc, initialFocusRef])

  if (!render || typeof document === 'undefined') return null

  // width class based on size
  const widthClass =
    size === 'sm' ? styles.panelSm :
    size === 'lg' ? styles.panelLg :
    styles.panelMd

  return createPortal(
    <div className={styles.portalWrap} aria-hidden={!open}>
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={closeOnScrim ? onClose : undefined}
        tabIndex={-1}
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
        className={[styles.panel, widthClass, className].filter(Boolean).join(' ')}
        style={{
          transform: `translateX(${open ? '0%' : '100%'})`,
          transitionDuration: `${ANIM_MS}ms`,
        }}
      >
        <header className={styles.header}>
          <h3 id={titleId} className={styles.title}>{title}</h3>
        </header>

        <div className={styles.body}>{children}</div>

        <footer className={styles.footerBar}>{footer}</footer>
      </aside>
    </div>,
    document.body
  )
}