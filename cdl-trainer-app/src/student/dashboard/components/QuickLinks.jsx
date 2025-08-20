import React from 'react'
import { Link } from 'react-router-dom'

import styles from '../dashboard.module.css'

export default function QuickLinks({ items }) {
  return (
    <nav className={styles.quickRow} aria-label="Quick actions">
      {items.map(it => (
        <Link key={it.to} to={it.to} className={styles.quickBtn}>
          <span className={styles.quickIcon} aria-hidden>{it.icon}</span>
          <span>{it.label}</span>
        </Link>
      ))}
    </nav>
  )
}