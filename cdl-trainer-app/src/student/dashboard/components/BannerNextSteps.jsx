// src/student/dashboard/components/BannerNextSteps.jsx
import PropTypes from 'prop-types'
import React, { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { StudentRoutes } from '@navigation/navigation.js'

import cls from './BannerNextSteps.module.css'

/**
 * BannerNextSteps
 * - Shows “All set” success or the next actionable items with deep links.
 * - Keeps strong a11y (role=status, polite live region).
 * - Backwards compatible: { allSet, nextActions, onOpenProfile }.
 */
function BannerNextSteps({
  allSet = false,
  nextActions = [],
  onOpenProfile = () => {},
  max = 5, // cap list to avoid clutter
  ctaText = 'Open Profile',
  className = '',
  'data-testid': testId,
}) {
  const profileUrl = StudentRoutes.profile()

  // Sanitize & slice next actions
  const items = useMemo(() => {
    if (!Array.isArray(nextActions)) return []
    return nextActions
      .filter(x => x && typeof x === 'object' && x.section && x.label)
      .slice(0, Math.max(1, max))
  }, [nextActions, max])

  // Stable key + safe hash for anchors
  const toAnchor = section =>
    `${profileUrl}#${encodeURIComponent(String(section).trim())}`
  const keyFor = (section, label, i) =>
    `${String(section).trim()}__${String(label).trim()}__${i}`

  const variant = allSet ? 'success' : 'info' // styled via data-attribute in CSS

  return (
    <section
      className={`${cls.banner} ${className}`}
      data-variant={variant}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      {allSet ? (
        <div className={cls.row}>
          <span className={cls.badge} aria-hidden>
            ✅
          </span>
          <p className={cls.label}>
            All set! Contact your instructor to schedule behind-the-wheel.
          </p>
        </div>
      ) : (
        <>
          <div className={cls.row}>
            <span className={cls.badge} aria-hidden>
              ➡️
            </span>
            <p className={cls.label}>Next up:</p>
          </div>

          <ul
            className={cls.list}
            aria-label={`Next steps${items.length ? ` (${items.length})` : ''}`}
          >
            {items.length === 0 ? (
              <li className={cls.item}>
                <span className={cls.badge} aria-hidden>
                  •
                </span>
                <span className={cls.label}>Review your profile details.</span>
              </li>
            ) : (
              items.map(({ section, label }, i) => (
                <li key={keyFor(section, label, i)} className={cls.item}>
                  <span className={cls.badge} aria-hidden>
                    {i + 1}
                  </span>
                  <Link className={cls.label} to={toAnchor(section)}>
                    {label}
                  </Link>
                </li>
              ))
            )}
          </ul>

          <div className={cls.row}>
            <button
              type="button"
              className={cls.action}
              onClick={onOpenProfile}
            >
              {ctaText}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

BannerNextSteps.displayName = 'BannerNextSteps'

BannerNextSteps.propTypes = {
  allSet: PropTypes.bool,
  nextActions: PropTypes.arrayOf(
    PropTypes.shape({
      section: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  onOpenProfile: PropTypes.func,
  max: PropTypes.number,
  ctaText: PropTypes.string,
  className: PropTypes.string,
  'data-testid': PropTypes.string,
}

export default memo(BannerNextSteps)
