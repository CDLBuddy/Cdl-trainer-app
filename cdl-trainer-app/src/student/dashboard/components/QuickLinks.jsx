// Path: src/student/dashboard/components/QuickLinks.jsx
import PropTypes from 'prop-types'
import React, { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'

import cls from './QuickLinks.module.css'

/** Very small URL guard: disallow javascript: and data: schemes */
function isSafeUrl(href = '') {
  const v = String(href || '').trim()
  if (!v) return false
  const lower = v.toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return false
  return true
}

/** Infer whether a link is external (http/https/mailto/tel) */
function inferExternal(href = '') {
  const v = String(href || '').trim()
  if (!v) return false
  if (/^(mailto:|tel:)/i.test(v)) return true
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * QuickLinks — compact row of actions.
 *
 * Each item may be:
 *  - internal route:  { to: '/student/profile', label: 'Profile', icon?: node }
 *  - external URL:    { href: 'https://fmcsa.dot.gov', label: 'FMCSA', icon?: node }
 *  - `to` can still be used for externals (compat); we normalize to `href`.
 *
 * Optional per-item props:
 *  - icon?: ReactNode
 *  - external?: boolean         // forces anchor rendering
 *  - newTab?: boolean           // default true for http(s) externals
 *  - disabled?: boolean         // inert pill, aria-disabled
 *  - id?: string                // test id
 *  - title?: string             // hover title / a11y hint
 *  - onClick?: (e) => void      // invoked before navigation (not for disabled)
 *
 * Row props:
 *  - align: 'left' | 'center' | 'right'
 *  - size:  'sm' | 'md' | 'lg'
 *  - wrap:  boolean (allow wrapping on small screens)
 *  - ariaLabel: string (nav landmark label)
 */
function QuickLinks({
  items = [],
  align = 'center',
  size = 'md',
  wrap = true,
  ariaLabel = 'Quick actions',
}) {
  const className = useMemo(
    () =>
      [
        cls.row,
        cls[`a_${align}`] || '',
        cls[`s_${size}`] || '',
        wrap ? '' : cls.noWrap,
      ]
        .filter(Boolean)
        .join(' '),
    [align, size, wrap]
  )

  const safeItems = useMemo(() => {
    if (!Array.isArray(items)) return []
    return items.filter(Boolean).map((it) => {
      const href = it.href || it.to || ''
      const safe = isSafeUrl(href) || !href.startsWith('javascript:')
      const inferredExternal = inferExternal(href)
      const external = it.external ?? inferredExternal
      const isHttp = /^https?:\/\//i.test(href)
      const isProto = /^(mailto:|tel:)/i.test(href)
      const newTab = it.newTab !== undefined ? it.newTab : isHttp ? true : false

      return {
        ...it,
        href,
        safe,
        external: external || isProto,
        newTab,
      }
    })
  }, [items])

  if (safeItems.length === 0) return null

  return (
    <nav className={className} aria-label={ariaLabel}>
      {safeItems.map((it) => {
        const {
          id,
          label,
          icon,
          href,
          external,
          newTab,
          disabled,
          title,
          onClick,
          safe,
        } = it

        // Solid key without Math.random (deterministic for hydration)
        const key = id || href || label

        const Icon =
          icon != null ? (
            <span className={cls.icon} aria-hidden>
              {icon}
            </span>
          ) : null

        // Disabled or unsafe → inert pill (keyboard focus skipped with tabIndex={-1})
        if (disabled || !safe || (!href && !external)) {
          return (
            <span
              key={key}
              className={`${cls.btn} ${cls.isDisabled}`}
              aria-disabled="true"
              role="link"
              tabIndex={-1}
              data-testid={id}
              title={title}
            >
              {Icon}
              <span className={cls.label}>{label}</span>
            </span>
          )
        }

        // External (anchor)
        if (external) {
          return (
            <a
              key={key}
              href={href}
              className={cls.btn}
              target={newTab ? '_blank' : undefined}
              rel={newTab ? 'noopener noreferrer' : undefined}
              data-testid={id}
              title={title}
              onClick={onClick}
            >
              {Icon}
              <span className={cls.label}>{label}</span>
              {newTab && (
                <span className={cls.externalMark} aria-hidden>
                  ↗
                </span>
              )}
            </a>
          )
        }

        // Internal (SPA route)
        return (
          <Link
            key={key}
            to={href}
            className={cls.btn}
            data-testid={id}
            title={title}
            onClick={onClick}
          >
            {Icon}
            <span className={cls.label}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

QuickLinks.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      to: PropTypes.string, // internal route OR external URL (compat)
      href: PropTypes.string, // preferred for external URLs
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      external: PropTypes.bool,
      newTab: PropTypes.bool,
      disabled: PropTypes.bool,
      id: PropTypes.string,
      title: PropTypes.string,
      onClick: PropTypes.func,
    })
  ),
  align: PropTypes.oneOf(['left', 'center', 'right']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  wrap: PropTypes.bool,
  ariaLabel: PropTypes.string,
}

export default memo(QuickLinks)