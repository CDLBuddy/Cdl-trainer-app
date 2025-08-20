// Path: src/admin/dashboard/components/ReportsTiles.jsx
// ============================================================================
// ReportsTiles
// - Dashboard widget linking to key reports
// - Props:
//     reports: Array<{ title:string, description?:string, to:string, icon?:string }>
// - Defaults: sample report tiles
// - Styling: ReportsTiles.module.css
// ============================================================================

import React, { memo } from 'react'
import { Link } from 'react-router-dom'

import styles from './ReportsTiles.module.css'

function ReportsTiles({
  reports = [
    {
      title: 'User Activity',
      description: 'Track logins and training progress',
      to: '/admin/reports/activity',
    },
    {
      title: 'Company Overview',
      description: 'Enrollment and compliance per company',
      to: '/admin/reports/companies',
    },
    {
      title: 'Permit Expirations',
      description: 'Drivers with expiring permits',
      to: '/admin/reports/expiring',
    },
  ],
}) {
  return (
    <section
      className={styles.card}
      aria-label="Reports navigation"
      data-widget="reports-tiles"
    >
      <header className={styles.header}>
        <h3 className={styles.title}>Reports</h3>
      </header>

      <div className={styles.tiles}>
        {reports.map((r, i) => (
          <Link
            key={i}
            to={r.to}
            className={styles.tile}
            aria-label={`Go to ${r.title} report`}
          >
            {r.icon && <span className={`${styles.icon} ${r.icon}`} />}
            <div className={styles.text}>
              <span className={styles.tileTitle}>{r.title}</span>
              {r.description && (
                <span className={styles.tileDesc}>{r.description}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default memo(ReportsTiles)