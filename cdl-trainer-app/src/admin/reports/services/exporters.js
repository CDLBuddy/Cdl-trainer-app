// src/admin/reports/services/exporters.js
// ============================================================================
// Export helpers (CSV/JSON)
// - Excel-friendly UTF-8 BOM for CSV
// - RFC-4180 style quoting (delimiter/newline/quotes/leading-trailing space)
// - Stable column order (first-seen keys unless you pass columns)
// - Formula-injection guard for Excel (escapeFormulas: true)
// - Safe download across modern browsers (handles Safari quirks)
// - Backward compatible signatures:
//     toCSV(rows, 'report.csv')
//     toJSON(rows, 'report.json')
// - Extended signatures:
//     toCSV(rows, { filename, columns, delimiter, eol, addBOM, headerLabels, escapeFormulas })
//     toJSON(rows, { filename, pretty, replacer })
// ============================================================================

/** @typedef {{ key: string, label?: string }} ColumnDef */
/** @typedef {{ filename?: string, columns?: (string|ColumnDef)[], delimiter?: string, eol?: string, addBOM?: boolean, headerLabels?: Record<string,string>, escapeFormulas?: boolean }} CsvOptions */
/** @typedef {{ filename?: string, pretty?: number|boolean, replacer?: (this:any, key:string, value:any)=>any }} JsonOptions */

/* --------------------------------- Download -------------------------------- */

function ensureExt(name = 'download', ext = '.txt') {
  if (!ext.startsWith('.')) ext = `.${ext}`
  return name.toLowerCase().endsWith(ext.toLowerCase()) ? name : `${name}${ext}`
}

/**
 * Robust client-side download.
 * - Appends link to DOM (helps Safari)
 * - Revokes ObjectURL after a tick
 */
function downloadBlob(filename, mime, data) {
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime })
    const navAny = /** @type {any} */ (navigator)
    if (typeof navAny?.msSaveOrOpenBlob === 'function') { navAny.msSaveOrOpenBlob(blob, filename); return }
    if (typeof navAny?.msSaveBlob === 'function') { navAny.msSaveBlob(blob, filename); return }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 0)
  } catch {
    try {
      const text = data instanceof Blob ? '' : String(data ?? '')
      const win = window.open()
      if (win) { win.document.write(`<pre>${escapeHtml(text)}</pre>`); win.document.close() }
    } catch { /* ignore */ }
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/* ---------------------------------- CSV ----------------------------------- */

function normalizeColumns(rows, columns, headerLabels) {
  /** @type {ColumnDef[]} */
  const defs = []
  if (Array.isArray(columns) && columns.length) {
    for (const c of columns) {
      if (typeof c === 'string') defs.push({ key: c, label: headerLabels?.[c] || c })
      else if (c && typeof c.key === 'string') defs.push({ key: c.key, label: c.label || headerLabels?.[c.key] || c.key })
    }
    return defs
  }
  // Derive first-seen keys in order across all rows
  const seen = new Set()
  for (const r of rows) {
    if (r && typeof r === 'object') {
      for (const k of Object.keys(r)) if (!seen.has(k)) seen.add(k)
    }
  }
  return Array.from(seen).map((k) => ({ key: k, label: headerLabels?.[k] || k }))
}

function normalizeCell(v) {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString()
  const t = typeof v
  if (t === 'string') return v
  if (t === 'number' || t === 'boolean' || t === 'bigint') return String(v)
  try { return JSON.stringify(v) } catch { return String(v) }
}

/** Guard against Excel formula injection (='@+-) */
function sanitizeForExcel(s, enabled) {
  if (!enabled) return s
  return /^[=\-+@]/.test(s) ? `'${s}` : s
}

/**
 * RFC-4180-ish CSV quoting:
 * - Quote if value contains delimiter, quote, CR/LF, or leading/trailing space
 * - Escape quotes by doubling
 */
function escapeCsvCell(s, delimiter, quote) {
  const needsQuote =
    s.includes(delimiter) ||
    s.includes(quote) ||
    s.includes('\n') ||
    s.includes('\r') ||
    /^\s|\s$/.test(s)
  if (!needsQuote) return s
  return quote + s.replaceAll(quote, quote + quote) + quote
}

function buildCsv(rows, opts = /** @type {CsvOptions} */({})) {
  const delimiter = opts.delimiter ?? ','
  const eol = opts.eol ?? '\r\n' // Excel friendly
  const quote = '"'
  const escapeFormulas = opts.escapeFormulas !== false

  const cols = normalizeColumns(rows, opts.columns, opts.headerLabels)
  const header = cols.map(c => escapeCsvCell(String(c.label ?? c.key), delimiter, quote)).join(delimiter)

  const lines = [header]
  for (const r of rows) {
    const line = cols.map(({ key }) => {
      const raw = normalizeCell(r?.[key])
      const safe = sanitizeForExcel(String(raw), escapeFormulas)
      return escapeCsvCell(safe, delimiter, quote)
    }).join(delimiter)
    lines.push(line)
  }

  let csv = lines.join(eol)
  if (opts.addBOM !== false) csv = '\uFEFF' + csv // Excel needs BOM for UTF-8
  if (!csv.endsWith(eol)) csv += eol // nice in editors
  return csv
}

/**
 * Export rows as CSV
 * @param {any[]} rows
 * @param {string|CsvOptions} filenameOrOptions
 */
export function toCSV(rows = [], filenameOrOptions = 'report.csv') {
  const opts = typeof filenameOrOptions === 'string'
    ? /** @type {CsvOptions} */({ filename: filenameOrOptions })
    : (filenameOrOptions || {})

  const filename = ensureExt(opts.filename || 'report.csv', '.csv')
  // Always build so headers appear when rows are empty but `columns` are provided
  const csv = buildCsv(Array.isArray(rows) ? rows : [], opts)
  downloadBlob(filename, 'text/csv;charset=utf-8', csv)
}

/* ---------------------------------- JSON ---------------------------------- */

function safeStringify(v, space = 2) {
  const seen = new WeakSet()
  return JSON.stringify(v, function (k, val) {
    if (val && typeof val === 'object') {
      if (seen.has(val)) return '[Circular]'
      seen.add(val)
    }
    return val
  }, space)
}

/**
 * Export rows as JSON (pretty by default)
 * @param {any[]} rows
 * @param {string|JsonOptions} filenameOrOptions
 */
export function toJSON(rows = [], filenameOrOptions = 'report.json') {
  const opts = typeof filenameOrOptions === 'string'
    ? /** @type {JsonOptions} */({ filename: filenameOrOptions })
    : (filenameOrOptions || {})

  const filename = ensureExt(opts.filename || 'report.json', '.json')
  const prettySpaces = opts.pretty === false ? 0 : (typeof opts.pretty === 'number' ? opts.pretty : 2)

  let content
  try {
    content = JSON.stringify(rows ?? [], opts.replacer ?? null, prettySpaces) + '\n'
  } catch {
    content = safeStringify(rows ?? [], prettySpaces) + '\n'
  }
  downloadBlob(filename, 'application/json;charset=utf-8', content)
}

/* ------------------------------ Named exports ----------------------------- */
export const __exporterInternals = {
  downloadBlob,
  buildCsv,
  normalizeColumns,
  normalizeCell,
  escapeCsvCell,
  sanitizeForExcel,
  safeStringify,
}