// src/superadmin/WalkthroughManager.jsx
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import React, { useEffect, useMemo, useState } from 'react'

import Shell from '@components/Shell.jsx'
import { useToast } from '@components/ToastContext.js' // case/extension exact
import { db, auth } from '@utils/firebase.js'

import {
  // defaults helpers (from src/walkthrough-data/defaults/index.js)
  getDefaultWalkthroughByClass,
  // global helpers (from src/walkthrough-data/index.js)
  getWalkthroughLabel,
  resolveWalkthrough, // re-exported from walkthrough-data/index.js
} from '../walkthrough-data'

// Use CDL class *codes* as the selector values.
// These work with both getDefaultWalkthroughByClass and resolveWalkthrough.
const CLASS_TOKENS = ['A', 'A-WO-AIR-ELEC', 'A-WO-HYD-ELEC', 'B', 'PASSENGER-BUS']

/** Lightweight validator so we can guard before saving */
function validateScript(script) {
  const problems = []
  if (!Array.isArray(script)) problems.push('Top-level must be an array of sections.')
  else {
    script.forEach((sec, si) => {
      if (!sec || typeof sec !== 'object') problems.push(`Section[${si}] must be an object.`)
      if (!sec?.section || typeof sec.section !== 'string')
        problems.push(`Section[${si}] is missing "section" (string).`)
      if (!Array.isArray(sec?.steps)) problems.push(`Section[${si}].steps must be an array.`)
      else {
        sec.steps.forEach((st, ti) => {
          if (!st || typeof st !== 'object')
            problems.push(`Section[${si}].steps[${ti}] must be an object.`)
          if (typeof st.script !== 'string' || !st.script.trim())
            problems.push(`Section[${si}].steps[${ti}] is missing "script" (string).`)
          ;['mustSay', 'required', 'passFail', 'skip'].forEach(k => {
            if (k in st && typeof st[k] !== 'boolean')
              problems.push(`Section[${si}].steps[${ti}].${k} must be boolean if present.`)
          })
        })
      }
    })
  }
  return { ok: problems.length === 0, problems }
}

/** Small, read-only counts for quick sanity checks */
function countItems(script) {
  if (!Array.isArray(script)) return { sections: 0, steps: 0 }
  const sections = script.length
  const steps = script.reduce((acc, s) => acc + (Array.isArray(s?.steps) ? s.steps.length : 0), 0)
  return { sections, steps }
}

