// src/admin/reports/hooks/useBulkUpload.js
// ======================================================================
// useBulkUpload
// - Controls Bulk Upload dialog open/close
// - Parses CSV (Papa Parse if available; tiny fallback otherwise)
// - Normalizes & validates common ELDT completion fields
// - Exposes helpers so dialog OR page can drive the flow
//   * You can let the Dialog parse & call onUpload(rows)
//   * Or call hook.handleFile(file) and read hook.rows / hook.issues
// - Extras: date/state coercion, optional row cap, ready mapper to completions
// ======================================================================

// @ts-check
import { useCallback, useMemo, useRef, useState } from 'react'

/** Accept list you can feed into <input accept> */
export const ACCEPT_CSV_TYPES = 'text/csv,.csv'

/** Public header template you can re-use in the dialog/template button */
export const SAMPLE_HEADERS = [
  'firstName',
  'lastName',
  'dob(YYYY-MM-DD)',
  'licenseNumber',
  'licenseState',
  'clpNumber',
  'clpState',
  'trainingType(theory|btw|both)',
  'classType(A|B|C)',
  'endorsement(N|P|S|T|H|X|none)',
  'completionDate(YYYY-MM-DD)',
]

/** Map a normalized CSV row -> your completion payload shape */
export function mapCsvRowToCompletion(nr, provider = {}) {
  const fullName = [nr.firstName, nr.lastName].filter(Boolean).join(' ')
  return {
    trainee: {
      firstName: nr.firstName || '',
      lastName: nr.lastName || '',
      fullName,
      dob: nr.dob || '',
      clpNumber: nr.clpNumber || '',
      clpState: nr.clpState || '',
      licenseNumber: nr.licenseNumber || '',
      licenseState: nr.licenseState || '',
    },
    training: {
      classType: nr.classType || 'A', // A|B|C
      endorsement:
        nr.endorsement && nr.endorsement !== 'NONE' ? nr.endorsement : '',
      completionDate: nr.completionDate || '',
      theory: {
        completed: nr.trainingType === 'theory' || nr.trainingType === 'both',
      },
      btw: {
        completed: nr.trainingType === 'btw' || nr.trainingType === 'both',
      },
    },
    provider, // inject your provider (name, tprId, etc.) upstream
    _source: 'bulk-csv',
  }
}

/** Pick the first non-empty value among keys */
const pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

/* ----------------------------- Light coercers ---------------------------- */

const pad2 = n => String(n).padStart(2, '0')

/** Try to coerce a date string to YYYY-MM-DD; returns '' if unsure. */
export function coerceIsoDate(s) {
  if (!s) return ''
  const raw = String(s).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  // MM/DD/YYYY or M/D/YYYY
  let m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) {
    const [, a, b, y] = m
    let mm = Number(a),
      dd = Number(b)
    // If looks like DD/MM/YYYY (day>12 & month<=12), swap
    if (mm > 12 && dd <= 12) [mm, dd] = [dd, mm]
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31)
      return `${y}-${pad2(mm)}-${pad2(dd)}`
  }

  // DD-MM-YYYY (dash, common in exports)
  m = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (m) {
    const dd = Number(m[1]),
      mm = Number(m[2]),
      y = m[3]
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31)
      return `${y}-${pad2(mm)}-${pad2(dd)}`
  }

  return ''
}

/** Normalize US state code-ish to 2-char upper if possible (keeps longer text if provided). */
function normalizeState(s) {
  if (!s) return ''
  const t = String(s).trim().toUpperCase()
  return t.length === 2 ? t : t
}

/** Normalize class type to A|B|C */
function normalizeClassType(s) {
  const t = String(s || '')
    .replace(/^class\s*/i, '')
    .trim()
    .toUpperCase()
  return /^(A|B|C)$/.test(t) ? t : 'A'
}

/* ----------------------------- Row normalize ----------------------------- */

