// Path: /src/admin/walkthroughs/WalkthroughPreview.jsx
// -----------------------------------------------------------------------------
// Admin Walkthrough • Read-only preview
// - Mirrors student rendering structure (sections → steps + flags)
// - Lightweight validator for quick red flags before submit
// - Stats, status chips, submit + close actions
// -----------------------------------------------------------------------------

import React, { useMemo } from 'react'

const S = {
  wrap:   { maxWidth: 900, margin: '0 auto', padding: 16 },
  header: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 },
  chip(bg, fg) {
    return { fontSize: 12, padding: '2px 8px', borderRadius: 999, background: bg, color: fg }
  },
  card:   { border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16, background: '#fff' },
  h3:     { margin: 0, fontSize: 16, fontWeight: 700 },
  ul:     { listStyle: 'none', paddingLeft: 0, margin: '8px 0 0 0' },
  li:     { padding: '8px 0', borderTop: '1px dashed #e5e7eb' },
  meta:   { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  kpi:    { fontSize: 12, color: '#6b7280' },
  toolbar:{ display: 'flex', gap: 8, marginLeft: 'auto' },
  btn:    { padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' },
}
const BTN_PRIMARY = { ...S.btn, background: '#111827', color: '#fff', borderColor: '#111827' }
const BTN_WARN    = { ...S.btn, background: '#b45309', color: '#fff', borderColor: '#b45309' }

const safeDate = (v) => {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(+d) ? null : d
}

// Minimal validator (keep in sync with your schema expectations)
function validateScript(script) {
  const problems = []
  if (!Array.isArray(script)) return { ok: false, problems: ['Script must be an array of sections.'] }

  script.forEach((sec, si) => {
    if (!sec || typeof sec !== 'object') { problems.push(`Section #${si + 1} must be an object.`); return }
    if (!sec.section || typeof sec.section !== 'string') problems.push(`Section #${si + 1} is missing a title.`)
    if (!Array.isArray(sec.steps)) { problems.push(`Section "${sec.section || `#${si + 1}`}" steps must be an array.`); return }
    if (sec.steps.length === 0) problems.push(`Section "${sec.section || `#${si + 1}`}" has no steps.`)
    sec.steps.forEach((st, ti) => {
      if (!st || typeof st !== 'object') { problems.push(`Section "${sec.section || `#${si + 1}`}" step #${ti + 1} must be an object.`); return }
      if (!st.script || typeof st.script !== 'string') problems.push(`Section "${sec.section || `#${si + 1}`}" step #${ti + 1} must include script text.`)
      ;['mustSay', 'required', 'passFail', 'skip'].forEach((f) => {
        if (st[f] != null && typeof st[f] !== 'boolean') problems.push(`Section "${sec.section || `#${si + 1}`}" step #${ti + 1} flag "${f}" must be boolean.`)
      })
    })
  })
  return { ok: problems.length === 0, problems }
}

export default function WalkthroughPreview({ item, onClose, onSubmit }) {
  // Defensive guards
  const script = useMemo(() => (Array.isArray(item?.script) ? item.script : []), [item?.script])

  const stats = useMemo(() => {
    let sections = script.length, steps = 0, required = 0, passFail = 0
    script.forEach((s) => {
      const n = Array.isArray(s.steps) ? s.steps.length : 0
      steps += n
      if (n) {
        for (const st of s.steps) {
          if (st?.required) required++
          if (st?.passFail) passFail++
        }
      }
    })
    return { sections, steps, required, passFail }
  }, [script])

  const validation = useMemo(() => validateScript(script), [script])

  const statusStyles =
    item?.status === 'published'
      ? S.chip('#065f46', '#fff')
      : item?.status === 'in-review'
      ? S.chip('#1f2937', '#fff')
      : S.chip('#6b7280', '#fff')

  const updated = safeDate(item?.updatedAt)

  if (!item) {
    return (
      <div style={S.wrap}>
        <div style={{ ...S.card, color: '#6b7280' }}>
          No walkthrough selected.
          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={onClose} style={S.btn}>Back</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <h2 style={{ margin: 0 }}>{item.label || 'Walkthrough Preview'}</h2>
        <span style={statusStyles}>{String(item.status || 'draft').replace('-', ' ')}</span>
        <span style={S.chip('#e5e7eb', '#111827')}>{item.classCode || '—'}</span>
        <span style={{ ...S.kpi, marginLeft: 6 }}>
          v{Number(item?.version || 1)}
          {' • '}
          {updated ? updated.toLocaleString() : '—'}
        </span>
        <div style={S.toolbar}>
          {onSubmit && (
            <button
              type="button"
              onClick={() => onSubmit(item.id)}
              style={BTN_WARN}
              title="Send to superadmin for review"
            >
              Submit For Review
            </button>
          )}
          <button type="button" onClick={onClose} style={S.btn}>Close</button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ ...S.card, display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>{stats.sections}</div><div style={S.kpi}>sections</div>
        <div style={{ fontWeight: 700, marginLeft: 16 }}>{stats.steps}</div><div style={S.kpi}>steps</div>
        <div style={{ fontWeight: 700, marginLeft: 16 }}>{stats.required}</div><div style={S.kpi}>required</div>
        <div style={{ fontWeight: 700, marginLeft: 16 }}>{stats.passFail}</div><div style={S.kpi}>pass/fail</div>
        <div style={{ flex: 1 }} />
        <span
          style={{
            ...(validation.ok ? S.chip('#ecfdf5', '#065f46') : S.chip('#fef2f2', '#991b1b')),
            fontWeight: 600,
          }}
          aria-live="polite"
        >
          {validation.ok ? 'Looks good' : `${validation.problems.length} issues`}
        </span>
      </div>

      {/* Validation messages */}
      {!validation.ok && (
        <div style={{ ...S.card, borderColor: '#fecaca', background: '#fff7ed' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Issues to review</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {validation.problems.map((p, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Render sections */}
      {script.map((sec, i) => {
        const hasSteps = Array.isArray(sec.steps) && sec.steps.length > 0
        return (
          <section key={`${sec.section || 'section'}-${i}`} style={S.card} aria-labelledby={`sec-${i}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 id={`sec-${i}`} style={S.h3}>
                {sec.section || `Section ${i + 1}`}
              </h3>
              <div style={S.meta}>
                {sec.critical && <span style={S.chip('#fee2e2', '#991b1b')}>Critical</span>}
                {sec.passFail && <span style={S.chip('#e0e7ff', '#3730a3')}>Pass / Fail</span>}
              </div>
            </div>

            {!hasSteps ? (
              <div style={{ marginTop: 8, color: '#9ca3af' }}>No steps in this section.</div>
            ) : (
              <ul style={S.ul}>
                {sec.steps.map((st, j) => (
                  <li key={j} style={S.li}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 600, minWidth: 28, color: '#9ca3af' }}>{j + 1}.</div>
                      <div style={{ flex: 1 }}>
                        {st.label && <div style={{ fontWeight: 600, marginBottom: 2 }}>{st.label}</div>}
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{st.script}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          {st.mustSay && <span style={S.chip('#f3f4f6', '#111827')}>Must Say</span>}
                          {st.required && <span style={S.chip('#ecfdf5', '#065f46')}>Required</span>}
                          {st.passFail && <span style={S.chip('#e0e7ff', '#3730a3')}>Pass/Fail</span>}
                          {st.skip && <span style={S.chip('#fef3c7', '#92400e')}>Skip</span>}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      {/* Footer actions (duplicate for long pages) */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        {onSubmit && (
          <button type="button" onClick={() => onSubmit(item.id)} style={BTN_PRIMARY}>
            Submit For Review
          </button>
        )}
        <button type="button" onClick={onClose} style={S.btn}>Close</button>
      </div>
    </div>
  )
}