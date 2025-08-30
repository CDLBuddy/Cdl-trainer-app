// src/student/walkthrough/utils/tokens.js
// ======================================================================
// Token helpers (derive study tokens from walkthrough step text)
// - Extracts measurement phrases (psi, sec, minutes, ft, in, °, mph, rpm, lb, gal, volts)
// - Picks up quoted phrases and common key phrases (“engine off”, “key on”, …)
// - Case-insensitive, deduped, normalized
// - Safe for SSR; no DOM usage
// ======================================================================

/**
 * @typedef {Object} AutoTokenOptions
 * @property {number} [max=12]          Max tokens to return (after de-dupe)
 * @property {boolean} [includeQuoted=true]   Capture "quoted phrases"
 * @property {boolean} [includePhrases=true]  Include common CDL phrases
 * @property {string[]} [extraPhrases]        Extra phrases to consider (case-insensitive)
 * @property {(t:string)=>string} [normalize] Custom normalizer (default lower-case trim)
 */

/** Default normalizer: trim + collapse spaces + lowercase */
function normalizeDefault(s = '') {
  return String(s).trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Collect without duplicates (case-insensitive by normalized form) */
function pushUnique(list, seen, raw, normalize = normalizeDefault) {
  const n = normalize(raw)
  if (!n) return
  if (!seen.has(n)) {
    seen.add(n)
    list.push(n)
  }
}

/** Regex bank for compact numeric/units phrases */
const NUMERIC_PATTERNS = [
  // 100 psi, 4 sec, 30 seconds, 2 minutes, 10°, 12 ft, 6 in
  /\b\d+(?:\.\d+)?\s?(?:psi|sec|seconds?|mins?|minutes?|°|deg|degrees?|ft|in)\b/gi,
  // 55 mph, 1200 rpm, 12v, 12 volts, 20 lb, 20 lbs, 40 gal, 40 gallons
  /\b\d+(?:\.\d+)?\s?(?:mph|rpm|v|volts?|lb?s?|gal|gallons?)\b/gi,
  // Ranges like 20–40 psi, 10-12 seconds
  /\b\d+(?:\.\d+)?\s?[–-]\s?\d+(?:\.\d+)?\s?(?:psi|sec|seconds?|mins?|minutes?)\b/gi,
]

/** Default CDL-ish phrases to look for (extendable via extraPhrases) */
const COMMON_PHRASES = [
  'engine off',
  'engine on',
  'key on',
  'key off',
  'parking brake',
  'service brake',
  'low air warning',
  'applied pressure',
  'leak test',
  'cut in',
  'cut out',
  'governor',
  'air compressor',
]

/**
 * Derive friendly tokens from a single step script.
 * @param {string} script
 * @param {AutoTokenOptions} [opts]
 * @returns {string[]} normalized tokens
 */
export function autoTokensFrom(script = '', opts = {}) {
  if (!script) return []
  const {
    max = 12,
    includeQuoted = true,
    includePhrases = true,
    extraPhrases = [],
    normalize = normalizeDefault,
  } = opts

  const out = []
  const seen = new Set()
  const text = String(script)

  // 1) Quoted phrases: "three point brake check", ‘low air alarm’, etc.
  if (includeQuoted) {
    const QUOTED = /["“”'‘’](.+?)["“”'‘’]/g
    let m
    while ((m = QUOTED.exec(text))) {
      pushUnique(out, seen, m[1], normalize)
      if (out.length >= max) return out
    }
  }

  // 2) Numeric/unit phrases (psi, seconds, minutes, mph, rpm, etc.)
  for (const re of NUMERIC_PATTERNS) {
    let m
    while ((m = re.exec(text))) {
      pushUnique(out, seen, m[0], normalize)
      if (out.length >= max) return out
    }
  }

  // 3) Common CDL phrases (plus user extras)
  if (includePhrases) {
    const bank = [...COMMON_PHRASES, ...extraPhrases]
    for (const p of bank) {
      if (!p) continue
      const rx = new RegExp(`\\b${escapeRe(p)}\\b`, 'i')
      if (rx.test(text)) {
        pushUnique(out, seen, p, normalize)
        if (out.length >= max) return out
      }
    }
  }

  return out.slice(0, max)
}

/** Escape a string for safe use inside a new RegExp */
function escapeRe(s = '') {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Convenience: derive tokens for a list of steps (keeping per-step order).
 * Each step can be a string or { script?: string, text?: string }.
 * @param {Array<string|{script?:string,text?:string}>} steps
 * @param {AutoTokenOptions} [opts]
 * @returns {string[]} merged tokens (deduped globally, limited by opts.max)
 */
export function tokensForSteps(steps = [], opts = {}) {
  const out = []
  const seen = new Set()
  const normalize = opts?.normalize || normalizeDefault
  const max = opts?.max ?? 16 // allow a bit more when merging

  for (const step of steps) {
    const s =
      typeof step === 'string'
        ? step
        : String(step?.script || step?.text || '')
    if (!s) continue
    const tks = autoTokensFrom(s, opts)
    for (const t of tks) {
      if (out.length >= max) return out
      pushUnique(out, seen, t, normalize)
    }
  }
  return out
}

export default autoTokensFrom