// Path: src/admin/communications/components/ComposeForm.jsx
import React from 'react'
import styles from './ComposeForm.module.css'

export default function ComposeForm() {
  return (
    <section className={styles.card}>
      <h3>✍️ Compose Message</h3>
      <form>
        {/* TODO: inputs for subject, body, target audience */}
        <p className={styles.placeholder}>[Compose form goes here]</p>
      </form>
    </section>
  )
}