/** Normalize a single raw CSV row into canonical fields */
export function normalizeRow(r = {}) {
  const firstName = pick(r, ['firstName', 'firstname', 'first_name'])
  const lastName = pick(r, ['lastName', 'lastname', 'last_name'])

  const dobRaw = pick(r, [
    'dob',
    'DOB',
    'dateOfBirth',
    'birthDate',
    'dob(YYYY-MM-DD)',
  ])
  const dob = coerceIsoDate(dobRaw) || dobRaw // keep original if non-ISO; validator will flag

  const licenseNumber = pick(r, ['licenseNumber', 'license', 'cdlNumber'])
  const licenseState = normalizeState(
    pick(r, ['licenseState', 'stateOfIssuance', 'state'])
  )

  const clpNumber = pick(r, ['clpNumber', 'clp'])
  const clpState = normalizeState(pick(r, ['clpState']))

  const trainingType = pick(r, [
    'trainingType',
    'trainingType(theory|btw|both)',
  ]).toLowerCase()
  const classType = normalizeClassType(
    pick(r, ['classType', 'classType(A|B|C)']) || 'A'
  )
  const endorsement = (
    pick(r, ['endorsement', 'endorsement(N|P|S|T|H|X|none)']) || 'NONE'
  ).toUpperCase()
  const completionRaw = pick(r, [
    'completionDate',
    'completionDate(YYYY-MM-DD)',
  ])
  const completionDate = coerceIsoDate(completionRaw) || completionRaw

  return {
    firstName,
    lastName,
    dob,
    licenseNumber,
    licenseState,
    clpNumber,
    clpState,
    trainingType, // theory | btw | both
    classType, // A | B | C
    endorsement, // N|P|S|T|H|X|NONE
    completionDate, // YYYY-MM-DD
    _raw: r,
  }
}

/** Validate a normalized row and return an array of missing/invalid field names */
export function validateRow(nr) {
  const errs = []
  if (!nr.firstName) errs.push('firstName')
  if (!nr.lastName) errs.push('lastName')

  if (!nr.dob) errs.push('dob')
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(nr.dob))
    errs.push('dob(format YYYY-MM-DD)')

  if (!nr.licenseNumber && !nr.clpNumber) errs.push('licenseNumber/clpNumber')
  if (!nr.licenseState && !nr.clpState) errs.push('licenseState/clpState')

  if (!/^(theory|btw|both)$/.test(nr.trainingType || ''))
    errs.push('trainingType')
  if (!/^[ABC]$/.test(nr.classType || '')) errs.push('classType')

  if (!nr.completionDate) errs.push('completionDate')
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(nr.completionDate))
    errs.push('completionDate(format YYYY-MM-DD)')

  return errs
}

/** Normalize & validate an array of raw CSV row objects */
export function normalizeAndValidate(rawRows = []) {
  const out = []
  const problems = []
  rawRows.forEach((r, idx) => {
    const nr = normalizeRow(r)
    const rowErrs = validateRow(nr)
    if (rowErrs.length) {
      problems.push(`Row ${idx + 2}: ${rowErrs.join(', ')}`) // +2 = header + 1-based index
    }
    out.push(nr)
  })
  return { rows: out, issues: problems }
}

/* ------------------------------- The hook -------------------------------- */

/**
 * @param {{ onParsed?:(rows:any[], issues:string[])=>void, maxSizeMB?:number, maxRows?:number }} opts
 */
