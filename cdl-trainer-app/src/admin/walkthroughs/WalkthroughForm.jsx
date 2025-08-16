// Path: /src/admin/walkthroughs/WalkthroughForm.jsx
// -----------------------------------------------------------------------------
// WalkthroughForm (structured form editor)
// - Opinionated, keyboard-friendly CRUD for Sections & Steps
// - Supports flags: critical / passFail (section), mustSay / required / passFail / skip (step)
// - Allows reordering sections and steps (move up/down)
// - Emits normalized WalkthroughScript via onChange & onSubmit
//
// Props:
//   initialScript?: WalkthroughScript
//   onChange?: (script) => void
//   onSubmit?: (script) => void
//   onCancel?: () => void
//
// Design notes:
//   • No external UI libs; simple inline styles, accessible labels.
//   • Immutable updates with a tiny deepClone helper to avoid accidental mutation.
//   • Validation is lightweight (ensures titles + non-empty script text).
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from 'react'

// ----- helpers ---------------------------------------------------------------

const dc = (v) =>
  typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v))

const emptyScript = () => [{ section: 'Untitled', steps: [{ script: '' }] }]

function normalizeScript(maybe) {
  const arr = Array.isArray(maybe) ? maybe : []
  if (!arr.length) return emptyScript()
  return arr.map((sec) => ({
    section: String(sec?.section ?? 'Untitled'),
    critical: !!sec?.critical,
    passFail: !!sec?.passFail,
    steps: Array.isArray(sec?.steps) && sec.steps.length
      ? sec.steps.map((st) => ({
          label: st?.label ? String(st.label) : undefined,
          script: String(st?.script ?? ''),
          mustSay: !!st?.mustSay,
          required: !!st?.required,
          passFail: !!st?.passFail,
          skip: !!st?.skip,
          tags: Array.isArray(st?.tags) ? st.tags.map(String) : undefined,
        }))
      : [{ script: '' }],
  }))
}

function validate(script) {
  const problems = []
  if (!Array.isArray(script) || !script.length) {
    problems.push('Add at least one section.')
    return { ok: false, problems }
  }
  script.forEach((sec, si) => {
    if (!sec?.section?.trim()) problems.push(`Section ${si + 1} needs a title.`)
    if (!Array.isArray(sec?.steps) || !sec.steps.length) {
      problems.push(`Section "${sec?.section || si + 1}" must include steps.`)
      return
    }
    sec.steps.forEach((st, ti) => {
      if (!st?.script?.trim()) problems.push(`Step ${ti + 1} in "${sec.section}" needs script text.`)
      if (st?.passFail && st?.required !== true) {
        problems.push(`Step ${ti + 1} in "${sec.section}" is pass/fail – mark it "required".`)
      }
    })
  })
  return { ok: problems.length === 0, problems }
}

// ----- component -------------------------------------------------------------

