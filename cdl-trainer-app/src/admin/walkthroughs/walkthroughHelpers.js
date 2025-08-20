// Path: /src/admin/walkthroughs/walkthroughHelpers.js
// -----------------------------------------------------------------------------
// Admin walkthrough helpers — production-safe, overlay-first model.
// - You KEEP your existing CSV/MD/XLSX parsers (ExcelJS under the hood)
// - You GET a resolver: Base Class (A/B/PASSENGER-BUS) + overlays (automatic/no-air/no-fifth-wheel)
// - Includes tolerant validation + normalized draft builder for submit/review
// -----------------------------------------------------------------------------

// ---- Global data utils (unchanged) -----------------------------------------
import {
  parseCsv as coreParseCsv,
  parseMarkdown as coreParseMarkdown,
  parseXlsx as coreParseXlsx,
  validateWalkthroughShape as coreValidateShape,
} from '@walkthrough-data/utils'
// ---- Base defaults (no overlays applied) -----------------------------------
import defaultA from '@walkthrough-defaults/walkthrough-class-a.js'
import defaultB from '@walkthrough-defaults/walkthrough-class-b.js'
import defaultPB from '@walkthrough-defaults/walkthrough-passenger-bus.js'

// ---- Overlay single-file aliases (pure functions: script[] -> script[]) ----
import automaticOverlay from '@walkthrough-restriction-automatic'
import noAirOverlay from '@walkthrough-restriction-no-air'
import noFifthWheelOverlay from '@walkthrough-restriction-no-fifth-wheel'

// ---- Small utils -----------------------------------------------------------
export function nextId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 6)}${Math.random()
    .toString(36)
    .slice(2, 6)}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function cloneDeep(obj) {
  return obj == null ? obj : JSON.parse(JSON.stringify(obj))
}

// ============================================================================
// NEW: Canonical class codes + overlay catalog
// ============================================================================
export const CLASS_CODES = ['A', 'B', 'PASSENGER-BUS']

const OVERLAYS = [
  { id: 'automatic',    label: 'Automatic Transmission', fn: automaticOverlay },
  { id: 'no-air',       label: 'No Air Brakes',          fn: noAirOverlay },
  { id: 'no-fifth-wheel', label: 'No Fifth Wheel',       fn: noFifthWheelOverlay },
]

const overlayFnById = OVERLAYS.reduce((m, o) => (m[o.id] = o.fn, m), {})

export function listAvailableOverlays() {
  return OVERLAYS.map(({ id, label }) => ({ id, label }))
}
export function formatOverlayLabel(id) {
  const o = OVERLAYS.find(x => x.id === id)
  return o?.label || id
}

// ============================================================================
// CHANGED: token helpers — tokens are simple/stable, variants are overlays
// ============================================================================
/**
 * Normalize any user/company input into a stable token for the walkthrough.
 * We intentionally DO NOT encode restrictions into the token anymore.
 * Keep tokens short & stable (good for Firestore doc ids and diffing).
 */
export function toToken(input) {
  if (input == null) return ''
  const s = String(input).trim()
  if (!s) return ''
  // Map common names to short tokens; everything else → sanitized slug
  const asLower = s.toLowerCase()
  if (/^class\s*a\b/i.test(s) || asLower === 'a') return 'class-a'
  if (/^class\s*b\b/i.test(s) || asLower === 'b') return 'class-b'
  if (asLower.includes('passenger')) return 'passenger-bus'
  return s.toLowerCase().replace(/[_\s]+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/** User-facing label for a token (variants no longer appear here). */
export function inferLabelFromToken(token) {
  const t = String(token || '')
  if (t === 'class-a') return 'Class A'
  if (t === 'class-b') return 'Class B'
  if (t === 'passenger-bus') return 'Passenger Bus'
  // Fallback prettify
  return t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ============================================================================
// NEW: Base + overlays resolver
// ============================================================================
export function getBaseDefaultScript(classCode) {
  switch (classCode) {
    case 'A':             return cloneDeep(defaultA)
    case 'B':             return cloneDeep(defaultB)
    case 'PASSENGER-BUS': return cloneDeep(defaultPB)
    default:              return cloneDeep(defaultA) // safe fallback
  }
}

/** Apply overlay ids purely on top of a script (unknown ids ignored). */
export function applyOverlaysToScript(script, overlayIds = []) {
  if (!Array.isArray(script)) return []
  if (!Array.isArray(overlayIds) || overlayIds.length === 0) return cloneDeep(script)

  let out = cloneDeep(script)
  for (const id of overlayIds) {
    const fn = overlayFnById[id]
    if (typeof fn === 'function') {
      const next = fn(out)
      out = Array.isArray(next) ? next : out
    }
  }
  return out
}

/** Final “what students see” resolution = base defaults + overlays. */
export function resolveScript({ classCode, overlays = [], baseEdits = null } = {}) {
  const base = getBaseDefaultScript(classCode)
  const withOverlays = applyOverlaysToScript(base, overlays)

  if (!baseEdits) return withOverlays

  // Optional: shallow merge per-section by index (simple, predictable)
  const merged = cloneDeep(withOverlays)
  if (Array.isArray(baseEdits)) {
    baseEdits.forEach((sec, i) => { if (merged[i]) merged[i] = { ...merged[i], ...sec } })
  }
  return merged
}

// ============================================================================
// Validation (yours kept; with tolerant fallback)
// ============================================================================
export function validateWalkthroughShape(data) {
  try {
    const res = coreValidateShape ? coreValidateShape(data) : { ok: true, errors: [] }
    return res
  } catch (err) {
    return { ok: false, errors: [String(err?.message || err)] }
  }
}

/** Lightweight structural check for raw script arrays (kept from your version) */
export function validateScript(script) {
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

// ============================================================================
// Parsing proxies (yours kept)
// ============================================================================
export function parseCsv(csvText, meta) { return coreParseCsv(csvText, meta) }
export function parseMarkdown(mdText, meta) { return coreParseMarkdown(mdText, meta) }

export async function isXlsxAvailable() {
  return typeof coreParseXlsx === 'function'
}
export async function parseXlsx(fileOrBuffer, options) {
  return coreParseXlsx(fileOrBuffer, options)
}

// ============================================================================
// NEW: Normalizer + submit helper (used by Admin Editor before queueing)
// ============================================================================
export function normalizeSubmissionDraft(draft = {}) {
  const classCode = CLASS_CODES.includes(draft.classCode) ? draft.classCode : 'A'
  const overlays = Array.isArray(draft.overlays) ? draft.overlays : []
  const label = draft.label || inferLabelFromToken(draft.token || toToken(classCode))
  const token = draft.token || toToken(classCode)
  const script = Array.isArray(draft.script) ? draft.script : []
  const version = Number.isFinite(draft.version) ? Number(draft.version) : 0
  return {
    status: 'draft',
    mode: 'resolved',
    ...draft,
    classCode,
    overlays,
    label,
    token,
    script,
    version,
  }
}

/**
 * Build a resolved + validated submission payload:
 * returns { draft, validation } for the editor to use before saving/submitting.
 */
export function buildResolvedSubmission({
  id,
  schoolId,
  label,
  classCode,
  overlays = [],
  token,
  version = 0,
  mode = 'resolved',
} = {}) {
  const script = resolveScript({ classCode, overlays })
  const draft = normalizeSubmissionDraft({
    id, schoolId, label, classCode, overlays, token, script, version, mode,
    updatedAt: nowIso(),
  })
  const validation = validateWalkthroughShape({
    id: draft.id, label: draft.label, classCode: draft.classCode, script: draft.script,
  })
  return { draft, validation }
}