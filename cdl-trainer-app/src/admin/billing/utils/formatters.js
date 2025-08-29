// Path: src/admin/billing/utils/formatters.js
// ============================================================================
// Billing formatters (tree-shakable, no side effects)
// - Money: cents → "$1,234.56", short "$3.2k"
// - Dates: safe short date & date-time
// - Perf: memoized Intl formatters; no globals mutated
// ============================================================================

// @ts-check

/* -------------------------------- Internals -------------------------------- */

const isFiniteNumber = v => Number.isFinite(v)
const toNumber = (v, fb = 0) => (isFiniteNumber(+v) ? +v : fb)
const fixNegZero = n => (Object.is(n, -0) ? 0 : n)

// cents → dollars (float)
export const centsToDollars = cents => fixNegZero(toNumber(cents, 0) / 100)
// dollars → cents (int)
export const dollarsToCents = dollars =>
  Math.round(
    toNumber(
      typeof dollars === 'string' ? dollars.replace(/[$,\s]/g, '') : dollars,
      0
    ) * 100
  )

/* ----------------------------- Intl memoization ---------------------------- */

const _fmtCache = new Map()

function currencyKey(locale, currency, min, max, notation, compactDisp) {
  return `C|${locale}|${currency}|${min}|${max}|${notation || ''}|${compactDisp || ''}`
}
function dateKey(locale, opts) {
  // minimal key for the 2 patterns we use
  return `D|${locale}|${opts.month}|${opts.day}|${opts.year}|${opts.hour || ''}|${opts.minute || ''}`
}

/**
 * @param {{
 *   locale?: string,
 *   currency?: string,
 *   minimumFractionDigits?: number,
 *   maximumFractionDigits?: number,
 *   notation?: string,
 *   compactDisplay?: string
 * }} [opts]
 * @returns {Intl.NumberFormat}
 */
/**
 * @param {{
 *   locale?: string,
 *   currency?: string,
 *   minimumFractionDigits?: number,
 *   maximumFractionDigits?: number,
 *   notation?: "standard" | "scientific" | "engineering" | "compact",
 *   compactDisplay?: string
 * }} [opts]
 * @returns {Intl.NumberFormat}
 */
function getCurrencyFormatter({
  locale = 'en-US',
  currency = 'USD',
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  notation,
  compactDisplay,
} = {}) {
  const key = currencyKey(
    locale,
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
    notation,
    compactDisplay
  )
  let nf = _fmtCache.get(key)
  if (!nf) {
    // Only allow valid notation values
    const validNotations = ['standard', 'scientific', 'engineering', 'compact']
    /** @type {Intl.NumberFormatOptions} */
    const options = {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }
    if (validNotations.includes(notation)) {
      options.notation = notation
    }
    if (compactDisplay) {
      options.compactDisplay = compactDisplay === 'long' ? 'long' : 'short'
    }
    nf = new Intl.NumberFormat(locale, options)
    _fmtCache.set(key, nf)
  }
  return nf
}

/** @returns {Intl.DateTimeFormat} */
function getDateFormatter(locale = 'en-US', withTime = false) {
  /** @type {Intl.DateTimeFormatOptions} */
  const opts = withTime
    ? {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    : { month: 'short', day: 'numeric', year: 'numeric' }
  const key = dateKey(locale, opts)
  let df = _fmtCache.get(key)
  if (!df) {
    df = new Intl.DateTimeFormat(locale, opts)
    _fmtCache.set(key, df)
  }
  return df
}
/** Extract locale-aware currency symbol (memoized). */
export function getCurrencySymbol(locale = 'en-US', currency = 'USD') {
  const key = `SYM|${locale}|${currency}`
  let sym = _fmtCache.get(key)
  if (!sym) {
    try {
      const parts = getCurrencyFormatter({
        locale,
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).formatToParts(0)
      sym = parts.find(p => p.type === 'currency')?.value || '$'
    } catch {
      sym = '$'
    }
    _fmtCache.set(key, sym)
  }
  return sym
}

/**
 * Format cents as full currency, e.g. "$1,234.56"
 * @param {number} cents
 * @param {{
 *   currency?: string,
 *   locale?: string,
 *   minimumFractionDigits?: number,
 *   maximumFractionDigits?: number,
 *   notation?: "standard" | "scientific" | "engineering" | "compact",
 *   compactDisplay?: "short" | "long"
 * }} [opts]
 */
export function formatCurrency(
  cents,
  {
    currency = 'USD',
    locale = 'en-US',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    notation,
    compactDisplay,
  } = {}
) {
  const dollars = centsToDollars(cents)
  try {
    return getCurrencyFormatter({
      locale,
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
      notation,
      compactDisplay,
    }).format(dollars)
  } catch {
    const fixed = dollars.toFixed(maximumFractionDigits)
    return `${getCurrencySymbol(locale, currency)}${fixed}`
  }
}

/**
 * Short currency from cents, e.g. "$3.2k", "$1.5M"
 * Keeps sign for negatives. Uses 1 decimal under 10; otherwise rounds.
 *
 * By default uses a manual suffix (k/M/B) for consistent output.
 * Pass { preferNative: true } to try Intl "compact" first, with manual fallback.
 *
 * @param {number} cents
 * @param {{ currency?: string, locale?: string, digits?: number, preferNative?: boolean }} [opts]
 */
export function toCurrencyShort(
  cents,
  { currency = 'USD', locale = 'en-US', digits = 1, preferNative = false } = {}
) {
  const dollars = centsToDollars(cents)
  const abs = Math.abs(dollars)

  // Try native compact if requested and supported
  if (preferNative) {
    try {
      const nf = getCurrencyFormatter({
        locale,
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: Math.abs(dollars) < 10 ? digits : 0,
        notation: 'compact',
        compactDisplay: 'short',
      })
      // Some engines produce "-$0" around tiny values; normalize
      const s = nf.format(dollars)
      if (s && typeof s === 'string')
        return s.replace(/^-?\$?0(\.0+)?([A-Za-z]*)$/, match =>
          match.replace(/^-/, '')
        )
    } catch {
      // fall through to manual
    }
  }

  // Manual compact (stable across engines)
  let value = dollars
  let suffix = ''
  if (abs >= 1_000_000_000) {
    value = dollars / 1_000_000_000
    suffix = 'B'
  } else if (abs >= 1_000_000) {
    value = dollars / 1_000_000
    suffix = 'M'
  } else if (abs >= 1_000) {
    value = dollars / 1_000
    suffix = 'k'
  }

  const symbol = getCurrencySymbol(locale, currency)
  const formatted =
    Math.abs(value) < 10 ? value.toFixed(digits) : Math.round(value).toString()
  const sign = dollars < 0 ? '-' : ''
  return `${sign}${symbol}${formatted}${suffix}`
}

/* --------------------------------- Dates ---------------------------------- */

/** Short date like "Aug 20, 2025" */
export function fmtDate(input, locale = 'en-US') {
  try {
    const d = input instanceof Date ? input : new Date(input)
    return getDateFormatter(locale, false).format(d)
  } catch {
    return '—'
  }
}

/** Date + time like "Aug 20, 2025, 3:42 PM" */
export function fmtDateTime(input, locale = 'en-US') {
  try {
    const d = input instanceof Date ? input : new Date(input)
    return getDateFormatter(locale, true).format(d)
  } catch {
    return '—'
  }
}
