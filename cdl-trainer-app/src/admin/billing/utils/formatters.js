// Path: src/admin/billing/utils/formatters.js
// ============================================================================
// Admin • Billing • Formatters
// - Safe currency + date formatting helpers
// - Backward-compatible: existing calls still work
// - Optional params let you override locale/currency and date styles
// ============================================================================

/**
 * Format an amount expressed in CENTS as a currency string.
 *
 * @param {number|string|bigint|null|undefined} cents
 * @param {{ locale?: string, currency?: string, minimumFractionDigits?: number, maximumFractionDigits?: number }=} opts
 * @returns {string}
 *
 * Usage:
 *   formatCurrency(2599)                     -> "$25.99"
 *   formatCurrency(2599, { currency: 'USD' })
 *   formatCurrency(2599, { locale: 'en-GB', currency: 'GBP' })
 */
export function formatCurrency(
  cents,
  { locale, currency = 'USD', minimumFractionDigits, maximumFractionDigits } = {}
) {
  // Normalize input
  let n = Number(cents)
  if (!Number.isFinite(n)) n = 0

  // Convert cents → dollars
  const amount = n / 100

  const nf = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...(minimumFractionDigits != null ? { minimumFractionDigits } : null),
    ...(maximumFractionDigits != null ? { maximumFractionDigits } : null),
  })

  return nf.format(amount)
}

/**
 * Convert various inputs to a real Date or return null if invalid.
 * Accepts:
 *  - JS Date
 *  - ISO string
 *  - Firestore Timestamp-like (has .toDate())
 *  - Epoch ms (number-like)
 *
 * @param {any} val
 * @returns {Date|null}
 */
export function toDateSafe(val) {
  if (!val && val !== 0) return null
  try {
    if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val
    if (typeof val?.toDate === 'function') {
      const d = val.toDate()
      return Number.isNaN(d?.getTime?.()) ? null : d
    }
    const d = new Date(val)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

/**
 * Format a date as a locale date string.
 *
 * @param {any} val
 * @param {{ locale?: string, dateStyle?: 'full'|'long'|'medium'|'short' }=} opts
 * @returns {string}
 *
 * Usage:
 *   fmtDate('2025-07-10')                            -> "7/10/2025" (browser locale)
 *   fmtDate(ts, { dateStyle: 'medium' })             -> "Jul 10, 2025"
 *   fmtDate(ts, { locale: 'en-GB', dateStyle: 'long'}) -> "10 July 2025"
 */
export function fmtDate(val, { locale, dateStyle } = {}) {
  const d = toDateSafe(val)
  if (!d) return '—'
  try {
    if (dateStyle) {
      return new Intl.DateTimeFormat(locale, { dateStyle }).format(d)
    }
    return d.toLocaleDateString(locale)
  } catch {
    return '—'
  }
}

/**
 * Format a date/time as a locale string.
 *
 * @param {any} val
 * @param {{ locale?: string, dateStyle?: 'full'|'long'|'medium'|'short', timeStyle?: 'full'|'long'|'medium'|'short' }=} opts
 * @returns {string}
 *
 * Usage:
 *   fmtDateTime(Date.now(), { dateStyle: 'medium', timeStyle: 'short' })
 */
export function fmtDateTime(val, { locale, dateStyle = 'medium', timeStyle = 'short' } = {}) {
  const d = toDateSafe(val)
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle, timeStyle }).format(d)
  } catch {
    return d.toLocaleString(locale)
  }
}