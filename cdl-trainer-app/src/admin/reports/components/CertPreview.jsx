//src/admin/reports/components/CertPreview.jsx

import React from 'react'
import PropTypes from 'prop-types'
import styles from './CertPreview.module.css'

// Support either export name from ../student-reports/cert-template.js
// (avoid named-import build errors if only one exists)
import * as tpl from '../student-reports/cert-template.js'

const buildCert =
  (typeof tpl.buildCertTemplate === 'function' && tpl.buildCertTemplate) ||
  (typeof tpl.buildCertPayload === 'function' && tpl.buildCertPayload) ||
  ((x) => x)

export default function CertPreview({
  student,
  training,
  provider,
  compact = false,
  className = '',
}) {
  const cert = React.useMemo(
    () => buildCert({ student, training, provider }) || {},
    [student, training, provider]
  )

  // ---- Normalize a few common fields across possible shapes ----
  const trainee = cert.trainee || cert.student || {}
  const prov    = cert.provider || provider || {}
  const trn     = cert.training || training || {}

  const fullName   = trainee.fullName || [trainee.firstName, trainee.lastName].filter(Boolean).join(' ') || '—'
  const dob        = trainee.dob || trainee.dateOfBirth || '—'
  const licNum     = trainee.licenseNumber || trainee.clpNumber || '—'
  const licState   = trainee.state || trainee.licenseState || trainee.clpState || '—'

  const classType  = trn.classType || cert.classType || 'A'
  const endorsement= trn.endorsement || cert.endorsement || '—'
  const completed  = trn.completionDate || cert.completedAt || '—'
  const program    =
    cert.programType ||
    trn.programType ||
    (trn.btw?.completed && trn.theory?.completed ? 'Both' :
      trn.btw?.completed ? 'BTW' :
      trn.theory?.completed ? 'Theory' : '—')

  const cats       = (cert.categories || trn.categories || []).filter(Boolean)
  const theoryOK   = trn.theory?.completed ?? (cert.theory?.completed ?? false)
  const btwOK      = trn.btw?.completed ?? (cert.btw?.completed ?? false)

  return (
    <section
      role="group"
      aria-label="Training completion preview"
      className={[
        styles.card,
        compact ? styles.compact : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {/* Header */}
      <header className={styles.header}>
        <div>
          <div className={styles.kicker}>Preview</div>
          <h4 className={styles.title}>Training Completion</h4>
        </div>
        <div className={styles.badges}>
          <Badge ok={theoryOK} label="Theory" />
          <Badge ok={btwOK}    label="BTW" />
        </div>
      </header>

      {/* Body */}
      <div className={styles.grid}>
        <Field label="Trainee"   value={fullName} strong />
        <Field label="DOB"       value={dob} />
        <Field label="CLP/CDL #" value={licNum} />
        <Field label="Issuing State" value={licState} />

        <Field label="Program"   value={program} />
        <Field label="Class"     value={`Class ${String(classType).toUpperCase()}`} />
        <Field label="Endorsement" value={endorsement} />
        <Field label="Completed" value={completed} />

        <Field label="Categories" value={cats.length ? cats.join(', ') : '—'} wide />

        <Field
          label="Provider"
          value={`${prov.name || '—'}${prov.tprId ? ` • TPR ${prov.tprId}` : ''}`}
          wide
          strong
        />
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <small className={styles.muted}>
          This is a read-only snapshot for quick review. Use the Student Details drawer for CSV/PDF.
        </small>
      </footer>
    </section>
  )
}

CertPreview.propTypes = {
  student: PropTypes.object,
  training: PropTypes.object,
  provider: PropTypes.object,
  compact: PropTypes.bool,
  className: PropTypes.string,
}

/* ---------------------------- Presentation bits ---------------------------- */

function Field({ label, value, strong = false, wide = false }) {
  return (
    <div className={`${styles.field} ${wide ? styles.fieldWide : ''}`}>
      <div className={styles.label}>{label}</div>
      <div className={`${styles.value} ${strong ? styles.valueStrong : ''}`}>
        {value ?? '—'}
      </div>
    </div>
  )
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
  strong: PropTypes.bool,
  wide: PropTypes.bool,
}

function Badge({ ok, label }) {
  return (
    <span
      className={`${styles.badge} ${ok ? styles.badgeOk : styles.badgeWarn}`}
      aria-label={`${label}: ${ok ? 'complete' : 'incomplete'}`}
    >
      {label}
    </span>
  )
}

Badge.propTypes = {
  ok: PropTypes.bool,
  label: PropTypes.string.isRequired,
}