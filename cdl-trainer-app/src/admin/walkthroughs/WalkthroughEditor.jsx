// Path: /src/admin/walkthroughs/WalkthroughEditor.jsx
// -----------------------------------------------------------------------------
// Admin Walkthrough Editor (hybrid)
// - Visual outline editor (sections/steps)
// - Markdown / CSV paste → parse → preview
// - Optional XLSX upload hook (pluggable)
// - Validates shape before save
//
// Dependencies kept light (React only). Parsing/validation are imported from
// your public data utils so it stays in-sync with the student app schema.
//
// Props:
//   - initialScript?: WalkthroughScript
//   - onSave?: ({ script, source }: {script:any, source:'visual'|'markdown'|'csv'|'xlsx'|'json'}) => void
//   - onCancel?: () => void
//   - parseXlsx?: (file: File) => Promise<{ sections: any[] } | null>   // optional adapter
//
// Notes:
//   • XLSX parsing is pluggable; pass a `parseXlsx` prop wired to SheetJS if desired.
//   • Markdown/CSV parsers expect raw text and return { sections: [...] }.
//   • We store the script locally as a POJO compatible with WalkthroughScript.
//   • This component is intentionally framework-agnostic (no design system).
// -----------------------------------------------------------------------------

import React, { useMemo, useState } from 'react'
import { parseCsv, parseMarkdown, validateWalkthroughs as _validateAll, validateWalkthroughShape } from '@walkthrough-data/utils'

// ----- Small helpers ---------------------------------------------------------

