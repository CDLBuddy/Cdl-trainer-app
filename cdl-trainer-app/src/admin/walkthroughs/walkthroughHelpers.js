// Path: /src/admin/walkthroughs/walkthroughHelpers.js
// -----------------------------------------------------------------------------
// Shared helper functions for admin walkthrough management.
// - Delegates CSV/Markdown parsing + validation to @walkthrough-data/utils
// - Implements XLSX parsing via dynamic import of `xlsx` (SheetJS) if available
// - Provides id/timestamp/label helpers used across Admin screens
// -----------------------------------------------------------------------------

// ---- Global data utils (stay in sync with student app schema) --------------
import {
  parseCsv as coreParseCsv,                // parseCsvToWalkthrough compatible
  parseMarkdown as coreParseMarkdown,      // parseMarkdownToWalkthrough compatible
  validateWalkthroughs as coreValidateAll, // optional
  validateWalkthroughShape as coreValidateShape,
} from '@walkthrough-data/utils'

// ---- Local, general helpers ------------------------------------------------

/** Generate a short unique ID (for drafts, duplicates, etc.) */
export function nextId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 6)}${Math.random()
    .toString(36)
    .slice(2, 6)}`
}

/** ISO timestamp (updatedAt, createdAt) */
export function nowIso() {
  return new Date().toISOString()
}

/** Safe deep clone for plain data */
export function cloneDeep(obj) {
  return obj == null ? obj : JSON.parse(JSON.stringify(obj))
}

/** Normalize an input (token/code/label-like) to the canonical walkthrough token */
export function toToken(input) {
  if (input == null) return ''
  const s = String(input).trim()
  if (!s) return ''

  const CODE_TO_TOKEN = {
    A: 'class-a',
    'A-WO-AIR-ELEC': 'class-a-wo-air-elec',
    'A-WO-HYD-ELEC': 'class-a-wo-hyd-elec',
    B: 'class-b',
    'PASSENGER-BUS': 'passenger-bus',
  }
  const asCode = s.toUpperCase().replace(/\s+/g, '-').replace(/_/g, '-')
  if (CODE_TO_TOKEN[asCode]) return CODE_TO_TOKEN[asCode]

  return s
    .toLowerCase()
    .replace(/\bclass\s+([ab])\b/g, 'class-$1')
    .replace(/\s+no\s+air(?:\/|and)?electric/gi, '-wo-air-elec')
    .replace(/\s+no\s+hyd(?:\/|and)?electric/gi, '-wo-hyd-elec')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/** Title for a known token (fallback to prettified token) */
export function inferLabelFromToken(token) {
  const labels = {
    'class-a': 'Class A',
    'class-a-wo-air-elec': 'Class A (No Air/Electric)',
    'class-a-wo-hyd-elec': 'Class A (No Hyd/Electric)',
    'class-b': 'Class B',
    'passenger-bus': 'Passenger Bus',
  }
  return labels[token] || String(token || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

// ---- Validation wrappers ---------------------------------------------------

/**
 * Validate a dataset-ish object (lightweight guard).
 * Accepts either the dataset wrapper or just a WalkthroughScript.
 */
export function validateWalkthroughShape(data) {
  try {
    // @walkthrough-data/utils returns { ok, errors } for dataset validation
    const res = coreValidateShape ? coreValidateShape(data) : { ok: true, errors: [] }
    return res
  } catch (err) {
    return { ok: false, errors: [String(err?.message || err)] }
  }
}

/** Quick validator for a bare WalkthroughScript */
export function validateScript(script) {
  /** @type {string[]} */
  const problems = []
  if (!Array.isArray(script) || script.length === 0) problems.push('Script must have at least one section.')
  script?.forEach((sec, si) => {
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

// ---- CSV & Markdown (delegate to core utils) -------------------------------

export function parseCsv(csvText, meta) {
  // Your core util supports flexible headers and returns normalized shape
  return coreParseCsv(csvText, meta)
}

export function parseMarkdown(mdText, meta) {
  // Your core util supports headings/bullets/flags and returns normalized shape
  return coreParseMarkdown(mdText, meta)
}

// ---- XLSX parsing (SheetJS) ------------------------------------------------
// We dynamically import `xlsx` so this file works even before you install it.
// Install when ready:
//   npm i xlsx
// or
//   pnpm add xlsx
// -----------------------------------------------------------------------------

let _xlsxMod = null
let _xlsxChecked = false

async function ensureXlsx() {
  if (_xlsxChecked && _xlsxMod) return _xlsxMod
  if (_xlsxChecked && !_xlsxMod) throw new Error('xlsx module not available')

  _xlsxChecked = true
  try {
    // Vite + ESM friendly dynamic import
    _xlsxMod = await import('xlsx')
    return _xlsxMod
  } catch (err) {
    _xlsxMod = null
    throw new Error(
      'XLSX parsing is not available. Install "xlsx" (SheetJS) to enable Excel imports.'
    )
  }
}

/** Allow callers to check availability (for UI hints) */
export async function isXlsxAvailable() {
  try {
    await ensureXlsx()
    return true
  } catch {
    return false
  }
}

// Flexible header matching like parseCsv
const HEADER_ALIASES = {
  section: ['section', 'part', 'area', 'sectionname', 'title'],
  stepLabel: ['steplabel', 'label', 'item', 'title'],
  script: ['script', 'text', 'line', 'content'],
  mustSay: ['mustsay', 'must', 'say'],
  required: ['required', 'req'],
  passFail: ['passfail', 'pass', 'pf'],
  skip: ['skip', 'omit'],
  // optional: section-level critical flag (if a column exists per row)
  critical: ['critical', 'sectioncritical', 'pass/fail'],
}

function norm(s) {
  return String(s ?? '').trim()
}
function normLower(s) {
  return norm(s).toLowerCase()
}
function toBool(v) {
  const s = normLower(v)
  return s === 'true' || s === 'yes' || s === 'y' || s === '1'
}

/** Map the first matching header key in HEADER_ALIASES to its column name */
function buildHeaderMap(headers) {
  const lower = headers.map(h => normLower(h))
  const find = (key) => {
    for (const alias of HEADER_ALIASES[key]) {
      const idx = lower.indexOf(alias)
      if (idx !== -1) return headers[idx]
    }
    return null
  }
  return {
    section: find('section'),
    stepLabel: find('stepLabel'),
    script: find('script'),
    mustSay: find('mustSay'),
    required: find('required'),
    passFail: find('passFail'),
    skip: find('skip'),
    critical: find('critical'),
  }
}

/**
 * Parse an .xlsx File into { sections } compatible with WalkthroughScript.
 * Uses first worksheet, flexible headers, and aggregates steps by section name.
 */
export async function parseXlsx(file) {
  if (!(file instanceof File)) {
    throw new Error('parseXlsx expects a File')
  }
  const XLSX = await ensureXlsx()

  // read into workbook
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })

  const firstSheetName = wb.SheetNames[0]
  if (!firstSheetName) return { sections: [] }

  const ws = wb.Sheets[firstSheetName]
  // Use defval to keep empty strings for missing cells, header:1 to grab header row
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })
  if (!Array.isArray(rows) || rows.length === 0) return { sections: [] }

  // Build header map from the keys of the first row
  const headers = Object.keys(rows[0] || {})
  const map = buildHeaderMap(headers)

  // Aggregate by section
  /** @type {Map<string, {section:string, critical?:boolean, passFail?:boolean, steps:any[]}>} */
  const sectionsByName = new Map()

  for (const row of rows) {
    const sectionName = norm(row[map.section])
    const script = norm(row[map.script])
    const label = norm(row[map.stepLabel])

    if (!sectionName && !script) continue
    if (!script) continue

    const mustSay = toBool(row[map.mustSay])
    const required = toBool(row[map.required])
    const passFail = toBool(row[map.passFail])
    const skip = toBool(row[map.skip])
    const critical = toBool(row[map.critical])

    const key = sectionName || 'Untitled'
    let section = sectionsByName.get(key)
    if (!section) {
      section = { section: key, critical: false, passFail: false, steps: [] }
      sectionsByName.set(key, section)
    }

    // Elevate section flags if present on any row
    if (critical) section.critical = true
    if (passFail && !section.passFail) section.passFail = true

    section.steps.push({
      label: label || undefined,
      script,
      mustSay: mustSay || undefined,
      required: required || undefined,
      passFail: passFail || undefined,
      skip: skip || undefined,
    })
  }

  // Normalize to array
  const sections = Array.from(sectionsByName.values()).map(sec => ({
    section: sec.section,
    critical: !!sec.critical,
    passFail: !!sec.passFail,
    steps: (sec.steps || []).filter(st => norm(st.script)).map(st => ({
      label: st.label,
      script: st.script,
      mustSay: !!st.mustSay,
      required: !!st.required,
      passFail: !!st.passFail,
      skip: !!st.skip,
    })),
  })).filter(s => Array.isArray(s.steps) && s.steps.length > 0)

  return { sections }
}