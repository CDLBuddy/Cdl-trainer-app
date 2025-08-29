// Path: src/walkthrough-data/utils/parseCsv.js
// ============================================================================
// CSV → Walkthrough parser (no deps).
// - Flexible headers (case/space/punctuation insensitive)
// - Smart delimiter detection across multiple sample lines
// - Handles quoted fields, escaped quotes, and *multi-line* cells
// - Ignores comment lines (# …) and fully blank rows
// - Normalizes to canonical walkthrough shape (frozen object)
// - Public API:
//     • parseCsvToWalkthrough(csvText, meta?)
//     • parseCsv (alias)
// ============================================================================

/** @typedef {import('../schema').WalkthroughScript} WalkthroughScript */

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

/** Public API */
export function parseCsvToWalkthrough(csvText, meta = {}) {
  const rows = _tokenizeCsv(csvText)
  if (!rows.length) return normalizeWalkthrough({ sections: [] }, meta)

  // If the first row looks like headers, map them; else assume default ordering.
  const headerMap = buildHeaderMap(rows[0])
  const hasHeader = Object.values(headerMap).some(i => i !== -1)
  const startRow = hasHeader ? 1 : 0
  const map = hasHeader ? headerMap : defaultHeaderMap(rows[0])

  /** @type {Map<string, {section:string, critical:boolean, passFail:boolean, steps:any[]}>} */
  const sectionsByName = new Map()

  for (let i = startRow; i < rows.length; i++) {
    const cells = rows[i]
    if (!cells || cells.length === 0) continue

    const sectionName = getStr(cells, map.section)
    const script = getStr(cells, map.script)
    if (!sectionName && !script) continue // ignore empty
    if (!script) continue // steps require script

    const stepLabel = getStr(cells, map.stepLabel)
    const mustSay = getBool(cells, map.mustSay)
    const required = getBool(cells, map.required)
    const passFail = getBool(cells, map.passFail)
    const skip = getBool(cells, map.skip)
    const tags = getTags(cells, map.tags)
    const sectionCrit = getBool(cells, map.critical)

    const key = sectionName || 'Untitled'
    let section = sectionsByName.get(key)
    if (!section) {
      section = { section: key, critical: false, passFail: false, steps: [] }
      sectionsByName.set(key, section)
    }

    // Section flags can appear on any row of that section.
    if (sectionCrit) section.critical = true
    if (passFail && !section.passFail) section.passFail = true

    /** @type {any} */
    const step = { script }
    if (stepLabel) step.label = stepLabel
    if (mustSay) step.mustSay = true
    if (required) step.required = true
    if (passFail) step.passFail = true
    if (skip) step.skip = true
    if (tags.length) step.tags = tags

    section.steps.push(step)
  }

  const sections = Array.from(sectionsByName.values())
  return normalizeWalkthrough({ sections }, meta)
}

/* ────────────────────────────── Helpers ─────────────────────────────── */

/**
 * Robust CSV tokenizer:
 * - Detects delimiter using up to the first 10 non-empty lines (outside quotes)
 * - Supports multi-line quoted cells and escaped quotes ("")
 * - Trims BOM and normalizes line endings
 * - Skips pure comment lines that start with '#'
 * @returns {string[][]}
 */