function deepClone(v) {
  return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v))
}
function emptyScript() {
  return [{ section: 'Untitled', steps: [{ script: '' }] }]
}
function ensureScriptShape(maybe) {
  const arr = Array.isArray(maybe) ? maybe : []
  if (!arr.length) return emptyScript()
  return arr.map(sec => ({
    section: String(sec?.section ?? 'Untitled'),
    critical: !!sec?.critical,
    passFail: !!sec?.passFail,
    steps: Array.isArray(sec?.steps)
      ? sec.steps.map(st => ({
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

// Minimal, local validator for a plain WalkthroughScript
function validateScript(script) {
  const problems = []
  if (!Array.isArray(script) || !script.length) {
    problems.push('Script must contain at least one section.')
    return { ok: false, problems }
  }
  script.forEach((sec, si) => {
    if (!sec?.section) problems.push(`Section ${si + 1} is missing a title.`)
    if (!Array.isArray(sec?.steps) || !sec.steps.length) problems.push(`Section "${sec?.section || si + 1}" must have at least one step.`)
    sec.steps?.forEach((st, ti) => {
      if (!st?.script?.trim()) problems.push(`Section "${sec?.section}": step ${ti + 1} is missing script text.`)
      if (st?.passFail && st?.required !== true) {
        problems.push(`Section "${sec?.section}": step ${ti + 1} is pass/fail but not marked required.`)
      }
    })
  })
  return { ok: problems.length === 0, problems }
}

// ----- Component -------------------------------------------------------------

export default function WalkthroughEditor({
  initialScript,
  onSave,
  onCancel,
  parseXlsx, // optional: async (file) => { sections: [...] }
}) {
  // canonical script kept as WalkthroughScript
  const [script, setScript] = useState(() => ensureScriptShape(initialScript || []))
  const [activeTab, setActiveTab] = useState('visual') // 'visual' | 'markdown' | 'csv' | 'upload' | 'json'
  const [rawMd, setRawMd] = useState('')
  const [rawCsv, setRawCsv] = useState('')
  const [rawJson, setRawJson] = useState('')
  const [errors, setErrors] = useState([])

  const validation = useMemo(() => validateScript(script), [script])

  // ---- Visual editor operations --------------------------------------------

  const addSection = () => {
    setScript(s => [...s, { section: 'New Section', steps: [{ script: '' }] }])
  }
  const removeSection = (i) => {
    setScript(s => (s.length <= 1 ? s : s.filter((_, idx) => idx !== i)))
  }
  const updateSectionTitle = (i, title) => {
    setScript(s => {
      const next = deepClone(s)
      next[i].section = title
      return next
    })
  }
  const toggleSecFlag = (i, key) => {
    setScript(s => {
      const next = deepClone(s)
      next[i][key] = !next[i][key]
      return next
    })
  }

  const addStep = (si) => {
    setScript(s => {
      const next = deepClone(s)
      next[si].steps.push({ script: '' })
      return next
    })
  }
  const removeStep = (si, ti) => {
    setScript(s => {
      const next = deepClone(s)
      if (next[si].steps.length <= 1) return next
      next[si].steps.splice(ti, 1)
      return next
    })
  }
  const updateStepField = (si, ti, key, value) => {
    setScript(s => {
      const next = deepClone(s)
      next[si].steps[ti][key] = value
      return next
    })
  }
  const toggleStepFlag = (si, ti, key) => {
    setScript(s => {
      const next = deepClone(s)
      next[si].steps[ti][key] = !next[si].steps[ti][key]
      // nudge: passFail implies required true
      if (key === 'passFail' && next[si].steps[ti].passFail) next[si].steps[ti].required = true
      return next
    })
  }

  // ---- Parsers --------------------------------------------------------------

  const parseFromMarkdown = () => {
    try {
      const out = parseMarkdown(rawMd) // returns { sections, ... }
      const sections = ensureScriptShape(out?.sections)
      setScript(sections)
      setErrors([])
      setActiveTab('visual')
    } catch (e) {
      setErrors([`Markdown parse error: ${e?.message || e}`])
    }
  }

  const parseFromCsv = () => {
    try {
      const out = parseCsv(rawCsv) // returns { sections, ... }
      const sections = ensureScriptShape(out?.sections)
      setScript(sections)
      setErrors([])
      setActiveTab('visual')
    } catch (e) {
      setErrors([`CSV parse error: ${e?.message || e}`])
    }
  }

  const parseFromJson = () => {
    try {
      const obj = JSON.parse(rawJson || 'null')
      const sections = ensureScriptShape(obj?.sections || obj) // accept either shape
      setScript(sections)
      setErrors([])
      setActiveTab('visual')
    } catch (e) {
      setErrors([`JSON parse error: ${e?.message || e}`])
    }
  }

  const handleXlsxFile = async (file) => {
    if (!parseXlsx) {
      setErrors(['XLSX parsing is not enabled in this build. (Wire a parseXlsx prop using SheetJS.)'])
      return
    }
    try {
      const out = await parseXlsx(file) // expected { sections: [...] }
      const sections = ensureScriptShape(out?.sections)
      setScript(sections)
      setErrors([])
      setActiveTab('visual')
    } catch (e) {
      setErrors([`XLSX parse error: ${e?.message || e}`])
    }
  }

  // ---- Save/Cancel ----------------------------------------------------------

  const handleSave = (source = 'visual') => {
    const problems = validateScript(script).problems
    if (problems.length) {
      setErrors(problems)
      return
    }
    onSave?.({ script: deepClone(script), source })
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem' }}>
      <h2>Walkthrough Editor</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        {['visual', 'markdown', 'csv', 'upload', 'json'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #ccc',
              background: activeTab === tab ? '#eef5ff' : '#fff',
              cursor: 'pointer',
            }}
          >
            {tab === 'visual' ? 'Visual' :
             tab === 'markdown' ? 'Markdown' :
             tab === 'csv' ? 'CSV' :
             tab === 'upload' ? 'XLSX Upload' :
             'JSON'}
          </button>
        ))}
      </div>

      {/* Validation / errors */}
      {!validation.ok && activeTab === 'visual' && (
        <div style={{ background: '#fff3f3', border: '1px solid #e8b4b4', padding: 12, borderRadius: 6, marginBottom: 12 }}>
          <strong>Fix before saving:</strong>
          <ul style={{ marginTop: 8 }}>
            {validation.problems.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
      {errors.length > 0 && (
        <div style={{ background: '#fff7e6', border: '1px solid #f0c36d', padding: 12, borderRadius: 6, marginBottom: 12 }}>
          <strong>Parser / Editor messages:</strong>
          <ul style={{ marginTop: 8 }}>
            {errors.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}

      {/* Panels */}
      {activeTab === 'visual' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {script.map((sec, si) => (
            <div key={si} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input
                  value={sec.section}
                  onChange={e => updateSectionTitle(si, e.target.value)}
                  placeholder="Section title"
                  style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={!!sec.critical} onChange={() => toggleSecFlag(si, 'critical')} /> Critical
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={!!sec.passFail} onChange={() => toggleSecFlag(si, 'passFail')} /> Pass/Fail
                </label>
                <button onClick={() => removeSection(si)} disabled={script.length <= 1} style={{ marginLeft: 'auto' }}>
                  Remove Section
                </button>
              </div>

              {sec.steps.map((st, ti) => (
                <div key={ti} style={{ display: 'grid', gap: 6, gridTemplateColumns: '1fr', padding: 8, border: '1px dashed #ddd', borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={st.label || ''}
                      onChange={e => updateStepField(si, ti, 'label', e.target.value)}
                      placeholder="Step label (optional)"
                      style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                    />
                    <button onClick={() => removeStep(si, ti)} disabled={sec.steps.length <= 1}>Remove</button>
                  </div>
                  <textarea
                    value={st.script}
                    onChange={e => updateStepField(si, ti, 'script', e.target.value)}
                    placeholder="Script text…"
                    rows={3}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <label><input type="checkbox" checked={!!st.mustSay}  onChange={() => toggleStepFlag(si, ti, 'mustSay')}  /> mustSay</label>
                    <label><input type="checkbox" checked={!!st.required} onChange={() => toggleStepFlag(si, ti, 'required')} /> required</label>
                    <label><input type="checkbox" checked={!!st.passFail} onChange={() => toggleStepFlag(si, ti, 'passFail')} /> passFail</label>
                    <label><input type="checkbox" checked={!!st.skip}     onChange={() => toggleStepFlag(si, ti, 'skip')}     /> skip</label>
                  </div>
                </div>
              ))}

              <button onClick={() => addStep(si)}>+ Add Step</button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addSection}>+ Add Section</button>
            <button onClick={() => handleSave('visual')} disabled={!validation.ok} style={{ marginLeft: 'auto' }}>
              Save Walkthrough
            </button>
            {onCancel && <button onClick={onCancel}>Cancel</button>}
          </div>
        </div>
      )}

      {activeTab === 'markdown' && (
        <div>
          <p style={{ marginBottom: 8 }}>
            Paste <strong>Markdown</strong> walkthrough (## Section headings, - steps, flags like [must], [required], [pf], [skip]).
          </p>
          <textarea
            value={rawMd}
            onChange={e => setRawMd(e.target.value)}
            rows={16}
            placeholder="## Engine Compartment&#10;- **Oil Level:** Check dipstick... [must] [required] [pf]"
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontFamily: 'monospace' }}
          />
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={parseFromMarkdown}>Parse Markdown → Visual</button>
            <button onClick={() => handleSave('markdown')}>Save (use current Visual)</button>
          </div>
        </div>
      )}

      {activeTab === 'csv' && (
        <div>
          <p style={{ marginBottom: 8 }}>
            Paste <strong>CSV</strong> with headers like: section, stepLabel, script, mustSay, required, passFail, skip.
          </p>
          <textarea
            value={rawCsv}
            onChange={e => setRawCsv(e.target.value)}
            rows={16}
            placeholder="section,stepLabel,script,mustSay,required,passFail&#10;Engine Compartment,Oil Level,Check dipstick...,true,true,true"
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontFamily: 'monospace' }}
          />
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={parseFromCsv}>Parse CSV → Visual</button>
            <button onClick={() => handleSave('csv')}>Save (use current Visual)</button>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div>
          <p style={{ marginBottom: 8 }}>
            Upload <strong>.xlsx</strong> (Excel). Expect a sheet with columns like CSV (section, stepLabel, script, ...).
          </p>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={async e => {
              const file = e.target.files?.[0]
              if (file) await handleXlsxFile(file)
            }}
          />
          <div style={{ marginTop: 8 }}>
            <button onClick={() => handleSave('xlsx')}>Save (use current Visual)</button>
          </div>
        </div>
      )}

      {activeTab === 'json' && (
        <div>
          <p style={{ marginBottom: 8 }}>
            Paste <strong>JSON</strong> (either a bare <code>WalkthroughScript</code> array or an object with <code>{{'{'}sections: [...] {'}'}}</code>).
          </p>
          <textarea
            value={rawJson}
            onChange={e => setRawJson(e.target.value)}
            rows={16}
            placeholder='[{"section":"Engine Compartment","steps":[{"label":"Oil Level","script":"..."}]}]'
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontFamily: 'monospace' }}
          />
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={parseFromJson}>Parse JSON → Visual</button>
            <button onClick={() => handleSave('json')}>Save (use current Visual)</button>
          </div>
        </div>
      )}
    </div>
  )
}