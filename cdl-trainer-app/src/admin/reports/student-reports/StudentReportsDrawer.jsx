// src/admin/reports/StudentReportDrawer.jsx
// ======================================================================
// StudentReportDrawer
// - Displays a single student's completion summary
// - Actions: Copy JSON, Download CSV row, Print/Save as PDF
// - A11y: focus trap-lite, Esc to close, backdrop click to close
// - Perf: lazily imports builder/utils with safe fallbacks
// ======================================================================

import PropTypes from 'prop-types'
import React from 'react'

import useToast from '@components/useToast.js'

import styles from './StudentReportDrawer.module.css'

/* --------------------------- lazy helpers --------------------------- */
// We prefer the central index if present; otherwise fall back to files.
async function loadStudentReportMods() {
  try {
    const mod = await import('@admin/reports/student-reports/index.js')
    return {
      buildCertPayload: mod.buildCertPayload || mod.buildCertTemplate || null,
      buildTprCsvRow: mod.buildTprCsvRow || null,
      toCsv: mod.toCsv || null,
      csvFromCert: mod.csvFromCert || null,
      openPrintableCert: mod.openPrintableCert || null,
      downloadCsv: mod.downloadCsv || null,
      copy: mod.copy || null,
    }
  } catch {
    // Fallback to direct files (still split)
    const [tpl, pdf] = await Promise.allSettled([
      import('@admin/reports/student-reports/cert-template.js'),
      import('@admin/reports/student-reports/pdf-utils.js'),
    ])
    const t = tpl.status === 'fulfilled' ? tpl.value : {}
    const p = pdf.status === 'fulfilled' ? pdf.value : {}
    return {
      buildCertPayload: t.buildCertPayload || t.buildCertTemplate || null,
      buildTprCsvRow: t.buildTprCsvRow || null,
      toCsv: t.toCsv || null,
      csvFromCert: p.csvFromCert || null,
      openPrintableCert: p.openPrintableCert || null,
      downloadCsv: p.downloadCsv || null,
      copy: p.copy || null,
    }
  }
}

/* ------------------------------ fallback builder ------------------------------ */
// Small, dependency-free fallback so the drawer remains usable even if helpers fail to load.
const S = v => (v == null ? '' : String(v))
const normalizeStudent = (s = {}) => {
  const first = S(s.firstName || s.first_name)
  const last = S(s.lastName || s.last_name)
  const full = S(s.fullName || s.name || `${first} ${last}`.trim())
  return {
    ...s,
    firstName: first || undefined,
    lastName: last || undefined,
    fullName: full || undefined,
    dob: S(s.dob || s.dateOfBirth || s.birthDate) || '',
    clpNumber: S(s.clpNumber || s.licenseNumber || s.clp || s.license) || '',
    clpState: S(s.clpState || s.licenseState || s.state) || '',
    licenseNumber: S(s.licenseNumber || s.clpNumber) || '',
    licenseState: S(s.licenseState || s.clpState) || '',
  }
}
const normalizeTraining = (t = {}) => ({
  classType:
    S(t.classType || t.class || t.program || 'A')
      .replace(/^class\s*/i, '')
      .toUpperCase() || 'A',
  endorsement: S(t.endorsement || '').toUpperCase(),
  completionDate: S(t.completionDate || t.completedAt || ''),
  theory: {
    completed: !!(t.theory?.completed ?? t.theoryCompleted),
    completedAt: S(t.theory?.completedAt || t.theoryCompletedAt || ''),
  },
  btw: {
    completed: !!(
      t.btw?.completed ??
      t.behindTheWheelCompleted ??
      t.rangeCompleted
    ),
    completedAt: S(t.btw?.completedAt || t.btwCompletedAt || ''),
    rangeHours: Number(t.btw?.rangeHours ?? t.rangeHours ?? 0) || 0,
    publicRoadHours: Number(t.btw?.publicRoadHours ?? t.roadHours ?? 0) || 0,
  },
})
const normalizeProvider = (p = {}) => ({
  name: S(p.name || p.providerName || 'Training Provider'),
  tprId: S(
    p.tprId || (typeof window !== 'undefined' && window.__TPR_ID__) || ''
  ),
  tin: S(p.tin || p.taxId || ''),
})
function fallbackBuildCert({ student, provider, training }) {
  const s = normalizeStudent(student)
  const t = normalizeTraining(training)
  const pr = normalizeProvider(provider)
  return {
    trainee: {
      fullName: s.fullName,
      dob: s.dob,
      clpNumber: s.clpNumber || s.licenseNumber,
      clpState: s.clpState || s.licenseState,
      licenseNumber: s.licenseNumber || s.clpNumber,
      licenseState: s.licenseState || s.clpState,
      email: S(s.email || ''),
    },
    training: t,
    provider: pr,
  }
}

