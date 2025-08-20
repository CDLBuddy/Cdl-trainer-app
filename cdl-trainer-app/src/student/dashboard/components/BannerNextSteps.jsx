import React from 'react'
import { Link } from 'react-router-dom'

import { StudentRoutes } from '@navigation/navigation.js'

import styles from '../dashboard.module.css'

export default function BannerNextSteps({ allSet, nextActions, onOpenProfile }) {
  return (
    <section
      className={`${styles.banner} ${allSet ? styles.bannerSuccess : styles.bannerInfo}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.bannerIcon} aria-hidden>{allSet ? '✅' : '➡️'}</div>
      <div className={styles.bannerText}>
        {allSet ? (
          'All set! Contact your instructor to schedule BTW.'
        ) : (
          <>
            Next up:
            <ul className={styles.nextList}>
              {nextActions.length === 0 ? (
                <li>Review your profile details.</li>
              ) : nextActions.map(({ section, label }) => (
                <li key={section}>
                  <Link to={`${StudentRoutes.profile()}#${section}`} className={styles.nextLink}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {!allSet && (
        <button type="button" className={styles.bannerCta} onClick={onOpenProfile}>
          Open Profile
        </button>
      )}
    </section>
  )
}