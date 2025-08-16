// Path: /src/admin/walkthroughs/WalkthroughPreview.jsx
// -----------------------------------------------------------------------------
// Read-only preview for an admin’s walkthrough prior to submission.
// - Renders sections/steps the same basic way students will see them
// - Lightweight validator highlights obvious issues (missing titles/scripts)
// - Shows quick stats + status chips
// - Emits onClose() and optional onSubmit() actions
//
// Props:
//   item: {
//     id: string
//     label: string
//     classCode: string
//     token?: string
//     version?: number
//     status?: 'draft'|'in-review'|'published'
//     updatedAt?: string
//     script: Array<{ section: string, critical?: boolean, passFail?: boolean,
//                     steps: Array<{ label?: string, script: string,
//                                     mustSay?: boolean, required?: boolean,
//                                     passFail?: boolean, skip?: boolean }> }>
//   }
//   onClose: () => void
//   onSubmit?: (id: string) => void
// -----------------------------------------------------------------------------

import React, { useMemo } from 'react'

const wrap = { maxWidth: 900, margin: '0 auto', padding: 16 }
const header = { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }
const chip = (bg, fg) => ({
  fontSize: 12,
  padding: '2px 8px',
  borderRadius: 999,
  background: bg,
  color: fg,
})
const card = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  background: '#fff',
}
const sectionHdr = { margin: 0, fontSize: 16, fontWeight: 700 }
const ul = { listStyle: 'none', paddingLeft: 0, margin: '8px 0 0 0' }
const li = { padding: '8px 0', borderTop: '1px dashed #e5e7eb' }
const metaRow = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
const kpi = { fontSize: 12, color: '#6b7280' }
const flag = { fontSize: 12, color: '#374151' }
const toolbar = { display: 'flex', gap: 8, marginLeft: 'auto' }
const btn = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
}
const primary = { ...btn, background: '#111827', color: '#fff', borderColor: '#111827' }
const warn = { ...btn, background: '#b45309', color: '#fff', borderColor: '#b45309' }

