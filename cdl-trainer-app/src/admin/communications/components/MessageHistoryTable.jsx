// Path: src/admin/communications/components/MessageHistoryTable.jsx
import React from 'react'

import styles from './MessageHistoryTable.module.css'

export default function MessageHistoryTable() {
  return (
    <section className={styles.card}>
      <h3>📜 Message History</h3>
      {/* TODO: table of previously sent announcements */}
      <p className={styles.placeholder}>[Message history table goes here]</p>
    </section>
  )
}