function _tokenizeCsv(text) {
  if (!text || typeof text !== 'string') return []

  // Strip BOM & normalize line endings for traversal
  const src = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')

  // Pass 1: detect delimiter from the first few *physical* lines
  const sampleLines = src
    .split('\n')
    .slice(0, 12)
    .filter(l => l.trim() !== '' && !/^\s*#/.test(l))
  const delim = detectDelimiterFromSample(sampleLines)

  /** @type {string[][]} */
  const rows = []
  let curRow = []
  let curCell = ''
  let inQuotes = false

  // Walk the entire text char-by-char to support multi-line quoted fields
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]

    if (ch === '"') {
      // Escaped quote inside a quoted field
      if (inQuotes && src[i + 1] === '"') {
        curCell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && (ch === delim || ch === '\n')) {
      // Push cell
      curRow.push(curCell)
      curCell = ''

      // End of row?
      if (ch === '\n') {
        const pureComment = curRow.length === 1 && /^\s*#/.test(curRow[0])
        const onlyWhitespace = curRow.every(c => String(c).trim() === '')
        if (!pureComment && !onlyWhitespace) rows.push(curRow)
        curRow = []
      }
      continue
    }

    // Regular char
    curCell += ch
  }

  // Flush final cell/row
  curRow.push(curCell)
  const pureComment = curRow.length === 1 && /^\s*#/.test(curRow[0])
  const onlyWhitespace = curRow.every(c => String(c).trim() === '')
  if (!pureComment && !onlyWhitespace) rows.push(curRow)

  return rows
}

function detectDelimiterFromSample(lines) {
  // Count outside quotes to avoid false positives
  const counts = { ',': 0, '\t': 0, ';': 0, '|': 0 }
  const scanN = Math.min(lines.length, 10)

  for (let li = 0; li < scanN; li++) {
    const s = lines[li]
    let inQ = false
    for (let i = 0; i < s.length; i++) {
      const ch = s[i]
      if (ch === '"') {
        if (inQ && s[i + 1] === '"') {
          i++
          continue
        }
        inQ = !inQ
      } else if (!inQ && ch in counts) {
        counts[ch]++
      }
    }
  }

  // Preference order: comma, tab, semicolon, pipe
  const ranked = [',', '\t', ';', '|'].sort((a, b) => counts[b] - counts[a])
  return ranked[0] || ','
}

// Header mapping (case/space/punct insensitive)
function buildHeaderMap(headerRow = []) {
  const norm = headerRow.map(n => normalizeHeader(n))
  return {
    section: anyIndex(norm, [
      'section',
      'part',
      'area',
      'section name',
      'sectiontitle',
    ]),
    stepLabel: anyIndex(norm, [
      'steplabel',
      'label',
      'item',
      'title',
      'step label',
    ]),
    script: anyIndex(norm, ['script', 'text', 'line', 'step', 'content']),
    mustSay: anyIndex(norm, ['mustsay', 'must', 'say', 'verbatim']),
    required: anyIndex(norm, ['required', 'req', 'need', 'mandatory']),
    passFail: anyIndex(norm, ['passfail', 'pass', 'pf']),
    critical: anyIndex(norm, [
      'critical',
      'sectioncritical',
      'pass/fail',
      'iscritical',
    ]),
    skip: anyIndex(norm, ['skip', 'omit']),
    tags: anyIndex(norm, ['tags', 'tag']),
  }
}

function defaultHeaderMap(_firstRow = []) {
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

function normalizeHeader(v) {
  return String(v ?? '')
    .toLowerCase()
    .replace(/[\s_\-\/]+/g, '')
    .replace(/[^\w]/g, '')
}

function anyIndex(row, keys) {
  for (const k of keys) {
    const i = row.indexOf(k)
    if (i !== -1) return i
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
  // Broad truthy recognition
  return v === 'true' || v === 'yes' || v === 'y' || v === '1' || v === 't'
}

function getTags(cells, i) {
  const raw = getStr(cells, i)
  if (!raw) return []
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
              const lbl = String(st.label ?? st.stepLabel ?? '').trim()
              if (lbl) out.label = lbl
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

  const result = { id, label, classCode, version, sections: cleaned }

  if (IS_DEV) {
    try {
      if (!Array.isArray(result.sections) || result.sections.length === 0) {
        console.warn('[parseCsv] Produced walkthrough has no sections')
      }
    } catch {}
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

// Compatibility alias
export const parseCsv = parseCsvToWalkthrough
export default parseCsvToWalkthrough