/* ------------------------------ component ------------------------------ */

/**
 * @param {{
 *   open?: boolean,
 *   student: any,
 *   provider: any,
 *   training: any,
 *   schoolId?: string,
 *   onClose?: () => void,
 * }} props
 */
function StudentReportDrawer({
  _open = true,
  student,
  provider,
  training,
  schoolId, // currently unused, but forwarded to build if your template needs it
  onClose,
}) {
  const toast = useToast()
  const overlayRef = React.useRef(null)
  const panelRef = React.useRef(null)
  const lastFocusedRef = React.useRef(null)
  const reduceMotion = usePrefersReducedMotion()
  const [entered, setEntered] = React.useState(false)

  // Lazy-loaded helpers (with safe fallbacks)
  const [mods, setMods] = React.useState({
    buildCertPayload: null,
    buildTprCsvRow: null,
    toCsv: null,
    csvFromCert: null,
    openPrintableCert: null,
    downloadCsv: null,
    copy: null,
  })

  React.useEffect(() => {
    let alive = true
    loadStudentReportMods().then(m => {
      if (alive) setMods(m)
    })
    return () => {
      alive = false
    }
  }, [])

  // Build + guard certificate payload
  const { cert, issues } = React.useMemo(() => {
    try {
      const build = mods.buildCertPayload || (args => fallbackBuildCert(args))
      const c = build({ student, provider, training, schoolId })
      const problems = validateCert(c)
      return { cert: c, issues: problems }
    } catch (err) {
      return { cert: null, issues: [String(err?.message || err)] }
    }
  }, [mods.buildCertPayload, student, provider, training, schoolId])

  const titleId = React.useId()

  // Close helpers
  const close = React.useCallback(() => {
    try {
      onClose?.()
    } finally {
      const el = lastFocusedRef.current
      if (el && typeof el.focus === 'function') el.focus()
    }
  }, [onClose])

  // Mount focus + trap + ESC
  React.useEffect(() => {
    lastFocusedRef.current = document.activeElement
    const id = requestAnimationFrame(() => setEntered(true))

    // focus the close button by default
    const btn = panelRef.current?.querySelector?.('[data-close]')
    btn?.focus?.({ preventScroll: true })

    const onKey = e => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
      if (e.key === 'Tab' && panelRef.current) {
        const f = getFocusable(panelRef.current)
        if (!f.length) return
        const i = f.indexOf(document.activeElement)
        if (e.shiftKey && i <= 0) {
          e.preventDefault()
          f[f.length - 1].focus()
        } else if (!e.shiftKey && i === f.length - 1) {
          e.preventDefault()
          f[0].focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener('keydown', onKey)
      setEntered(false)
    }
  }, [close])

  // Backdrop click to close (ignore clicks inside the panel)
  const onBackdrop = e => {
    if (e.target === overlayRef.current) close()
  }

  /* ------------------------------ actions ------------------------------ */

  const handleCopyJson = async () => {
    if (!cert) return
    try {
      const ok = mods.copy
        ? await mods.copy(JSON.stringify(cert, null, 2))
        : await (async () => {
            if (!navigator?.clipboard?.writeText) return false
            await navigator.clipboard.writeText(JSON.stringify(cert, null, 2))
            return true
          })()
      ok
        ? toast?.success?.('Certificate JSON copied')
        : toast?.error?.('Copy failed')
    } catch {
      toast?.error?.('Copy failed')
    }
  }

  const handleDownloadCsv = () => {
    if (!cert) return
    try {
      const filenameBase = (
        cert?.trainee?.lastName ||
        (cert?.trainee?.fullName || 'student').split(' ').slice(-1)[0] ||
        'student'
      )
        .toLowerCase()
        .replace(/\s+/g, '-')
      const name = `tpr-completion-${filenameBase}.csv`

      // Preferred: helper that ensures BOM + stable headers
      if (mods.csvFromCert) {
        const csv = mods.csvFromCert(cert) // should be BOM-prefixed by helper
        mods.downloadCsv
          ? mods.downloadCsv(csv, name)
          : legacyDownload(csv, name)
        toast?.success?.('CSV downloaded')
        return
      }

      const row = (mods.buildTprCsvRow && mods.buildTprCsvRow(cert)) ||
        // minimal fallback row
        {
          fullName: cert?.trainee?.fullName || '',
          dob: cert?.trainee?.dob || '',
          licenseNumber:
            cert?.trainee?.licenseNumber || cert?.trainee?.clpNumber || '',
          licenseState:
            cert?.trainee?.licenseState || cert?.trainee?.clpState || '',
          classType: cert?.training?.classType || '',
          endorsement: cert?.training?.endorsement || '',
          completionDate: cert?.training?.completionDate || '',
        }
      const headers = Object.keys(row)
      const csvBody =
        (mods.toCsv && mods.toCsv([row], headers)) ||
        // tiny CSV as fallback
        (() => {
          const esc = s => {
            s = String(s ?? '')
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
          }
          return [
            headers.join(','),
            headers.map(h => esc(row[h])).join(','),
          ].join('\r\n')
        })()

      // Ensure Excel-friendly BOM
      const csv = '\uFEFF' + csvBody
      mods.downloadCsv ? mods.downloadCsv(csv, name) : legacyDownload(csv, name)
      toast?.success?.('CSV downloaded')
    } catch {
      toast?.error?.('CSV build failed')
    }
  }

  function legacyDownload(csv, name) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const handlePrint = () => {
    if (!cert) return
    try {
      if (mods.openPrintableCert) mods.openPrintableCert(cert)
      else window?.print?.() // crude fallback
      toast?.info?.(
        'Opened a new tab — use the browser Print dialog to save as PDF.'
      )
    } catch {
      toast?.error?.('Unable to open printable view')
    }
  }

  /* ------------------------------ render ------------------------------ */

  const trainee = cert?.trainee || {}
  const trainingBlock = cert?.training || {}
  const providerBlock = cert?.provider || provider || {}

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onMouseDown={onBackdrop}
      role="presentation"
      tabIndex="-1"
      style={
        reduceMotion
          ? { backdropFilter: 'none', WebkitBackdropFilter: 'none' }
          : undefined
      }
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`${styles.panel} ${entered ? styles.entered : ''}`}
        style={
          reduceMotion
            ? { transition: 'none', transform: 'none', opacity: 1 }
            : undefined
        }
      >
        {/* Header */}
        <header className={styles.header}>
          <div>
            <div id={titleId} className={styles.title}>
              Student Completion
            </div>
            {trainee?.fullName && (
              <div className={styles.subtitle}>{trainee.fullName}</div>
            )}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btnGhost} btn btn-ghost`}
              onClick={handleCopyJson}
              title="Copy JSON"
              disabled={!cert}
            >
              Copy JSON
            </button>
            <button
              type="button"
              className={`${styles.btnGhost} btn btn-ghost`}
              onClick={handleDownloadCsv}
              title="Download CSV Row"
              disabled={!cert}
            >
              CSV Row
            </button>
            <button
              type="button"
              className={`${styles.btnPrimary} btn btn-primary`}
              onClick={handlePrint}
              title="Print / Save as PDF"
              disabled={!cert}
            >
              Print / PDF
            </button>
            <button
              type="button"
              data-close
              aria-label="Close"
              className={`${styles.btnGhost} btn btn-ghost`}
              onClick={close}
              title="Close"
            >
              ×
            </button>
          </div>
        </header>

        {/* Health bar */}
        {!!issues?.length && (
          <div role="alert" className={styles.alert}>
            <b>Missing or invalid fields:</b>
            <ul className={styles.alertList}>
              {issues.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Identity */}
        <section className={styles.section}>
          <Field label="DOB" value={trainee?.dob} />
          <Field
            label="CLP/CDL #"
            value={trainee?.clpNumber || trainee?.licenseNumber}
          />
          <Field
            label="Issuing State"
            value={trainee?.clpState || trainee?.licenseState}
          />
        </section>

        {/* Training */}
        <section className={styles.section}>
          <Field
            label="Provider"
            value={
              providerBlock
                ? `${providerBlock.name || 'Provider'}${providerBlock.tprId ? ` • TPR ${providerBlock.tprId}` : ''}`
                : '—'
            }
            wide
            strong
          />
          <Field
            label="Class"
            value={
              trainingBlock?.classType
                ? `Class ${trainingBlock.classType}`
                : '—'
            }
          />
          <Field
            label="Endorsement"
            value={trainingBlock?.endorsement || '—'}
          />
          <Field
            label="Completion Date"
            value={trainingBlock?.completionDate || '—'}
          />
          <Field
            label="Theory Completed"
            value={trainingBlock?.theory?.completed ? 'Yes' : 'No'}
          />
          <Field
            label="BTW Completed"
            value={trainingBlock?.btw?.completed ? 'Yes' : 'No'}
          />
        </section>
      </aside>
    </div>
  )
}

StudentReportDrawer.propTypes = {
  _open: PropTypes.bool,
  student: PropTypes.any,
  provider: PropTypes.any,
  training: PropTypes.any,
  schoolId: PropTypes.string,
  onClose: PropTypes.func,
}

/* --------------------------------- Bits ---------------------------------- */

function Field({ label, value, wide = false, strong = false }) {
  return (
    <div className={`${styles.field} ${wide ? styles.fieldWide : ''}`}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={`${styles.fieldValue} ${strong ? styles.strong : ''}`}>
        {value || '—'}
      </div>
    </div>
  )
}
Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
  wide: PropTypes.bool,
  strong: PropTypes.bool,
}

function getFocusable(root) {
  if (!root) return []
  const sel = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')
  return Array.from(root.querySelectorAll(sel))
}

/** Light validation mirroring reporting expectations */
function validateCert(c) {
  if (!c) return ['Certificate could not be built']
  const problems = []
  if (!c?.trainee?.fullName) problems.push('Trainee full name is missing')
  if (!c?.trainee?.dob) problems.push('DOB is missing')
  if (!c?.trainee?.clpNumber && !c?.trainee?.licenseNumber)
    problems.push('CLP/CDL number is missing')
  if (!c?.trainee?.clpState && !c?.trainee?.licenseState)
    problems.push('Issuing state is missing')
  if (!c?.training?.classType)
    problems.push('Training class type (A/B/C) is missing')
  if (!c?.training?.completionDate) problems.push('Completion date is missing')
  if (!c?.provider?.tprId) problems.push('Provider TPR ID is missing')
  return problems
}

function usePrefersReducedMotion() {
  const [pref, setPref] = React.useState(false)
  React.useEffect(() => {
    if (!window.matchMedia) return
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPref(!!m.matches)
    update()
    m.addEventListener?.('change', update)
    return () => m.removeEventListener?.('change', update)
  }, [])
  return pref
}

export default StudentReportDrawer
export { StudentReportDrawer }
