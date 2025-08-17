// Path: /src/admin/walkthroughs/walkthroughHelpers.js
// -----------------------------------------------------------------------------
// Shared helper functions for admin walkthrough management.
// - Delegates CSV/Markdown parsing + validation to @walkthrough-data/utils
// - Implements XLSX parsing via central utils (exceljs under the hood)
// - Provides id/timestamp/label helpers used across Admin screens
// -----------------------------------------------------------------------------

// ---- Global data utils (stay in sync with student app schema) --------------
import {
  parseCsv as coreParseCsv,                // parseCsvToWalkthrough compatible
  parseMarkdown as coreParseMarkdown,      // parseMarkdownToWalkthrough compatible
  parseXlsx as coreParseXlsx,              // exceljs-based XLSX -> dataset
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

// ---- XLSX (delegated to @walkthrough-data/utils; exceljs under the hood) ---

/** Back-compat: simple availability check (true when core parser is present). */
export async function isXlsxAvailable() {
  return typeof coreParseXlsx === 'function'
}

/**
 * Parse an .xlsx source into a normalized dataset (sections/steps).
 * Accepts File/Blob/ArrayBuffer/Uint8Array/Buffer depending on environment.
 */
export async function parseXlsx(fileOrBuffer, options) {
  return coreParseXlsx(fileOrBuffer, options)
}