export default function useBulkUpload(opts = {}) {
  const {
    onParsed, // optional callback(normalizedRows, issues)
    maxSizeMB = 5, // client-side guard
    maxRows = 5000, // soft cap to prevent accidental giant pastes
  } = opts

  // Dialog state
  const [open, setOpen] = useState(false)
  const openDialog = useCallback(() => setOpen(true), [])
  const closeDialog = useCallback(() => setOpen(false), [])

  // Parse state
  const [parsing, setParsing] = useState(false)
  const [rows, setRows] = useState([])
  const [issues, setIssues] = useState([])
  const [fileName, setFileName] = useState('')
  const lastFileRef = useRef(null)

  const reset = useCallback(() => {
    setRows([])
    setIssues([])
    setFileName('')
    lastFileRef.current = null
  }, [])

  /* --------------------------- CSV parsing --------------------------- */

  // Guard CSV type/size (use in dialog or here)
  const guardFile = useCallback(
    file => {
      if (!file) return 'No file selected.'
      const okType =
        file.type === 'text/csv' ||
        file.name?.toLowerCase?.().endsWith('.csv') ||
        file.type === '' // some browsers leave CSV as empty type
      if (!okType) return 'Please select a .csv file.'
      if (file.size > maxSizeMB * 1024 * 1024)
        return `CSV is too large (>${maxSizeMB} MB).`
      return ''
    },
    [maxSizeMB]
  )

  // Minimal CSV splitter honoring quotes
  const splitCsvLine = useCallback(line => {
    const out = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"'
          i += 1
        } else {
          inQ = !inQ
        }
      } else if (ch === ',' && !inQ) {
        out.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
    out.push(cur)
    return out
  }, [])

  /**
   * @param {File} fileObj
   * @returns {Promise<({[key: string]: any}[] & {_truncated?: boolean})>}
   */
  const tinyCsvParse = useCallback(
    async fileObj => {
      const text = await fileObj.text()
      const lines = text
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .filter((ln, i) => i === 0 || ln.trim() !== '')
      if (!lines.length) return []
      const header = splitCsvLine(lines[0]).map(h => String(h || '').trim())
      /** @type {Array<any> & {_truncated?: boolean}} */
      const out = []
      for (let i = 1; i < lines.length; i += 1) {
        const cols = splitCsvLine(lines[i])
        if (cols.length === 1 && cols[0] === '') continue
        const row = {}
        for (let j = 0; j < header.length; j += 1)
          row[header[j]] = cols[j] ?? ''
        out.push(row)
        if (out.length >= maxRows) break
      }
      if (lines.length - 1 > maxRows) {
        out._truncated = true // sentinel for summary/issue
      }
      return out
    },
    [splitCsvLine, maxRows]
  )

  const parseWithPapa = useCallback(
    async fileObj => {
      try {
        const mod = await import(/* @vite-ignore */ 'papaparse')
        const Papa = mod?.default || mod
        return await new Promise((resolve, reject) => {
          Papa.parse(fileObj, {
            header: true,
            skipEmptyLines: true,
            worker: true, // offload to a web worker when supported
            transformHeader: h => String(h || '').trim(),
            step: undefined,
            complete: ({ data }) =>
              resolve(Array.isArray(data) ? data.slice(0, maxRows) : []),
            error: err => reject(err),
          })
        })
      } catch {
        return tinyCsvParse(fileObj)
      }
    },
    [tinyCsvParse, maxRows]
  )

  /** Public: parse a File into raw rows (header:true) */
  const parseCsvFile = useCallback(
    async file => {
      if (!file) return { rows: [], issues: ['No file selected'] }
      const err = guardFile(file)
      if (err) return { rows: [], issues: [err] }
      const parsed = await parseWithPapa(file)
      const over = Array.isArray(parsed) && parsed.length === maxRows
      const issues = []
      if (over)
        issues.push(`Trimmed to first ${maxRows} rows to keep things snappy.`)
      if (parsed?._truncated)
        issues.push(`Trimmed to first ${maxRows} rows to keep things snappy.`)
      return { rows: Array.isArray(parsed) ? parsed : [], issues }
    },
    [guardFile, parseWithPapa, maxRows]
  )

  /** Handle a file end-to-end: guard -> parse -> normalize -> validate -> set state */
  const handleFile = useCallback(
    async file => {
      const err = guardFile(file)
      if (err) {
        setIssues([err])
        setRows([])
        setFileName(file?.name || '')
        return { rows: [], issues: [err] }
      }

      setParsing(true)
      setFileName(file.name || '')
      lastFileRef.current = file
      try {
        const { rows: rawRows, issues: parseIssues } = await parseCsvFile(file)
        const { rows: normalized, issues: normIssues } =
          normalizeAndValidate(rawRows)
        const allIssues = [...(parseIssues || []), ...(normIssues || [])]
        setRows(normalized)
        setIssues(allIssues)
        if (typeof onParsed === 'function') {
          try {
            onParsed(normalized, allIssues)
          } catch {
            // Intentionally ignore errors from onParsed callback
          }
        }
        return { rows: normalized, issues: allIssues }
      } catch (e) {
        const msg = `Failed to parse: ${e?.message || e}`
        setRows([])
        setIssues([msg])
        return { rows: [], issues: [msg] }
      } finally {
        setParsing(false)
      }
    },
    [guardFile, parseCsvFile, onParsed]
  )

  const summary = useMemo(() => {
    const total = rows.length
    const errors = issues.length
    const ok = Math.max(0, total - errors)
    const okRate = total ? Math.round((ok / total) * 100) : 0
    return { fileName, total, errors, ok, okRate }
  }, [rows.length, issues.length, fileName])

  /** Convenience: map current normalized rows -> completion payloads */
  const toCompletions = useCallback(
    (provider = {}) => rows.map(r => mapCsvRowToCompletion(r, provider)),
    [rows]
  )

  return {
    // dialog controls
    open,
    openDialog,
    closeDialog,
    reset,

    // parsing state
    parsing,
    rows,
    issues,
    fileName,
    summary,

    // file handlers
    handleFile,
    parseCsvFile,
    guardFile,

    // helpers (exported above too)
    normalizeRow,
    validateRow,
    normalizeAndValidate,
    mapCsvRowToCompletion,
    toCompletions,

    // constants
    SAMPLE_HEADERS,
    ACCEPT_CSV_TYPES,
  }
}
