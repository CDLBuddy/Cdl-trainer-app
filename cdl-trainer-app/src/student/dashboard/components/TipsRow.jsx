import React from 'react'

import styles from '../dashboard.module.css'

export default function TipsRow() {
  return (
    <section className={styles.tipsRow} aria-label="Helpful tips">
      <article className={styles.tipCard}>
        <h3 className={styles.tipTitle}>Study Tip</h3>
        <div className={styles.tipBody}>
          Say each step of the <b>three-point brake check</b> out loud during practice. It sticks.
        </div>
      </article>
      <article className={styles.tipCard}>
        <h3 className={styles.tipTitle}>Pro Tip</h3>
        <div className={styles.tipBody}>
          Use <b>Flashcards</b> when you have 5 minutes—on the bus, in line, wherever.
        </div>
      </article>
    </section>
  )
}