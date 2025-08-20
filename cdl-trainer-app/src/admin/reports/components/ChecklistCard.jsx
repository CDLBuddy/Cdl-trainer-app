//src/admin/reports/components/ChecklistCard.jsx
// Displays the DOT/ELDT checklist + download button
import React from 'react'
import PropTypes from 'prop-types'
import { DOT_CHECKLIST } from '../hooks/useChecklistPdf.js'

export default function ChecklistCard({ onDownload }) {
  return (
    <section className="dashboard-card" style={{ marginBottom: '1.5em' }}>
      <h3>📝 DOT/ELDT Compliance Checklist (Indiana)</h3>
      <ul style={{ marginLeft: '1em', marginTop: '.6em' }}>
        {DOT_CHECKLIST.map((line, i) => <li key={i}>☐ {line}</li>)}
      </ul>
      <small style={{ color: '#77a', display: 'block', marginTop: '0.6em' }}>
        <b>Tip:</b> Use this checklist to ensure your provider stays audit-ready. Export records as needed.
      </small>
      <button className="btn btn-outline" style={{ marginTop: '0.7em' }} onClick={onDownload}>
        ⬇️ Download Checklist (PDF)
      </button>
    </section>
  )
}
ChecklistCard.propTypes = { onDownload: PropTypes.func.isRequired }