function titleCase(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

/** Minimal validator for quick feedback (kept in sync with schema-ish rules). */
function validateScript(script) {
  /** @type {string[]} */
  const problems = []
  if (!Array.isArray(script)) {
    problems.push('Script must be an array of sections.')
    return { ok: false, problems }
  }
  script.forEach((sec, si) => {
    if (!sec || typeof sec !== 'object') {
      problems.push(`Section #${si + 1} must be an object.`)
      return
    }
    if (!sec.section || typeof sec.section !== 'string') {
      problems.push(`Section #${si + 1} is missing a title.`)
    }
    if (!Array.isArray(sec.steps)) {
      problems.push(`Section "${sec.section || `#${si + 1}`}" steps must be an array.`)
      return
    }
    if (sec.steps.length === 0) {
      problems.push(`Section "${sec.section || `#${si + 1}`}" has no steps.`)
    }
    sec.steps.forEach((st, ti) => {
      if (!st || typeof st !== 'object') {
        problems.push(`Section "${sec.section || `#${si + 1}`}" step #${ti + 1} must be an object.`)
        return
      }
      if (!st.script || typeof st.script !== 'string') {
        problems.push(
          `Section "${sec.section || `#${si + 1}`}" step #${ti + 1} must include script text.`
        )
      }
      ;['mustSay', 'required', 'passFail', 'skip'].forEach((f) => {
        if (st[f] != null && typeof st[f] !== 'boolean') {
          problems.push(
            `Section "${sec.section || `#${si + 1}`}" step #${ti + 1} flag "${f}" must be boolean.`
          )
        }
      })
    })
  })
  return { ok: problems.length === 0, problems }
}

export default function WalkthroughPreview({ item, onClose, onSubmit }) {
  const script = Array.isArray(item?.script) ? item.script : []
  const stats = useMemo(() => {
    let sections = script.length
    let steps = 0
    let required = 0
    let passFail = 0
    script.forEach((s) => {
      steps += Array.isArray(s.steps) ? s.steps.length : 0
      s.steps?.forEach((st) => {
        if (st?.required) required++
        if (st?.passFail) passFail++
      })
    })
    return { sections, steps, required, passFail }
  }, [script])

  const validation = useMemo(() => validateScript(script), [script])

  const statusStyles =
    item?.status === 'published'
      ? chip('#065f46', '#fff')
      : item?.status === 'in-review'
      ? chip('#1f2937', '#fff')
      : chip('#6b7280', '#fff')

  return (
    <div style={wrap}>
      {/* Header */}
      <div style={header}>
        <h2 style={{ margin: 0 }}>{item?.label || 'Walkthrough Preview'}</h2>
        <span style={statusStyles}>{titleCase(item?.status || 'draft')}</span>
        <span style={chip('#e5e7eb', '#111827')}>{item?.classCode || '—'}</span>
        <span style={{ ...kpi, marginLeft: 6 }}>
          v{Number(item?.version || 1)} • {item?.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}
        </span>
        <div style={toolbar}>
          {onSubmit && (
            <button
              type="button"
              onClick={() => onSubmit(item.id)}
              style={warn}
              title="Send to superadmin for review"
            >
              Submit For Review
            </button>
          )}
          <button type="button" onClick={onClose} style={btn}>
            Close
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ ...card, display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>{stats.sections}</div>
        <div style={kpi}>sections</div>
        <div style={{ fontWeight: 700, marginLeft: 16 }}>{stats.steps}</div>
        <div style={kpi}>steps</div>
        <div style={{ fontWeight: 700, marginLeft: 16 }}>{stats.required}</div>
        <div style={kpi}>required</div>
        <div style={{ fontWeight: 700, marginLeft: 16 }}>{stats.passFail}</div>
        <div style={kpi}>pass/fail</div>
        <div style={{ flex: 1 }} />
        <span
          style={{
            ...(validation.ok ? chip('#ecfdf5', '#065f46') : chip('#fef2f2', '#991b1b')),
            fontWeight: 600,
          }}
        >
          {validation.ok ? 'Looks good' : `${validation.problems.length} issues`}
        </span>
      </div>

      {/* Validation messages */}
      {!validation.ok && (
        <div style={{ ...card, borderColor: '#fecaca', background: '#fff7ed' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Issues to review</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {validation.problems.map((p, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Walkthrough render */}
      {script.map((sec, i) => (
        <section key={`${sec.section}-${i}`} style={card} aria-labelledby={`sec-${i}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 id={`sec-${i}`} style={sectionHdr}>
              {sec.section || `Section ${i + 1}`}
            </h3>
            <div style={metaRow}>
              {sec.critical && <span style={chip('#fee2e2', '#991b1b')}>Critical</span>}
              {sec.passFail && <span style={chip('#e0e7ff', '#3730a3')}>Pass / Fail</span>}
            </div>
          </div>
          <ul style={ul}>
            {(sec.steps || []).map((st, j) => (
              <li key={j} style={li}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 600, minWidth: 28, color: '#9ca3af' }}>{j + 1}.</div>
                  <div style={{ flex: 1 }}>
                    {st.label && (
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{st.label}</div>
                    )}
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{st.script}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {st.mustSay && <span style={chip('#f3f4f6', '#111827')}>Must Say</span>}
                      {st.required && <span style={chip('#ecfdf5', '#065f46')}>Required</span>}
                      {st.passFail && <span style={chip('#e0e7ff', '#3730a3')}>Pass/Fail</span>}
                      {st.skip && <span style={chip('#fef3c7', '#92400e')}>Skip</span>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Footer actions duplication (for long pages) */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        {onSubmit && (
          <button type="button" onClick={() => onSubmit(item.id)} style={primary}>
            Submit For Review
          </button>
        )}
        <button type="button" onClick={onClose} style={btn}>
          Close
        </button>
      </div>
    </div>
  )
}