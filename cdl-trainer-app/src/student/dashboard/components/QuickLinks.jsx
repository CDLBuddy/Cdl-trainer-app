// src/student/dashboard/components/QuickLinks.jsx
import React, { memo, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import cls from './QuickLinks.module.css'

/**
 * QuickLinks — compact row of actions.
 *
 * Each item may be:
 *  - internal route:  { to: '/student/profile', label: 'Profile', icon?: node }
 *  - external URL:    { href: 'https://fmcsa.dot.gov', label: 'FMCSA', icon?: node }
 *  - you can still pass `to` for external + set `external: true` (compat)
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
    return items
      .filter(Boolean)
      .map((it) => {
        // normalize fields
        const href = it.href || it.to || ''
        const isAbsolute = /^https?:\/\//i.test(href)
        const isProto = /^(mailto:|tel:)/i.test(href)

        // if caller didn't force external, infer from URL
        const external = it.external ?? isAbsolute || isProto

        // default new tab: yes for http(s) externals, no for mailto/tel (unless caller opts in)
        const newTab =
          it.newTab !== undefined ? it.newTab : isAbsolute ? true : false

        return {
          ...it,
          href,
          external,
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
        } = it
        const key = id || href || label || Math.random().toString(36).slice(2)

        const Icon = icon ? (
          <span className={cls.icon} aria-hidden>
            {icon}
          </span>
        ) : null

        if (disabled) {
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
              {newTab && <span className={cls.externalMark} aria-hidden>↗</span>}
            </a>
          )
        }

        // Internal (spa route)
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
      to: PropTypes.string,          // internal route OR external URL (compat)
      href: PropTypes.string,        // preferred for external URLs
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