// Path: src/admin/communications/AdminCommunications.jsx
// ============================================================================
// AdminCommunications
// - Entry screen for admin messaging + announcements
// - Composes ComposeForm, QuickAnnounce, TemplateList, MessageHistoryTable
// - Uses hooks (useComposeMessage, useMessageHistory, useTemplates)
// ============================================================================

import React from 'react'

import styles from './AdminCommunications.module.css'
import { ComposeForm, QuickAnnounce, TemplateList, MessageHistoryTable } from './components'

export default function AdminCommunications() {
  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>📢 Communications Center</h2>
      <p className={styles.subhead}>Send announcements, manage templates, and view history.</p>

      <QuickAnnounce />
      <ComposeForm />
      <TemplateList />
      <MessageHistoryTable />
    </div>
  )
}