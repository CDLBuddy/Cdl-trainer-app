// src/communications/components/InboxList.jsx
import PropTypes from 'prop-types'
import React, { memo, useMemo } from 'react'

import { useInbox } from '../hooks/useInbox.js'

import cls from './InboxList.module.css'

// Lightweight HTML sanitizer for bodyHtml (keeps basic formatting)
function sanitize(html) {
  if (!html) return ''
  return String(html)
    .replace(/<\s*script/gi, '&lt;script') // strip scripts
    .replace(/on\w+="[^"]*"/gi, '') // strip inline handlers
    .replace(/javascript:/gi, '') // strip JS URLs
}

// Date/time formatting (Firestore Timestamp | Date | string)
function fmtWhen(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

/**
 * InboxList — drop-in announcement feed for any role shell.
 * Props:
 *  - role: "student" | "instructor" | "admin" | "superadmin"
 *  - schoolId?: string
 *  - companyId?: string
 *  - take?: number (default 20)
 *  - title?: string (default "Announcements")
 *  - onItemClick?: (item) => void   // optional click handler
 */
function InboxList({
  role,
  schoolId,
  companyId,
  take = 20,
  title = 'Announcements',
  onItemClick,
}) {
  const {
    items = [],
    loading,
    error,
  } = useInbox({ role, schoolId, companyId, take })
  const empty = useMemo(
    () => !loading && !error && items.length === 0,
    [loading, error, items.length]
  )

  return (
    <section
      className={cls.card}
      aria-labelledby="inbox-title"
      aria-busy={loading ? 'true' : 'false'}
    >
      <header className={cls.cardHeader}>
        <h3 id="inbox-title" className={cls.cardTitle}>
          {title}
        </h3>
      </header>

      <div className={cls.body} role="list" aria-live="polite">
        {loading && (
          <>
            <div className={cls.skelRow}>
              <div className={cls.skelTitle} />
              <div className={cls.skelLine} />
            </div>
            <div className={cls.skelRow}>
              <div className={cls.skelTitle} />
              <div className={cls.skelLine} />
            </div>
            <div className={cls.skelRow}>
              <div className={cls.skelTitle} />
              <div className={cls.skelLine} />
            </div>
          </>
        )}

        {error && <p className={cls.empty}>Couldn’t load announcements.</p>}

        {empty && <p className={cls.empty}>No announcements yet.</p>}

        {!loading &&
          !error &&
          items.map(m => {
            const when = fmtWhen(m.scheduleAt || m.createdAt)
            const clickable = typeof onItemClick === 'function'
            const content = m.bodyText ? (
              <p className={cls.preview}>{m.bodyText}</p>
            ) : m.bodyHtml ? (
              <p
                className={cls.preview}
                dangerouslySetInnerHTML={{ __html: sanitize(m.bodyHtml) }}
              />
            ) : null

            return (
              <article
                key={m.id}
                role="listitem"
                className={`${cls.item} ${!m.readAt ? cls.unread : ''}`}
                onClick={clickable ? () => onItemClick(m) : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={
                  clickable
                    ? e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onItemClick(m)
                        }
                      }
                    : undefined
                }
                aria-label={m.subject || 'Announcement'}
                title={m.subject || 'Announcement'}
              >
                <header className={cls.itemHeader}>
                  <span className={cls.itemTitle}>
                    {m.subject || '(no subject)'}
                  </span>
                  <time
                    className={cls.when}
                    dateTime={new Date(
                      m.createdAt?.toDate?.() ?? m.createdAt ?? Date.now()
                    ).toISOString()}
                  >
                    {when}
                  </time>
                </header>
                {content}
              </article>
            )
          })}
      </div>
    </section>
  )
}

InboxList.propTypes = {
  role: PropTypes.oneOf(['student', 'instructor', 'admin', 'superadmin']),
  schoolId: PropTypes.string,
  companyId: PropTypes.string,
  take: PropTypes.number,
  title: PropTypes.string,
  onItemClick: PropTypes.func,
}

export default memo(InboxList)
