// Path: src/admin/dashboard/hooks/utils/index.js
// ============================================================================
// Admin Dashboard • Utilities (stable API)
// - Backward-compatible exports: clampPct, expirySoon
// - Safe date parsing and time helpers for KPI/alerts
// - Pure, side-effect free, and tree-shakable
// ============================================================================

/**
 * Clamp any value to an integer percentage in [0, 100].
 * Accepts numbers or numeric strings; non-finite values → 0.
 * @param {unknown} x
 * @returns {number} integer 0..100
 */
export function clampPct(x) {
  const n = Number(x)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Parse many "date-like" inputs into a Date or return null if invalid.
 * Accepts Date, ISO strings, epoch ms, or epoch seconds (>= 10 digits assumed).
 * @param {unknown} v
 * @returns {Date|null}
 */
export function parseDate(v) {
  if (v instanceof Date) {
    return Number.isFinite(v.getTime()) ? v : null
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Heuristic: treat 10-digit-ish numbers as seconds
    const ms = v < 1e11 ? v * 1000 : v
    const d = new Date(ms)
    return Number.isFinite(d.getTime()) ? d : null
  }
  if (typeof v === 'string' && v.trim()) {
    const d = new Date(v)
    return Number.isFinite(d.getTime()) ? d : null
  }
  return null
}

/**
 * Days from now until the given date (negative if already past).
 * Invalid input → +Infinity (so it won’t trip “soon” checks).
 * @param {unknown} dateish
 * @returns {number}
 */
export function daysUntil(dateish) {
  const d = parseDate(dateish)
  if (!d) return Number.POSITIVE_INFINITY
  const now = Date.now()
  const diffMs = d.getTime() - now
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * True if a date is within N days from now.
 * Backward-compatible default: within 30 days (past dates count as “soon”).
 *
 * NOTE:
 *  - historical behavior treated any date <= 30 days away (including NEGATIVE,
 *    i.e., already expired) as “soon”. We keep that by default for existing
 *    dashboards. You can opt out via { includePast: false }.
 *
 * @param {unknown} dateish
 * @param {{ withinDays?: number, includePast?: boolean }} [opts]
 * @returns {boolean}
 */
export function expirySoon(dateish, opts = {}) {
  const { withinDays = 30, includePast = true } = opts
  const d = daysUntil(dateish)
  if (!Number.isFinite(d)) return false
  return includePast ? d <= withinDays : (d >= 0 && d <= withinDays)
}

/* --------------------------------------------------------------------------
   Optional niceties (non-breaking): export if you want them elsewhere
--------------------------------------------------------------------------- */

/**
 * Safe percent formatter for small badges (e.g., 82%).
 * @param {unknown} x
 * @param {number} [digits=0]
 * @returns {string}
 */
export function formatPercent(x, digits = 0) {
  const n = clampPct(x)
  return `${n.toFixed(Math.max(0, digits))}%`
}

export default {
  clampPct,
  parseDate,
  daysUntil,
  expirySoon,
  formatPercent,
}