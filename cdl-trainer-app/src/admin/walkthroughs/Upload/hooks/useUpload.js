//src/admin/walkthroughs/Upload/hooks/useUpload.js
import { useMemo, useRef, useState } from 'react'
import {
  parseMarkdownAny,
  parseCsvAny,
  validateShape,
  normalizeClassCode,
  rowsToSections,
  ensureScriptShape,
  validateScript,
} from '../services/uploadUtils.js'

export function useUpload({ onImported, parseXlsx }) {
  const [tab, setTab] = useState('markdown') // markdown | csv | xlsx | json

  // meta
  const [label, setLabel] = useState('')
  const [classCode, setClassCode] = useState('A')
  const [version, setVersion] = useState(1)

  // raw inputs
  const [rawMd, setRawMd] = useState('')
  const [rawCsv, setRawCsv] = useState('')
  const [rawJson, setRawJson] = useState('')
  const [xlsxName, setXlsxName] = useState('')

  // results + feedback
  const [sections, setSections] = useState([])
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef(null) // (kept in case you want to reset input from UI later)

  const stats = useMemo(() => {
    const s = Array.isArray(sections) ? sections : []
    let steps = 0, required = 0, passFail = 0
    for (const sec of s) {
      const arr = Array.isArray(sec?.steps) ? sec.steps : []
      steps += arr.length
      for (const st of arr) {
        if (st?.required) required++
        if (st?.passFail) passFail++
      }
    }
    return { sections: s.length, steps, required, passFail }
  }, [sections])

  const canImport = Array.isArray(sections) && sections.length > 0

  const resetFeedback = () => setErrors([])

  // --- parsers --------------------------------------------------------------
  function handleParseMarkdown() {
    resetFeedback()
    try {
      const out = parseMarkdownAny(rawMd || '', { label, classCode, version })
      const secs = ensureScriptShape(out?.sections || out)
      setSections(secs)
      if (!label && out?.label) setLabel(String(out.label))
      if (out?.classCode) setClassCode(normalizeClassCode(out.classCode))
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
      if (out?.classCode) setClassCode(normalizeClassCode(out.classCode))
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
      if (Array.isArray(obj)) {
        secs = ensureScriptShape(obj)
      } else if (obj && typeof obj === 'object') {
        if (!label && obj.label) setLabel(String(obj.label))
        if (obj.classCode) setClassCode(normalizeClassCode(obj.classCode))
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
      setErrors(['XLSX parsing not wired yet. Provide a parseXlsx prop that returns rows[] or { sections }.'])
      return
    }
    setBusy(true)
    try {
      const out = await parseXlsx(file)
      let secs = []
      if (out?.sections) {
        secs = ensureScriptShape(out.sections)
      } else if (Array.isArray(out)) {
        secs = ensureScriptShape(rowsToSections(out))
      } else {
        throw new Error('Unexpected XLSX parse result (expected rows[] or {sections}).')
      }
      setSections(secs)
      if (!label && out?.label) setLabel(String(out.label))
    } catch (e) {
      setErrors([`XLSX parse error: ${e?.message || e}`])
    } finally {
      setBusy(false)
      try { if (fileInputRef.current) fileInputRef.current.value = '' } catch {}
    }
  }

  // --- submit ---------------------------------------------------------------
  function handleImport() {
    const v = validateScript(sections)
    if (!v.ok) return setErrors(v.problems)

    const dataset = {
      label: label || `(Untitled) ${classCode}`,
      classCode: normalizeClassCode(classCode),
      version: Number(version || 1) || 1,
      sections,
    }

    const shape = validateShape(dataset)
    if (!shape.ok) return setErrors(shape.errors || ['Dataset failed validation.'])

    onImported?.({
      label: dataset.label,
      classCode: dataset.classCode,
      version: dataset.version,
      sections: dataset.sections,
    })
  }

  return {
    // meta
    label, setLabel, classCode, setClassCode, version, setVersion,
    // state
    tab, setTab, rawMd, setRawMd, rawCsv, setRawCsv, rawJson, setRawJson,
    xlsxName, busy, sections, errors, stats, canImport, fileInputRef,
    // actions
    handleParseMarkdown, handleParseCsv, handleParseJson, handleXlsxChange, handleImport,
  }
}