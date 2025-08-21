// Robust Excel helpers using exceljs (read + write) with safety guards.
// - Browser-first; Node-safe fallbacks behind feature checks.
// - Guards: file type/size, max rows/cols, null-prototype + key sanitization.
// - Sheet selection by name or index.
// - Optional header mapping (return objects keyed by header row).
// - Lazy loads exceljs to avoid bloating initial bundles.

const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor'])
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

/** Default limits tuned for typical admin uploads */
const DEFAULT_LIMITS = Object.freeze({
  maxBytes: 8 * 1024 * 1024, // 8 MB
  maxRows: 20000,
  maxCols: 256,
})

/** Create a null-prototype object and copy safe keys */
function createSafeObject(entries) {
  const obj = Object.create(null)
  for (const [k, v] of entries) {
    if (!BLOCKED_KEYS.has(k)) obj[k] = v
  }
  return obj
}

/** Safe, cross-platform filename sanitizer (no control chars in regex) */
export function sanitizeFilename(name = 'export.xlsx') {
  const s = String(name)
  let cleaned = ''
  const forbidden = '<>:"/\\|?*' // printable only
  for (const ch of s) {
    const cp = ch.codePointAt(0)
    if (cp <= 31 || forbidden.includes(ch)) cleaned += '_'
    else cleaned += ch
  }
  cleaned = cleaned.trim().replace(/[. ]+$/g, '')
  if (cleaned === '' || cleaned === '.' || cleaned === '..') cleaned = 'unnamed'

  let base = cleaned
  let ext = ''
  const lastDot = cleaned.lastIndexOf('.')
  if (lastDot > 0) {
    base = cleaned.slice(0, lastDot)
    ext = cleaned.slice(lastDot)
  }
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)) base = '_' + base
  base = base.replace(/_+/g, '_')

  const MAX = 180
  const allowBase = Math.max(1, MAX - ext.length)
  if (base.length > allowBase) base = base.slice(0, allowBase)

  return base + ext
}

/** Coerce supported inputs to ArrayBuffer */
async function toArrayBuffer(input) {
  if (input == null) throw new TypeError('parseXlsxFile: no input provided')
  if (input instanceof ArrayBuffer) return input
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    return await input.arrayBuffer()
  }
  // Node Buffer support
  if (typeof Buffer !== 'undefined' && typeof input === 'object' && Buffer.isBuffer?.(input)) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
  }
  // Typed arrays
  if (ArrayBuffer.isView?.(input)) {
    const { buffer, byteOffset, byteLength } = input
    return buffer.slice(byteOffset, byteOffset + byteLength)
  }
  // Fallback: assume already an ArrayBuffer-like
  if (input?.byteLength != null && input?.slice) return input
  throw new TypeError('parseXlsxFile: unsupported input type')
}

/** Lazy-load exceljs so it doesn’t inflate your initial bundles */
async function loadExcelJS() {
  // exceljs has both CJS/ESM builds; dynamic import keeps it on-demand
  const m = await import('exceljs')
  // Some bundlers put the class on default, some on the module
  return m.default ?? m
}

/**
 * Parse an .xlsx into rows or objects.
 * @param {File|Blob|ArrayBuffer|Buffer|Uint8Array} file
 * @param {{
 *   sheet?: number|string,          // index (0-based) or sheet name (default: first sheet)
 *   hasHeader?: boolean,            // if true, map rows to objects using first row as headers
 *   maxBytes?: number,              // hard size cap
 *   maxRows?: number,               // hard row cap
 *   maxCols?: number,               // hard column cap
 *   trimHeader?: boolean,           // trim header cell text
 *   coerceStrings?: boolean,        // coerce non-string cell types to string
 * }=} options
 * @returns {Promise<Array<Array<any>>|Array<Record<string, any>>>}
 */
