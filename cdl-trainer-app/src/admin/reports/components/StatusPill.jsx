// src/admin/reports/components/StatusPill.jsx
// ======================================================================
// StatusPill
// - Tiny, themed status chip for counts/labels (info/success/warning/error)
// - Variants: solid (default), soft, outline
// - Sizes: sm (default), md
// - Polymorphic `as` prop (e.g., 'span' | 'button' | 'a' | component)
// - Auto button semantics when onClick is provided
// ======================================================================

import PropTypes from 'prop-types'
import React from 'react'
import styles from './StatusPill.module.css'

function cx(...xs) { return xs.filter(Boolean).join(' ') }

const StatusPill = React.forwardRef(function StatusPill(
  {
    as: As = 'span',
    kind = 'info',           // 'info' | 'success' | 'warning' | 'error'
    label,                   // preferred text
    children,                // fallback text
    title,                   // optional tooltip
    size = 'sm',             // 'sm' | 'md'
    soft = false,            // subtle background
    outline = false,         // outlined style
    showDot = true,          // show leading dot
    className = '',
    ...rest
  },
  ref
) {
  const tone = styles[`kind_${kind}`] || styles.kind_info
  const sz   = styles[`size_${size}`] || styles.size_sm
  const variant = outline ? styles.outline : (soft ? styles.soft : styles.solid)

  const content = label ?? children ?? ''
  const isInteractive = typeof rest.onClick === 'function' || As === 'button' || rest.role === 'button'
  const ariaLabel = rest['aria-label'] || (typeof content === 'string' ? content : undefined)

  // If interactive and not a native button, add minimal button semantics
  const role = !rest.role && isInteractive && As !== 'button' ? 'button' : rest.role
  const tabIndex = (rest.tabIndex ?? (role === 'button' ? 0 : undefined))

  return (
    <As
      ref={ref}
      className={cx(styles.pill, tone, sz, variant, className)}
      title={title || (typeof content === 'string' ? content : undefined)}
      aria-label={ariaLabel}
      role={role}
      tabIndex={tabIndex}
      data-kind={kind}
      data-size={size}
      data-variant={outline ? 'outline' : (soft ? 'soft' : 'solid')}
      {...rest}
    >
      {showDot && <span aria-hidden className={styles.dot} />}
      <span className={styles.text}>{content}</span>
    </As>
  )
})

StatusPill.propTypes = {
  as: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
  kind: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
  label: PropTypes.node,
  children: PropTypes.node,
  title: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md']),
  soft: PropTypes.bool,
  outline: PropTypes.bool,
  showDot: PropTypes.bool,
  className: PropTypes.string,
}

export default React.memo(StatusPill)