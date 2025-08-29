import PropTypes from 'prop-types'
import React, { memo } from 'react'

import cls from './UpdatesCard.module.css'

/** Safely coerce Firestore Timestamp | Date | ISO into a localized label */
function asDateLabel(input) {
  try {
    const d = input?.toDate ? input.toDate() : new Date(input)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/**
 * UpdatesCard
 * @param {{
 *   loading?: boolean,
 *   error?: string | null,
 *   update?: { content?: string, html?: string, date?: any, href?: string } | null,
 *   onRetry?: () => void
 * }} props
 */
function UpdatesCard({
  loading = false,
  error = null,
  update = null,
  onRetry,
}) {
  const hasLink = !!update?.href

  return (
    <section className={cls.card} aria-labelledby="whats-new-title">
      <header className={cls.header}>
        <h3 id="whats-new-title" className={cls.title}>
          <span aria-hidden>📢</span> What’s New
        </h3>
      </header>

      {/* Loading */}
      {loading && (
        <div className={cls.body} aria-busy="true" aria-live="polite">
          <div className={cls.skeleton} />
          <div className={cls.skeleton} style={{ width: '70%' }} />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className={cls.body} role="alert" aria-live="assertive">
          <div className={cls.errorText}>
            Couldn’t load updates. Try again later.
          </div>
          {typeof onRetry === 'function' && (
            <button type="button" className={cls.retry} onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      )}

      {/* Update present */}
      {!loading && !error && update && (
        <div className={cls.body}>
          <div className={cls.content}>
            {update.html ? (
              <div dangerouslySetInnerHTML={{ __html: update.html }} />
            ) : (
              update.content || '(No details)'
            )}
          </div>

          <div className={cls.meta}>
            <span>{asDateLabel(update.date)}</span>
            {hasLink && (
              <a
                href={update.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cls.cta}
              >
                Learn more <span aria-hidden>↗</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !update && (
        <div className={cls.body}>
          <div className={cls.empty}>No recent updates.</div>
        </div>
      )}
    </section>
  )
}

UpdatesCard.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  update: PropTypes.shape({
    content: PropTypes.string,
    html: PropTypes.string, // optional rich HTML (sanitized upstream)
    date: PropTypes.any, // Firestore Timestamp | Date | ISO string
    href: PropTypes.string, // optional external “learn more” URL
  }),
  onRetry: PropTypes.func,
}

export default memo(UpdatesCard)