export default function WalkthroughForm({
  initialScript,
  onChange,
  onSubmit,
  onCancel,
}) {
  const [script, setScript] = useState(() => normalizeScript(initialScript))
  const [touched, setTouched] = useState(false)

  const v = useMemo(() => validate(script), [script])

  useEffect(() => {
    if (touched) onChange?.(script)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script])

  // -- section ops
  const addSection = () =>
    setScript((s) => [...s, { section: 'New Section', steps: [{ script: '' }] }])

  const removeSection = (i) =>
    setScript((s) => (s.length <= 1 ? s : s.filter((_, idx) => idx !== i)))

  const moveSection = (i, dir) =>
    setScript((s) => {
      const next = dc(s)
      const j = i + dir
      if (j < 0 || j >= next.length) return s
      const [row] = next.splice(i, 1)
      next.splice(j, 0, row)
      return next
    })

  const setSectionTitle = (i, title) =>
    setScript((s) => {
      const next = dc(s)
      next[i].section = title
      return next
    })

  const toggleSectionFlag = (i, key) =>
    setScript((s) => {
      const next = dc(s)
      next[i][key] = !next[i][key]
      return next
    })

  // -- step ops
  const addStep = (si) =>
    setScript((s) => {
      const next = dc(s)
      next[si].steps.push({ script: '' })
      return next
    })

  const removeStep = (si, ti) =>
    setScript((s) => {
      const next = dc(s)
      if (next[si].steps.length <= 1) return s
      next[si].steps.splice(ti, 1)
      return next
    })

  const moveStep = (si, ti, dir) =>
    setScript((s) => {
      const next = dc(s)
      const j = ti + dir
      if (j < 0 || j >= next[si].steps.length) return s
      const [row] = next[si].steps.splice(ti, 1)
      next[si].steps.splice(j, 0, row)
      return next
    })

  const setStepField = (si, ti, key, value) =>
    setScript((s) => {
      const next = dc(s)
      next[si].steps[ti][key] = value
      return next
    })

  const toggleStepFlag = (si, ti, key) =>
    setScript((s) => {
      const next = dc(s)
      next[si].steps[ti][key] = !next[si].steps[ti][key]
      if (key === 'passFail' && next[si].steps[ti].passFail) {
        next[si].steps[ti].required = true // nudge
      }
      return next
    })

  // submit
  const handleSubmit = (e) => {
    e?.preventDefault?.()
    setTouched(true)
    if (!v.ok) return
    onSubmit?.(dc(script))
  }

  // ui bits
  const Card = ({ children, style }) => (
    <div
      style={{
        border: '1px solid #e2e2e2',
        borderRadius: 8,
        padding: 12,
        ...style,
      }}
    >
      {children}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Walkthrough Form</h2>

      {!v.ok && touched && (
        <Card style={{ background: '#fff3f3', borderColor: '#f0c2c2' }}>
          <strong>Fix the following:</strong>
          <ul style={{ margin: '8px 0 0 18px' }}>
            {v.problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 16, marginTop: 12 }}>
        {script.map((sec, si) => (
          <Card key={si}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                aria-label={`Section ${si + 1} title`}
                value={sec.section}
                onChange={(e) => {
                  setTouched(true)
                  setSectionTitle(si, e.target.value)
                }}
                placeholder="Section title"
                style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
              />

              <div style={{ display: 'flex', gap: 12, marginLeft: 6 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!sec.critical}
                    onChange={() => {
                      setTouched(true)
                      toggleSectionFlag(si, 'critical')
                    }}
                  />{' '}
                  Critical
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!!sec.passFail}
                    onChange={() => {
                      setTouched(true)
                      toggleSectionFlag(si, 'passFail')
                    }}
                  />{' '}
                  Pass/Fail
                </label>
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => moveSection(si, -1)} title="Move up">↑</button>
                <button type="button" onClick={() => moveSection(si, +1)} title="Move down">↓</button>
                <button type="button" onClick={() => removeSection(si)} disabled={script.length <= 1} title="Remove section">
                  Remove
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              {sec.steps.map((st, ti) => (
                <Card key={ti} style={{ borderStyle: 'dashed' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      aria-label={`Section ${si + 1} step ${ti + 1} label`}
                      value={st.label || ''}
                      onChange={(e) => {
                        setTouched(true)
                        setStepField(si, ti, 'label', e.target.value)
                      }}
                      placeholder="Step label (optional)"
                      style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => moveStep(si, ti, -1)} title="Move up">↑</button>
                      <button type="button" onClick={() => moveStep(si, ti, +1)} title="Move down">↓</button>
                      <button type="button" onClick={() => removeStep(si, ti)} disabled={sec.steps.length <= 1} title="Remove step">
                        Remove
                      </button>
                    </div>
                  </div>

                  <textarea
                    aria-label={`Section ${si + 1} step ${ti + 1} script`}
                    value={st.script}
                    onChange={(e) => {
                      setTouched(true)
                      setStepField(si, ti, 'script', e.target.value)
                    }}
                    placeholder="Script text…"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 8,
                      borderRadius: 6,
                      border: '1px solid #ccc',
                      marginTop: 8,
                      fontFamily: 'inherit',
                    }}
                  />

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!st.mustSay}
                        onChange={() => {
                          setTouched(true)
                          toggleStepFlag(si, ti, 'mustSay')
                        }}
                      />{' '}
                      mustSay
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!st.required}
                        onChange={() => {
                          setTouched(true)
                          toggleStepFlag(si, ti, 'required')
                        }}
                      />{' '}
                      required
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!st.passFail}
                        onChange={() => {
                          setTouched(true)
                          toggleStepFlag(si, ti, 'passFail')
                        }}
                      />{' '}
                      passFail
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!st.skip}
                        onChange={() => {
                          setTouched(true)
                          toggleStepFlag(si, ti, 'skip')
                        }}
                      />{' '}
                      skip
                    </label>
                  </div>
                </Card>
              ))}

              <button type="button" onClick={() => addStep(si)}>+ Add Step</button>
            </div>
          </Card>
        ))}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={addSection}>+ Add Section</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {onCancel && (
              <button type="button" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button type="submit" disabled={!v.ok}>
              Save Walkthrough
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}