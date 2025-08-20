// Path: src/admin/dashboard/components/QuickActions.jsx
// ============================================================================
// QuickActions
// - Dashboard widget offering shortcut buttons to key admin tasks
// - Props:
//     actions: Array<{ label:string, onClick?:fn, to?:string, icon?:string }>
// - Defaults to "Add Company" + "View Reports"
// - Styling: QuickActions.module.css
// ============================================================================

import React, { memo } from 'react'
import { Link } from 'react-router-dom'

import styles from './QuickActions.module.css'

function QuickActions({
  actions = [
    { label: '+ Add Company', to: '/admin/companies/new' },
    { label: 'View Reports', to: '/admin/reports' },
  ],
}) {
  return (
    <section
      className={styles.card}
      aria-label="Quick actions"
      role="region"
      data-widget="quick-actions"
    >
      <header className={styles.header}>
        <h3 className={styles.title}>Quick Actions</h3>
      </header>

      <div className={styles.actions}>
        {actions.map((a, i) => {
          const key = `${a.label}-${i}`
          if (a.to) {
            return (
              <Link
                key={key}
                to={a.to}
                className={styles.actionBtn}
                aria-label={a.label}
              >
                {a.icon ? <span className={`${styles.icon} ${a.icon}`} /> : null}
                <span>{a.label}</span>
              </Link>
            )
          }
          return (
            <button
              key={key}
              type="button"
              onClick={a.onClick}
              className={styles.actionBtn}
              aria-label={a.label}
            >
              {a.icon ? <span className={`${styles.icon} ${a.icon}`} /> : null}
              <span>{a.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default memo(QuickActions)