export default function WalkthroughManager() {
  const { showToast } = useToast()

  const [schools, setSchools] = useState([])
  const [schoolId, setSchoolId] = useState('')
  const [classToken, setClassToken] = useState(CLASS_TOKENS[0])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [customDocMeta, setCustomDocMeta] = useState(null)
  const [jsonText, setJsonText] = useState('') // editor source
  const [parseErr, setParseErr] = useState('')
  const [validation, setValidation] = useState({ ok: true, problems: [] })

  // Defaults (readonly)
  const defaultScript = useMemo(
    () => getDefaultWalkthroughByClass(classToken),
    [classToken]
  )
  const defaultCounts = useMemo(() => countItems(defaultScript), [defaultScript])

  // Derived preview of editor JSON
  const parsedEditorScript = useMemo(() => {
    try {
      if (!jsonText.trim()) return null
      return JSON.parse(jsonText)
    } catch {
      return null
    }
  }, [jsonText])

  const editorCounts = useMemo(() => countItems(parsedEditorScript), [parsedEditorScript])

  // 1) Load schools for picker (name + id) — run once
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const snaps = await getDocs(collection(db, 'schools'))
        if (!alive) return
        const rows = snaps.docs.map(d => ({ id: d.id, ...(d.data() || {}) }))
        rows.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)))
        setSchools(rows)
        if (!schoolId && rows[0]) setSchoolId(rows[0].id)
      } catch (e) {
        console.error(e)
        showToast('Failed to load schools.', 'error')
      }
    })()
    return () => { alive = false }
  }, [schoolId, showToast]) // only once

  // 2) Load current custom for school+class
  useEffect(() => {
    if (!schoolId || !classToken) return
    let alive = true
    ;(async () => {
      setLoading(true)
      setParseErr('')
      setValidation({ ok: true, problems: [] })
      try {
        const ref = doc(db, 'schools', schoolId, 'walkthroughs', classToken)
        const snap = await getDoc(ref)
        if (!alive) return

        if (snap.exists()) {
          const data = snap.data() || {}
          setCustomDocMeta({
            updatedAt: data?.updatedAt || null,
            updatedBy: data?.updatedBy || null,
            isCustom: true,
          })
          setJsonText(JSON.stringify(data.script || [], null, 2))
        } else {
          setCustomDocMeta(null)
          // No custom yet → seed editor with default for convenience
          setJsonText(JSON.stringify(defaultScript || [], null, 2))
        }
      } catch (e) {
        console.error(e)
        showToast('Failed to load walkthrough.', 'error')
      } finally {
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [schoolId, classToken, defaultScript, showToast])

  // 3) Parse + validate on change
  useEffect(() => {
    if (!jsonText.trim()) { setParseErr(''); setValidation({ ok: true, problems: [] }); return }
    try {
      const obj = JSON.parse(jsonText)
      setParseErr('')
      setValidation(validateScript(obj))
    } catch (e) {
      setParseErr(e.message || 'Invalid JSON')
      setValidation({ ok: false, problems: [] })
    }
  }, [jsonText])

  async function save() {
    if (parseErr) {
      showToast('Fix JSON errors before saving.', 'error')
      return
    }
    if (!validation.ok) {
      showToast('Please resolve validation problems before saving.', 'error')
      return
    }
    try {
      setSaving(true)
      const ref = doc(db, 'schools', schoolId, 'walkthroughs', classToken)
      const editorScript = JSON.parse(jsonText)
      const nowIso = new Date().toISOString()
      await setDoc(ref, {
        script: editorScript,
        updatedAt: nowIso,
        updatedBy: auth?.currentUser?.email || 'superadmin',
        source: 'superadmin-ui',
        version: 1,
      }, { merge: true })
      setCustomDocMeta({
        updatedAt: nowIso,
        updatedBy: auth?.currentUser?.email || 'superadmin',
        isCustom: true,
      })
      showToast('Walkthrough saved.')
    } catch (e) {
      console.error(e)
      showToast('Failed to save walkthrough.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function resetToDefault() {
    setJsonText(JSON.stringify(defaultScript || [], null, 2))
    showToast('Editor reset to default.')
  }

  async function previewResolved() {
    try {
      const res = await resolveWalkthrough({
        classType: classToken,     // CDL code
        schoolId,
        preferCustom: true,
        softFail: true,
      })
      if (!res?.script) {
        showToast('No walkthrough resolved (check defaults? custom?)', 'error')
        return
      }
      const { sections, steps } = countItems(res.script)
      showToast(`Resolved script (${res.isCustom ? 'custom' : 'default'}): ${sections} sections, ${steps} steps.`)
    } catch (e) {
      console.error(e)
      showToast('Resolver failed. See console.', 'error')
    }
  }

  return (
    <Shell title="Walkthrough Manager">
      <div style={{ display: 'grid', gap: 14 }}>
        {/* Controls */}
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div>
            <label className="label" htmlFor="school-select">School</label>
            <select
              id="school-select"
              className="input"
              value={schoolId}
              onChange={e => setSchoolId(e.target.value)}
            >
              {schools.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="class-select">Class</label>
            <select
              id="class-select"
              className="input"
              value={classToken}
              onChange={e => setClassToken(e.target.value)}
            >
              {CLASS_TOKENS.map(tok => (
                <option key={tok} value={tok}>
                  {getWalkthroughLabel(tok)} ({tok})
                </option>
              ))}
            </select>
          </div>
          <div style={{ alignSelf: 'end', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn outline" onClick={resetToDefault} disabled={loading}>Reset to Default</button>
            <button className="btn outline" onClick={previewResolved} disabled={loading}>Preview Resolve</button>
            <button className="btn" onClick={save} disabled={loading || saving}>💾 Save</button>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ opacity: .8 }}>
            Default: <b>{defaultCounts.sections}</b> sections / <b>{defaultCounts.steps}</b> steps
          </span>
          <span style={{ opacity: .5 }}>•</span>
          <span style={{ opacity: .8 }}>
            Editor: <b>{editorCounts.sections}</b> sections / <b>{editorCounts.steps}</b> steps
          </span>
          {customDocMeta?.isCustom && (
            <>
              <span style={{ opacity: .5 }}>•</span>
              <span style={{ opacity: .8 }}>
                Last custom: {customDocMeta.updatedAt ? new Date(customDocMeta.updatedAt).toLocaleString() : '—'}
                {customDocMeta.updatedBy ? ` by ${customDocMeta.updatedBy}` : ''}
              </span>
            </>
          )}
        </div>

        {/* Validation state */}
        {parseErr ? (
          <div className="alert-box" role="alert">JSON error: {parseErr}</div>
        ) : !validation.ok ? (
          <div className="alert-box" role="alert">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Validation problems:</div>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {validation.problems.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        ) : (
          <div className="note" style={{ opacity: .75 }}>
            ✓ Structure looks good.
          </div>
        )}

        {/* Editor */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          <label className="label">
            JSON Script for {getWalkthroughLabel(classToken)} ({classToken})
          </label>
          <textarea
            className="input"
            style={{ minHeight: 420, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>
    </Shell>
  )
}
