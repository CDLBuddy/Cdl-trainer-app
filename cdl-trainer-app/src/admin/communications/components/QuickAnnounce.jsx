// Path: src/admin/communications/components/QuickAnnounce.jsx
import React from 'react'

import styles from './QuickAnnounce.module.css'

export default function QuickAnnounce() {
  return (
    <section className={styles.card}>
      <h3>⚡ Quick Announcement</h3>
      {/* TODO: single input + send button */}
      <p className={styles.placeholder}>[Quick announce form goes here]</p>
    </section>
  )
}