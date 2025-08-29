//src/student/dashboard/components/TipsRow.jsx
import PropTypes from 'prop-types'
import React, { memo, useMemo } from 'react'

import cls from './TipsRow.module.css'

/** Default content shown when no tips prop is supplied */
const DEFAULT_TIPS = [
  {
    title: 'Study Tip',
    body: (
      <>
        Say each step of the <b>three-point brake check</b> out loud during
        practice. It sticks.
      </>
    ),
    icon: '💡',
  },
  {
    title: 'Pro Tip',
    body: (
      <>
        Use <b>Flashcards</b> when you have 5 minutes—on the bus, in line,
        wherever.
      </>
    ),
    icon: '📚',
  },
]

/**
 * TipsRow
 * Lightweight, accessible tips strip.
 *
 * props:
 *  - tips?: Array<{ title?: string, body: string|ReactNode, icon?: ReactNode }>
 *  - max?: number (how many to show; defaults to 2)
 *  - ariaLabel?: string (for the section landmark)
 */
function TipsRow({ tips = DEFAULT_TIPS, max = 2, ariaLabel = 'Helpful tips' }) {
  const items = useMemo(() => {
    const src = Array.isArray(tips) && tips.length ? tips : DEFAULT_TIPS
    return src.filter(Boolean).slice(0, Math.max(1, max))
  }, [tips, max])

  if (!items.length) return null

  return (
    <section className={cls.row} aria-label={ariaLabel}>
      {items.map((t, i) => (
        <article key={(t.title || '') + i} className={cls.card}>
          <h3 className={cls.title}>
            {t.icon ? (
              <span aria-hidden className={cls.icon}>
                {t.icon}
              </span>
            ) : null}
            <span>{t.title || 'Tip'}</span>
          </h3>

          <div className={cls.body}>
            {typeof t.body === 'string' ? <span>{t.body}</span> : t.body}
          </div>
        </article>
      ))}
    </section>
  )
}

TipsRow.propTypes = {
  tips: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string,
      body: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
      icon: PropTypes.node,
    })
  ),
  max: PropTypes.number,
  ariaLabel: PropTypes.string,
}

export default memo(TipsRow)
