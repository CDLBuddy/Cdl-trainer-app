// =============================================================================
// CSV → Walkthrough parser (no deps).
// Accepts flexible headers, normalizes into the standard walkthrough shape.
//
// Expected columns (case-insensitive, flexible naming):
// - section | part | area
// - stepLabel | label | item | title
// - script | text | line
// - mustSay | must | say
// - required | req
// - passFail | pass | pf
// - critical | pass/fail (section-level)
// - skip | omit
// - tags (optional; comma or pipe-delimited)
//
// Notes
// - Boolean-like values: "true/false", "yes/no", "y/n", "1/0"
// - Rows with empty script are ignored
// - You can repeat the same section name across rows; steps aggregate
// - Section-level flags (critical) can be repeated per row for that section
// - Optional meta passed into normalizeWalkthrough({ id, label, classCode, version })
// =============================================================================

/** @typedef {import('../schema').WalkthroughScript} WalkthroughScript */

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

/** Public API */
export function parseCsvToWalkthrough(csvText, meta = {}) {
  const rows = _parseCsv(csvText)
  if (!rows.length) return normalizeWalkthrough({ sections: [] }, meta)

  // If the first row is a header, build a header map; otherwise assume default order.
  const headerMap = buildHeaderMap(rows[0])
  const hasHeader = Object.values(headerMap).some(i => i !== -1)
  const startRow = hasHeader ? 1 : 0
  const map = hasHeader ? headerMap : defaultHeaderMap(rows[0])

  const sectionsByName = new Map()

  for (let i = startRow; i < rows.length; i++) {
    const cells = rows[i]
    if (!cells || cells.length === 0) continue

    const sectionName = getStr(cells, map.section)
    const script = getStr(cells, map.script)
    if (!sectionName && !script) continue // ignore empty line
    if (!script) continue // must have a script for a step

    const stepLabel = getStr(cells, map.stepLabel)
    const mustSay = getBool(cells, map.mustSay)
    const required = getBool(cells, map.required)
    const passFail = getBool(cells, map.passFail)
    const skip = getBool(cells, map.skip)
    const tags = getTags(cells, map.tags)

    const sectionCritical = getBool(cells, map.critical)

    const key = sectionName || 'Untitled'
    let section = sectionsByName.get(key)
    if (!section) {
      section = {
        section: key,
        critical: false,
        passFail: false,
        steps: [],
      }
      sectionsByName.set(key, section)
    }

    // Section flags can be specified on any row for this section.
    if (sectionCritical) section.critical = true
    if (passFail && !section.passFail) section.passFail = true // allow elevate

    const step = {
      script,
    }
    if (stepLabel) step.label = stepLabel
    if (mustSay) step.mustSay = true
    if (required) step.required = true
    if (passFail) step.passFail = true
    if (skip) step.skip = true
    if (tags && tags.length) step.tags = tags

    section.steps.push(step)
  }

  const sections = Array.from(sectionsByName.values())
  return normalizeWalkthrough({ sections }, meta)
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Tiny CSV/TSV parser that handles quoted fields, commas in quotes,
 * and auto-detects delimiter: comma, semicolon, or tab.
 * Trims BOM and normalizes line endings.
 * @returns {string[][]}
 */
function _parseCsv(text) {
  if (!text || typeof text !== 'string') return []

  // Strip BOM
  let src = text.replace(/^\uFEFF/, '')
  // Normalize line endings
  src = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const lines = src.split('\n').filter(l => l.trim().length > 0)
  if (!lines.length) return []

  // Delimiter detection from the first non-empty line
  const sample = lines[0]
  const delim = detectDelimiter(sample)

  /** @type {string[][]} */
  const rows = []
  for (const line of lines) {
    const cells = []
    let cur = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]

      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === delim && !inQuotes) {
        cells.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur)
    rows.push(cells)
  }
  return rows
}

function detectDelimiter(sample) {
  // naive: prefer comma; if tabs exist and comma count is low, use tab; else fallback to semicolon
  const commas = (sample.match(/,/g) || []).length
  const tabs = (sample.match(/\t/g) || []).length
  const semis = (sample.match(/;/g) || []).length
  if (tabs > commas && tabs >= semis) return '\t'
  if (semis > commas && semis >= tabs) return ';'
  return ','
}

