// src/communications/components/InboxBell.jsx
import React, { forwardRef, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import cls from './InboxBell.module.css'

const srOnly = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

/**
 * Compact inbox bell with unread badge.
 * - Announces count changes to screen readers.
 * - Forwards refs so parents can focus programmatically.
 */
const InboxBell = forwardRef(function InboxBell(
  {
    count = 0,
    onClick,
    ariaLabel,              // if omitted, we compute a good one
    showZero = false,       // show badge when 0 (e.g., to keep layout stable)
    max = 99,               // 99+ cap
    title,                  // hover title
    className = '',
    id,
    disabled = false,
  },
  ref
) {
  const liveRef = useRef(null)
  const prevCount = useRef(count)

  const hasUnread = showZero ? count >= 0 : count > 0
  const computedLabel = ariaLabel ?? `Open inbox${count ? `, ${count} unread` : ''}`
  const classes = [cls.bell, hasUnread && cls.hasUnread, className].filter(Boolean).join(' ')

  // Announce changes for assistive tech
  useEffect(() => {
    if (prevCount.current !== count && liveRef.current) {
      const text = count ? `${count} unread message${count === 1 ? '' : 's'}` : 'No unread messages'
      liveRef.current.textContent = text
      prevCount.current = count
    }
  }, [count])

  return (
    <button
      id={id}
      type="button"
      ref={ref}
      className={classes}
      onClick={onClick}
      aria-label={computedLabel}
      title={title ?? (count ? `${count} unread` : 'Inbox')}
      disabled={disabled}
    >
      <span className={cls.icon} aria-hidden="true">🔔</span>
      {hasUnread && (
        <span className={cls.badge} aria-hidden="true">
          {count > max ? `${max}+` : count}
        </span>
      )}
      {/* SR-only live region */}
      <span ref={liveRef} style={srOnly} aria-live="polite" aria-atomic="true" />
    </button>
  )
})

InboxBell.propTypes = {
  count: PropTypes.number,
  onClick: PropTypes.func,
  ariaLabel: PropTypes.string,
  showZero: PropTypes.bool,
  max: PropTypes.number,
  title: PropTypes.string,
  className: PropTypes.string,
  id: PropTypes.string,
  disabled: PropTypes.bool,
}

export default InboxBell