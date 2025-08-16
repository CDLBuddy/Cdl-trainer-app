// Path: /src/walkthrough-data/utils/parseXlsx.js
// ============================================================================
// XLSX → Walkthrough parser (SheetJS-backed, flexible headers)
// - Works like your CSV/Markdown parsers and returns the same normalized shape
// - Dynamic import of `xlsx` so your app loads even if the lib isn’t installed
// - First worksheet only; headers are case-insensitive and alias-friendly
// - Section-level flags can be repeated on any row and are elevated
// - Boolean-like values: "true/false", "yes/no", "y/n", "1/0"
// - Pass optional meta: { id, label, classCode, version } (merged into result)
// ============================================================================

/** @typedef {import('../schema').WalkthroughSection} WalkthroughSection */
/** @typedef {import('../schema').WalkthroughScript} WalkthroughScript */

// ---------- Dynamic SheetJS import -----------------------------------------
let _xlsxMod = null
let _xlsxChecked = false

async function ensureXlsx() {
  if (_xlsxChecked && _xlsxMod) return _xlsxMod
  if (_xlsxChecked && !_xlsxMod) {
    throw new Error('xlsx module not available')
  }
  _xlsxChecked = true
  try {
    _xlsxMod = await import('xlsx') // ESM-friendly dynamic import
    return _xlsxMod
  } catch {
    _xlsxMod = null
    throw new Error(
      'XLSX parsing is not available. Install "xlsx" (SheetJS) to enable Excel imports.'
    )
  }
}

/** Allow UI to feature-detect XLSX support. */
export async function isXlsxAvailable() {
  try {
    await ensureXlsx()
    return true
  } catch {
    return false
  }
}

// ---------- Header aliases & helpers ---------------------------------------
const HEADER_ALIASES = {
  section:  ['section', 'part', 'area', 'sectionname', 'title'],
  stepLabel:['steplabel', 'label', 'item', 'title'],
  script:   ['script', 'text', 'line', 'content'],
  mustSay:  ['mustsay', 'must', 'say'],
  required: ['required', 'req'],
  passFail: ['passfail', 'pass', 'pf'],
  skip:     ['skip', 'omit'],
  // section-level flag (optional column)
  critical: ['critical', 'sectioncritical', 'pass/fail'],
}

const norm  = (s) => String(s ?? '').trim()
const lower = (s) => norm(s).toLowerCase()
const toBool = (v) => {
  const s = lower(v)
  return s === 'true' || s === 'yes' || s === 'y' || s === '1'
}

function buildHeaderMap(headers) {
  const low = headers.map((h) => lower(h))
  const find = (key) => {
    for (const alias of HEADER_ALIASES[key]) {
      const i = low.indexOf(alias)
      if (i !== -1) return headers[i]
    }
    return null
  }
  return {
    section:  find('section'),
    stepLabel:find('stepLabel'),
    script:   find('script'),
    mustSay:  find('mustSay'),
    required: find('required'),
    passFail: find('passFail'),
    skip:     find('skip'),
    critical: find('critical'),
  }
}

// ---------- Normalizer (matches CSV/Markdown normalizers) ------------------
function deepFreeze(o) {
  if (!o || typeof o !== 'object') return o
  Object.freeze(o)
  for (const k of Object.keys(o)) {
    const v = o[k]
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v)
  }
  return o
}

/** Normalize to canonical walkthrough shape; adds meta if provided. */
export function normalizeWalkthrough(w = {}, meta = {}) {
  const id = norm(meta.id ?? w.id) || undefined
  const label = norm(meta.label ?? w.label) || undefined
  const classCode = norm(meta.classCode ?? w.classCode) || undefined
  const version = Number(meta.version ?? w.version ?? 1) || 1

  const sections = Array.isArray(w.sections) ? w.sections : []
  const cleaned = sections
    .map((s) => ({
      section: norm(s.section) || 'Untitled',
      critical: !!s.critical,
      passFail: !!s.passFail,
      steps: Array.isArray(s.steps)
        ? s.steps
            .map((st) => {
              const script = norm(st.script)
              if (!script) return null
              const out = { script }
              if (st.label) out.label = norm(st.label)
              if (st.mustSay != null) out.mustSay = !!st.mustSay
              if (st.required != null) out.required = !!st.required
              if (st.passFail != null) out.passFail = !!st.passFail
              if (st.skip != null) out.skip = !!st.skip
              return out
            })
            .filter(Boolean)
        : [],
    }))
    .filter((s) => s.steps.length > 0)

  return deepFreeze({
    id,
    label,
    classCode,
    version,
    sections: cleaned,
  })
}

// ---------- Parser ----------------------------------------------------------
/**
 * Parse an .xlsx File into a normalized Walkthrough object
 * compatible with your CSV/Markdown parsers.
 *
 * @param {File} file
 * @param {{ id?:string, label?:string, classCode?:string, version?:number }} meta
 * @returns {Promise<{ id?:string, label?:string, classCode?:string, version?:number, sections: WalkthroughScript }>}
 */
export async function parseXlsxToWalkthrough(file, meta = {}) {
  if (!(file instanceof File)) {
    throw new Error('parseXlsxToWalkthrough expects a File')
  }

  const XLSX = await ensureXlsx()
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })

  const firstSheetName = wb.SheetNames[0]
  if (!firstSheetName) return normalizeWalkthrough({ sections: [] }, meta)

  const ws = wb.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })
  if (!Array.isArray(rows) || rows.length === 0) {
    return normalizeWalkthrough({ sections: [] }, meta)
  }

  const headers = Object.keys(rows[0] || {})
  const map = buildHeaderMap(headers)

  /** @type {Map<string, {section:string, critical?:boolean, passFail?:boolean, steps:any[]}>} */
  const sectionsByName = new Map()

  for (const row of rows) {
    const sectionName = norm(row[map.section])
    const script = norm(row[map.script])
    const label = norm(row[map.stepLabel])

    if (!sectionName && !script) continue
    if (!script) continue

    const mustSay  = toBool(row[map.mustSay])
    const required = toBool(row[map.required])
    const passFail = toBool(row[map.passFail])
    const skip     = toBool(row[map.skip])
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

  // Normalize and attach an inferred label if none was supplied
  const sections = Array.from(sectionsByName.values())
  const inferredLabel =
    meta.label ||
    wb.Props?.Title ||
    firstSheetName ||
    (typeof file.name === 'string' ? file.name.replace(/\.[^.]+$/, '') : undefined)

  return normalizeWalkthrough({ sections, label: inferredLabel, classCode: meta.classCode, id: meta.id, version: meta.version }, meta)
}

export default parseXlsxToWalkthrough