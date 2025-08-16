// Path: /src/admin/walkthroughs/WalkthroughUpload.jsx
// -----------------------------------------------------------------------------
// WalkthroughUpload (admin import flow)
// - Accepts Markdown / CSV / XLSX / JSON
// - Parses → normalizes → validates → previews basic stats
// - Emits a dataset object on success: { label, classCode, version, script }
// - XLSX parsing is pluggable via the `parseXlsx` prop (wire SheetJS, etc.)
//
// Props:
//   onImported: (dataset: {
//     id?: string
//     label: string
//     classCode: 'A'|'B'|'PASSENGER-BUS'|string
//     version?: number
//     script: Array<{ section: string, steps: Array<{...}> }>
//   }) => void
//   onCancel?: () => void
//   parseXlsx?: (file: File) => Promise<{ sections: any[] } | { sections: any[], label?: string } | null>
//
// Notes:
// - We try both `parseMarkdownToWalkthrough`/`parseMarkdown` and
//   `parseCsvToWalkthrough`/`parseCsv` to stay compatible with your utils barrel.
// - JSON accepts either a dataset-ish object or a bare WalkthroughScript array.
// -----------------------------------------------------------------------------

import React, { useMemo, useRef, useState } from 'react'
import * as WTUtils from '@walkthrough-data/utils'

const parseMarkdownAny =
  WTUtils.parseMarkdownToWalkthrough ||
  WTUtils.parseMarkdown ||
  (() => {
    throw new Error('parseMarkdown not available from @walkthrough-data/utils')
  })

const parseCsvAny =
  WTUtils.parseCsvToWalkthrough ||
  WTUtils.parseCsv ||
  (() => {
    throw new Error('parseCsv not available from @walkthrough-data/utils')
  })

const validateShape =
  WTUtils.validateWalkthroughShape ||
  (() => ({ ok: true, errors: [] }))

const wrap = { maxWidth: 980, margin: '0 auto', padding: 16 }
const row = { display: 'grid', gap: 10 }
const card = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
  background: '#fff',
}
const btn = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
}
const primary = { ...btn, background: '#111827', color: '#fff', borderColor: '#111827' }