export async function parseXlsxFile(file, options = {}) {
  const {
    sheet = 0,
    hasHeader = false,
    maxBytes = DEFAULT_LIMITS.maxBytes,
    maxRows = DEFAULT_LIMITS.maxRows,
    maxCols = DEFAULT_LIMITS.maxCols,
    trimHeader = true,
    coerceStrings = false,
  } = options

  // Basic type/size checks (browser only)
  if (isBrowser && typeof File !== 'undefined' && file instanceof File) {
    const okType =
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name?.toLowerCase().endsWith('.xlsx')
    if (!okType) {
      throw new Error(`parseXlsxFile: expected .xlsx file, got "${file.type || file.name}"`)
    }
    if (file.size > maxBytes) {
      throw new Error(`parseXlsxFile: file too large (${file.size} bytes > ${maxBytes})`)
    }
  }

  const buffer = await toArrayBuffer(file)
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()

  try {
    await workbook.xlsx.load(buffer)
  } catch (err) {
    throw new Error(`parseXlsxFile: failed to read workbook — ${String(err?.message || err)}`)
  }

  // Select worksheet
  let worksheet
  if (typeof sheet === 'string') {
    worksheet = workbook.getWorksheet(sheet)
    if (!worksheet) throw new Error(`parseXlsxFile: sheet "${sheet}" not found`)
  } else {
    worksheet = workbook.worksheets?.[sheet] || workbook.worksheets?.[0]
    if (!worksheet) throw new Error('parseXlsxFile: no worksheets found')
  }

  // Hard caps based on sheet metadata (quick fail)
  const metaRows = worksheet?.rowCount ?? 0
  const metaCols = worksheet?.columnCount ?? 0
  if (metaRows > 0 && metaRows > maxRows) {
    throw new Error(`parseXlsxFile: too many rows (${metaRows} > ${maxRows})`)
  }
  if (metaCols > 0 && metaCols > maxCols) {
    throw new Error(`parseXlsxFile: too many columns (${metaCols} > ${maxCols})`)
  }

  const out = []
  let rowCount = 0
  let headers = null

  worksheet.eachRow((row) => {
    // exceljs row.values is 1-based; index 0 is undefined
    const arr = row.values.slice(1)

    if (arr.length > maxCols) {
      throw new Error(`parseXlsxFile: too many columns in a row (${arr.length} > ${maxCols})`)
    }

    const normalized = coerceStrings ? arr.map((v) => (v == null ? '' : String(v))) : arr

    if (hasHeader && rowCount === 0) {
      headers = normalized.map((h) => {
        let key = h == null ? '' : String(h)
        if (trimHeader) key = key.trim()
        if (!key) key = 'col_' + Math.random().toString(36).slice(2, 8)
        if (BLOCKED_KEYS.has(key)) key = `_${key}`
        return key
      })
    } else if (hasHeader && headers) {
      const pairs = headers.map((k, i) => [k, normalized[i]])
      out.push(createSafeObject(pairs))
    } else {
      out.push(normalized)
    }

    rowCount++
    if (rowCount > maxRows) {
      throw new Error(`parseXlsxFile: too many rows (${rowCount} > ${maxRows})`)
    }
  })

  return out
}

/**
 * Create an .xlsx from rows or objects and trigger a download (browser),
 * or return a Buffer/Uint8Array (Node).
 * @param {Array<Array<any>>|Array<Record<string, any>>} data
 * @param {{
 *   filename?: string,
 *   sheetName?: string,
 *   fromObjects?: boolean,     // if true, treat input as objects; headers auto-generated
 *   headers?: string[],        // optional explicit header order when fromObjects=true
 * }} options
 * @returns {Promise<void|Uint8Array|Buffer>}
 */
export async function exportXlsxFile(
  data,
  { filename = 'export.xlsx', sheetName = 'Sheet1', fromObjects = false, headers = null } = {}
) {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  if (fromObjects) {
    if (!Array.isArray(data) || (data[0] && typeof data[0] !== 'object')) {
      throw new TypeError('exportXlsxFile: expected array of objects when fromObjects=true')
    }
    const keys =
      headers && headers.length
        ? headers
        : Array.from(
            new Set(
              data.flatMap((row) => Object.keys(row || {})).filter((k) => !BLOCKED_KEYS.has(k))
            )
          )

    worksheet.addRow(keys) // header row
    for (const obj of data) {
      const safe = createSafeObject(Object.entries(obj || {}))
      worksheet.addRow(keys.map((k) => safe[k] ?? ''))
    }
  } else {
    if (!Array.isArray(data)) {
      throw new TypeError('exportXlsxFile: expected array of arrays')
    }
    for (const row of data) worksheet.addRow(Array.isArray(row) ? row : [row])
  }

  if (isBrowser) {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = sanitizeFilename(filename)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      URL.revokeObjectURL(url)
    }
    return
  } else {
    const buf = await workbook.xlsx.writeBuffer()
    return typeof Buffer !== 'undefined' ? Buffer.from(buf) : buf
  }
}

/* ------------------------------------------------------------------ */
/* Back-compat + expected exports elsewhere in the app                 */
/* ------------------------------------------------------------------ */

/** Your build uses this to gate XLSX features; exceljs loads on demand. */
export const isXlsxAvailable = () => true

/** Alias expected by older imports */
export async function parseXlsxToWalkthrough(file, options = {}) {
  return parseXlsxFile(file, options)
}

/** Default export required by some call sites */
export default parseXlsxToWalkthrough