function buildHeaderMap(headerRow = []) {
  return {
    section: anyIndex(headerRow, ['section', 'part', 'area']),
    stepLabel: anyIndex(headerRow, ['steplabel', 'label', 'item', 'title']),
    script: anyIndex(headerRow, ['script', 'text', 'line']),
    mustSay: anyIndex(headerRow, ['mustsay', 'must', 'say']),
    required: anyIndex(headerRow, ['required', 'req']),
    passFail: anyIndex(headerRow, ['passfail', 'pass', 'pf']),
    critical: anyIndex(headerRow, ['critical', 'pass/fail', 'sectioncritical']),
    skip: anyIndex(headerRow, ['skip', 'omit']),
    tags: anyIndex(headerRow, ['tags', 'tag']),
  }
}

function defaultHeaderMap(firstRow = []) {
  // Fallback order when there is no recognized header row:
  // section, stepLabel, script, mustSay, required, passFail, critical, skip, tags
  return {
    section: 0,
    stepLabel: 1,
    script: 2,
    mustSay: 3,
    required: 4,
    passFail: 5,
    critical: 6,
    skip: 7,
    tags: 8,
  }
}

function anyIndex(row, keys) {
  for (const k of keys) {
    const i = findIndex(row, k)
    if (i !== -1) return i
  }
  return -1
}

function findIndex(row, key) {
  if (!row) return -1
  const target = String(key).trim().toLowerCase()
  for (let i = 0; i < row.length; i++) {
    const v = String(row[i] ?? '').trim().toLowerCase()
    if (v === target) return i
  }
  return -1
}

function getStr(cells, i) {
  if (i == null || i < 0 || i >= cells.length) return ''
  return String(cells[i] ?? '').trim()
}

function getBool(cells, i) {
  const v = getStr(cells, i).toLowerCase()
  if (!v) return false
  return v === 'true' || v === 'yes' || v === 'y' || v === '1'
}

function getTags(cells, i) {
  const raw = getStr(cells, i)
  if (!raw) return []
  // Split on comma or pipe; trim empties
  return raw
    .split(/[|,]/g)
    .map(s => s.trim())
    .filter(Boolean)
}

/** Normalize to canonical walkthrough shape; adds meta if provided. */
export function normalizeWalkthrough(w = {}, meta = {}) {
  const id = strOrU(meta.id ?? w.id)
  const label = strOrU(meta.label ?? w.label)
  const classCode = strOrU(meta.classCode ?? w.classCode)
  const version = Number(meta.version ?? w.version ?? 1) || 1

  const sections = Array.isArray(w.sections) ? w.sections : []
  const cleaned = sections
    .map(s => {
      const sectionName = String(s.section ?? '').trim() || 'Untitled'
      const critical = !!s.critical
      const passFail = !!s.passFail

      const steps = Array.isArray(s.steps)
        ? s.steps
            .map(st => {
              const script = String(st.script ?? '').trim()
              if (!script) return null
              /** @type {any} */
              const out = { script }
              const label = String(st.label ?? st.stepLabel ?? '').trim()
              if (label) out.label = label
              if (st.mustSay != null) out.mustSay = !!st.mustSay
              if (st.required != null) out.required = !!st.required
              if (st.passFail != null) out.passFail = !!st.passFail
              if (st.skip != null) out.skip = !!st.skip
              const tags = Array.isArray(st.tags)
                ? st.tags.map(t => String(t).trim()).filter(Boolean)
                : []
              if (tags.length) out.tags = tags
              return out
            })
            .filter(Boolean)
        : []

      return { section: sectionName, critical, passFail, steps }
    })
    .filter(s => s.steps.length > 0)

  const result = {
    id,
    label,
    classCode,
    version,
    sections: cleaned,
  }

  // DEV sanity checks (non-fatal)
  if (IS_DEV) {
    try {
      if (!Array.isArray(result.sections) || result.sections.length === 0) {
        // eslint-disable-next-line no-console
        console.warn('[parseCsv] Produced walkthrough has no sections')
      }
    } catch {
      // swallow
    }
  }

  return deepFreeze(result)
}

function strOrU(v) {
  const s = String(v ?? '').trim()
  return s ? s : undefined
}

function deepFreeze(o) {
  if (!o || typeof o !== 'object') return o
  Object.freeze(o)
  for (const k of Object.keys(o)) {
    const v = o[k]
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v)
  }
  return o
}

// Maintain compatibility with callers that import { parseCsv } from utils.
// This alias intentionally points to the walkthrough-producing function.
export const parseCsv = parseCsvToWalkthrough

export default parseCsvToWalkthrough