export default function WalkthroughUpload({ onImported, onCancel, parseXlsx }) {
  const [tab, setTab] = useState('markdown') // markdown | csv | xlsx | json
  const [label, setLabel] = useState('')
  const [classCode, setClassCode] = useState('A')
  const [version, setVersion] = useState(1)

  const [rawMd, setRawMd] = useState('')
  const [rawCsv, setRawCsv] = useState('')
  const [rawJson, setRawJson] = useState('')
  const [xlsxName, setXlsxName] = useState('')

  const [sections, setSections] = useState([])
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef(null)

  // quick stats
  const stats = useMemo(() => {
    const s = Array.isArray(sections) ? sections : []
    let steps = 0
    let required = 0
    let passFail = 0
    s.forEach((sec) => {
      steps += Array.isArray(sec?.steps) ? sec.steps.length : 0
      sec?.steps?.forEach((st) => {
        if (st?.required) required++
        if (st?.passFail) passFail++
      })
    })
    return { sections: s.length, steps, required, passFail }
  }, [sections])

  function resetFeedback() {
    setErrors([])
  }

  function ensureScriptShape(maybe) {
    if (!Array.isArray(maybe)) return []
    return maybe.map((sec) => ({
      section: String(sec?.section ?? 'Untitled'),
      critical: !!sec?.critical,
      passFail: !!sec?.passFail,
      steps: Array.isArray(sec?.steps)
        ? sec.steps
            .map((st) => {
              const script = String(st?.script ?? '').trim()
              if (!script) return null
              return {
                label: st?.label ? String(st.label) : undefined,
                script,
                mustSay: !!st?.mustSay,
                required: !!st?.required,
                passFail: !!st?.passFail,
                skip: !!st?.skip,
                tags: Array.isArray(st?.tags) ? st.tags.map(String) : undefined,
              }
            })
            .filter(Boolean)
        : [],
    }))
  }

  function validateScript(script) {
    /** @type {string[]} */
    const problems = []
    if (!Array.isArray(script) || script.length === 0) problems.push('No sections found.')
    script.forEach((sec, si) => {
      if (!sec?.section) problems.push(`Section ${si + 1} is missing a title.`)
      if (!Array.isArray(sec?.steps) || sec.steps.length === 0) {
        problems.push(`Section "${sec?.section || si + 1}" has no steps.`)
      } else {
        sec.steps.forEach((st, ti) => {
          if (!st?.script?.trim()) problems.push(`Section "${sec?.section}": step ${ti + 1} is missing script text.`)
          if (st?.passFail && st?.required !== true) {
            problems.push(`Section "${sec?.section}": step ${ti + 1} is pass/fail but not marked required.`)
          }
        })
      }
    })
    return { ok: problems.length === 0, problems }
  }

  // ---------- parsers ----------

  function handleParseMarkdown() {
    resetFeedback()
    try {
      const out = parseMarkdownAny(rawMd || '', { label, classCode, version })
      const secs = ensureScriptShape(out?.sections || out)
      setSections(secs)
      if (!label && out?.label) setLabel(String(out.label))
      if (out?.classCode) setClassCode(String(out.classCode))
      if (out?.version) setVersion(Number(out.version) || 1)
    } catch (e) {
      setErrors([`Markdown parse error: ${e?.message || e}`])
    }
  }

  function handleParseCsv() {
    resetFeedback()
    try {
      const out = parseCsvAny(rawCsv || '', { label, classCode, version })
      const secs = ensureScriptShape(out?.sections || out)
      setSections(secs)
      if (!label && out?.label) setLabel(String(out.label))
      if (out?.classCode) setClassCode(String(out.classCode))
      if (out?.version) setVersion(Number(out.version) || 1)
    } catch (e) {
      setErrors([`CSV parse error: ${e?.message || e}`])
    }
  }

  function handleParseJson() {
    resetFeedback()
    try {
      const obj = JSON.parse(rawJson || 'null')
      let secs = []
      if (Array.isArray(obj)) secs = ensureScriptShape(obj)
      else if (obj && typeof obj === 'object') {
        if (!label && obj.label) setLabel(String(obj.label))
        if (obj.classCode) setClassCode(String(obj.classCode))
        if (obj.version) setVersion(Number(obj.version) || 1)
        secs = ensureScriptShape(obj.sections || [])
      }
      setSections(secs)
    } catch (e) {
      setErrors([`JSON parse error: ${e?.message || e}`])
    }
  }

  async function handleXlsxChange(file) {
    resetFeedback()
    if (!file) return
    setXlsxName(file.name)
    if (!parseXlsx) {
      setErrors([
        'XLSX parsing not wired yet. Provide a parseXlsx prop that returns { sections } (e.g., using SheetJS).',
      ])
      return
    }
    setBusy(true)
    try {
      const out = await parseXlsx(file) // expected { sections, label? }
      const secs = ensureScriptShape(out?.sections || [])
      setSections(secs)
      if (!label && out?.label) setLabel(String(out.label))
    } catch (e) {
      setErrors([`XLSX parse error: ${e?.message || e}`])
    } finally {
      setBusy(false)
    }
  }

  // ---------- submit ----------

  function handleImport() {
    const v = validateScript(sections)
    if (!v.ok) return setErrors(v.problems)

    // dataset-level validation (optional, conservative)
    const ds = {
      id: undefined,
      label: label || `(Untitled) ${classCode}`,
      classCode,
      version: Number(version || 1) || 1,
      sections,
    }
    const shape = validateShape(ds)
    if (!shape.ok) {
      return setErrors(shape.errors || ['Dataset failed validation.'])
    }
    onImported?.({
      label: ds.label,
      classCode: ds.classCode,
      version: ds.version,
      script: ds.sections,
    })
  }

  // ---------- render ----------

  return (
    <div style={wrap}>
      <h2 style={{ marginBottom: 12 }}>Import Walkthrough</h2>

      {/* metadata */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 140px 120px', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional label (e.g., “East Campus – Class A”)"
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Class</label>
            <select
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
            >
              <option value="A">Class A</option>
              <option value="B">Class B</option>
              <option value="PASSENGER-BUS">Passenger Bus</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Version</label>
            <input
              type="number"
              min={1}
              value={version}
              onChange={(e) => setVersion(Number(e.target.value || 1))}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['markdown', 'csv', 'xlsx', 'json'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              ...btn,
              background: tab === t ? '#eef2ff' : '#fff',
              borderColor: tab === t ? '#c7d2fe' : '#d1d5db',
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* inputs */}
      {tab === 'markdown' && (
        <div style={{ ...card, ...row }}>
          <p style={{ margin: 0, color: '#374151' }}>
            Paste <strong>Markdown</strong> with <code>## Section</code> and <code>- Step</code> lines.
            Flags like <code>[must]</code>, <code>[required]</code>, <code>[pf]</code>, <code>[skip]</code> are supported.
          </p>
          <textarea
            rows={14}
            value={rawMd}
            onChange={(e) => setRawMd(e.target.value)}
            placeholder={`## Engine Compartment\n- **Oil Level:** Check dipstick… [must] [required] [pf]`}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontFamily: 'monospace',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleParseMarkdown} style={btn}>
              Parse Markdown
            </button>
          </div>
        </div>
      )}

      {tab === 'csv' && (
        <div style={{ ...card, ...row }}>
          <p style={{ margin: 0, color: '#374151' }}>
            Paste <strong>CSV</strong> with headers like{' '}
            <code>section, stepLabel, script, mustSay, required, passFail, skip</code>.
          </p>
          <textarea
            rows={14}
            value={rawCsv}
            onChange={(e) => setRawCsv(e.target.value)}
            placeholder={`section,stepLabel,script,mustSay,required,passFail,skip\nEngine Compartment,Oil Level,Check dipstick…,true,true,true,false`}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontFamily: 'monospace',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleParseCsv} style={btn}>
              Parse CSV
            </button>
          </div>
        </div>
      )}

      {tab === 'xlsx' && (
        <div style={{ ...card, ...row }}>
          <p style={{ margin: 0, color: '#374151' }}>
            Upload an <strong>.xlsx</strong> file. The first sheet should contain columns compatible
            with the CSV headers above. (Requires wiring a <code>parseXlsx</code> prop.)
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => handleXlsxChange(e.target.files?.[0] || null)}
            />
            {xlsxName && <span style={{ color: '#6b7280' }}>{xlsxName}</span>}
            {busy && <span style={{ color: '#6b7280' }}>Parsing…</span>}
          </div>
        </div>
      )}

      {tab === 'json' && (
        <div style={{ ...card, ...row }}>
          <p style={{ margin: 0, color: '#374151' }}>
            Paste <strong>JSON</strong>. Accepts either a dataset object (
            <code>{'{'}label, classCode, version, sections[]}{'}'}</code>) or a bare{' '}
            <code>sections[]</code> array.
          </p>
          <textarea
            rows={14}
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            placeholder={`{"label":"Class A – School","classCode":"A","version":1,"sections":[{"section":"Engine Compartment","steps":[{"label":"Oil Level","script":"Check dipstick…"}]}]}`}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontFamily: 'monospace',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleParseJson} style={btn}>
              Parse JSON
            </button>
          </div>
        </div>
      )}

      {/* feedback */}
      {errors.length > 0 && (
        <div style={{ ...card, borderColor: '#fecaca', background: '#fff7ed' }}>
          <strong>Issues:</strong>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* preview summary */}
      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700 }}>{stats.sections}</div>
          <div style={{ color: '#6b7280' }}>sections</div>
          <div style={{ fontWeight: 700, marginLeft: 12 }}>{stats.steps}</div>
          <div style={{ color: '#6b7280' }}>steps</div>
          <div style={{ fontWeight: 700, marginLeft: 12 }}>{stats.required}</div>
          <div style={{ color: '#6b7280' }}>required</div>
          <div style={{ fontWeight: 700, marginLeft: 12 }}>{stats.passFail}</div>
          <div style={{ color: '#6b7280' }}>pass/fail</div>
          <div style={{ marginLeft: 'auto', color: '#6b7280' }}>
            Parsed preview only — use “Import” to create a draft.
          </div>
        </div>
      </div>

      {/* actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={btn}>
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleImport}
          style={primary}
          disabled={!Array.isArray(sections) || sections.length === 0}
        >
          Import as Draft
        </button>
      </div>
    </div>
  )
}