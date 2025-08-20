// Path: src/admin/communications/components/TemplateList.jsx
import React from 'react'

import styles from './TemplateList.module.css'

export default function TemplateList() {
  return (
    <section className={styles.card}>
      <h3>📑 Message Templates</h3>
      {/* TODO: list of reusable templates */}
      <p className={styles.placeholder}>[Template list goes here]</p>
    </section>
  )
}