// Path: src/walkthrough-data/utils/parseXlsx.js
// ============================================================================
// Robust Excel helpers using exceljs (read + write) with safety guards.
// - Browser-first; Node-safe fallbacks behind feature checks.
// - Guards: file type/size, max rows/cols, null-prototype + key sanitization.
// - Sheet selection by index/name/regex/predicate.
// - Optional header mapping (return objects keyed by header row) with transforms.
// - Value coercion: strings, dates → ISO, custom mapper.
// - Lazy-load exceljs to keep initial bundles light.
// - Auto column widths on export (configurable).
// ============================================================================

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor'])
const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined'

/** Default limits tuned for typical admin uploads */
const DEFAULT_LIMITS = Object.freeze({
  maxBytes: 8 * 1024 * 1024, // 8 MB
  maxRows: 20000,
  maxCols: 256,
})

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

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
  if (
    typeof Buffer !== 'undefined' &&
    typeof input === 'object' &&
    Buffer.isBuffer?.(input)
  ) {
    return input.buffer.slice(
      input.byteOffset,
      input.byteOffset + input.byteLength
    )
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
  const m = await import('exceljs')
  return m.default ?? m
}

/** Normalize header key per chosen transform */
function transformHeader(key, mode, trimHeader) {
  let k = key == null ? '' : String(key)
  if (trimHeader) k = k.trim()
  if (!k) k = 'col_' + Math.random().toString(36).slice(2, 8)
  switch (mode) {
    case 'lower':
      k = k.toLowerCase()
      break
    case 'camel':
      k = toCamel(k)
      break
    case 'slug':
      k = toSlug(k)
      break
    default:
      /* preserve */ break
  }
  if (BLOCKED_KEYS.has(k)) k = `_${k}`
  return k
}
function toCamel(s) {
  const t = String(s).replace(/[_\s-]+(.)?/g, (_, c) =>
    c ? c.toUpperCase() : ''
  )
  const head = t.charAt(0).toLowerCase()
  return head + t.slice(1)
}
function toSlug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Convert exceljs cell.value to a plain JS value */
function coerceValue(v, { coerceStrings, dateAsISO, valueMapper }) {
  if (valueMapper) {
    const mapped = valueMapper(v)
    if (mapped !== undefined) return mapped
  }
  // Rich text object → plain text
  if (v && typeof v === 'object') {
    if (v.text != null) v = v.text
    else if (Array.isArray(v.richText))
      v = v.richText.map(x => x?.text || '').join('')
    else if (v.result != null)
      v = v.result // formula result
    else if (v.hyperlink && v.text) v = v.text
  }
  if (v instanceof Date) return dateAsISO ? v.toISOString() : v
  if (coerceStrings) return v == null ? '' : String(v)
  return v
}

/** Resolve a worksheet by index/name/regex/predicate */
function resolveWorksheet(workbook, selector) {
  if (typeof selector === 'number') {
    return workbook.worksheets?.[selector] || workbook.worksheets?.[0] || null
  }
  if (typeof selector === 'string') {
    return workbook.getWorksheet(selector) || null
  }
  if (selector instanceof RegExp) {
    return (
      workbook.worksheets?.find(ws => selector.test(String(ws?.name))) || null
    )
  }
  if (typeof selector === 'function') {
    return workbook.worksheets?.find(ws => !!selector(ws)) || null
  }
  return workbook.worksheets?.[0] || null
}

/* ------------------------------------------------------------------ */
/* Reader                                                              */
/* ------------------------------------------------------------------ */

/**
 * Parse an .xlsx into rows or objects.
 * @param {File|Blob|ArrayBuffer|Buffer|Uint8Array} file
 * @param {{
 *   sheet?: number|string|RegExp|((ws:any)=>boolean), // index (0-based), name, regex, or predicate
 *   hasHeader?: boolean,            // if true, map rows to objects using first row as headers
 *   headerCase?: 'preserve'|'lower'|'camel'|'slug',
 *   trimHeader?: boolean,           // trim header cell text
 *   coerceStrings?: boolean,        // coerce non-string cell types to string
 *   dateAsISO?: boolean,            // when encountering Date, convert to ISO string
 *   valueMapper?: (raw:any)=>any,   // last-chance value coercion hook
 *   includeEmptyRows?: boolean,     // include empty rows (exceljs eachRow option)
 *   maxBytes?: number,              // hard size cap
 *   maxRows?: number,               // hard row cap
 *   maxCols?: number,               // hard column cap
 * }=} options
 * @returns {Promise<Array<Array<any>>|Array<Record<string, any>>>}
 */
export async function parseXlsxFile(file, options = {}) {
  const {
    sheet = 0,
    hasHeader = false,
    headerCase = 'camel',
    trimHeader = true,
    coerceStrings = false,
    dateAsISO = false,
    valueMapper = null,
    includeEmptyRows = false,
    maxBytes = DEFAULT_LIMITS.maxBytes,
    maxRows = DEFAULT_LIMITS.maxRows,
    maxCols = DEFAULT_LIMITS.maxCols,
  } = options

  // Basic type/size checks (browser only)
  if (isBrowser && typeof File !== 'undefined' && file instanceof File) {
    const okType =
      file.type === XLSX_MIME || file.name?.toLowerCase().endsWith('.xlsx')
    if (!okType) {
      throw new Error(
        `parseXlsxFile: expected .xlsx file, got "${file.type || file.name}"`
      )
    }
    if (file.size > maxBytes) {
      throw new Error(
        `parseXlsxFile: file too large (${file.size} bytes > ${maxBytes})`
      )
    }
  }

  const buffer = await toArrayBuffer(file)
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()

  try {
    await workbook.xlsx.load(buffer)
  } catch (err) {
    throw new Error(
      `parseXlsxFile: failed to read workbook — ${String(err?.message || err)}`
    )
  }

  const worksheet = resolveWorksheet(workbook, sheet)
  if (!worksheet) throw new Error('parseXlsxFile: no worksheet resolved')

  // Hard caps based on sheet metadata (quick fail)
  const metaRows = worksheet?.rowCount ?? 0
  const metaCols = worksheet?.columnCount ?? 0
  if (metaRows > 0 && metaRows > maxRows) {
    throw new Error(`parseXlsxFile: too many rows (${metaRows} > ${maxRows})`)
  }
  if (metaCols > 0 && metaCols > maxCols) {
    throw new Error(
      `parseXlsxFile: too many columns (${metaCols} > ${maxCols})`
    )
  }

  /** @type {any[]} */
  const out = []
  let rowCount = 0
  /** @type {string[]|null} */
  let headers = null

  worksheet.eachRow({ includeEmpty: !!includeEmptyRows }, row => {
    // Build a normalized flat array using actualCellCount or columnCount cap
    const colCount = Math.min(
      Math.max(row.cellCount || row.actualCellCount || 0, 0),
      maxCols
    )
    const arr = []
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c)
      arr.push(
        coerceValue(cell?.value, { coerceStrings, dateAsISO, valueMapper })
      )
    }

    // If the row is entirely empty and we don't want empties → skip
    const allEmpty = arr.every(
      v => v == null || (typeof v === 'string' && v.trim() === '')
    )
    if (allEmpty && !includeEmptyRows) return

    if (hasHeader && rowCount === 0) {
      headers = arr.map(h => transformHeader(h, headerCase, trimHeader))
    } else if (hasHeader && headers) {
      const pairs = headers.map((k, i) => [k, arr[i]])
      out.push(createSafeObject(pairs))
    } else {
      out.push(arr)
    }

    rowCount++
    if (rowCount > maxRows) {
      throw new Error(`parseXlsxFile: too many rows (${rowCount} > ${maxRows})`)
    }
  })

  return out
}

/* ------------------------------------------------------------------ */
/* Writer                                                              */
/* ------------------------------------------------------------------ */

/**
 * Create an .xlsx from rows or objects and trigger a download (browser),
 * or return a Buffer/Uint8Array (Node).
 * @param {Array<Array<any>>|Array<Record<string, any>>} data
 * @param {{
 *   filename?: string,
 *   sheetName?: string,
 *   fromObjects?: boolean,     // if true, treat input as objects; headers auto-generated
 *   headers?: string[],        // optional explicit header order when fromObjects=true
 *   autoWidth?: boolean,       // auto-fit columns based on content
 *   maxColWidth?: number,      // cap for auto width (chars)
 * }} options
 * @returns {Promise<void|Uint8Array|Buffer>}
 */
export async function exportXlsxFile(
  data,
  {
    filename = 'export.xlsx',
    sheetName = 'Sheet1',
    fromObjects = false,
    headers = null,
    autoWidth = true,
    maxColWidth = 50,
  } = {}
) {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  if (fromObjects) {
    if (!Array.isArray(data) || (data[0] && typeof data[0] !== 'object')) {
      throw new TypeError(
        'exportXlsxFile: expected array of objects when fromObjects=true'
      )
    }
    const keys =
      headers && headers.length
        ? headers
        : Array.from(
            new Set(
              data
                .flatMap(row => Object.keys(row || {}))
                .filter(k => !BLOCKED_KEYS.has(k))
            )
          )

    worksheet.addRow(keys) // header row
    for (const obj of data) {
      const safe = createSafeObject(Object.entries(obj || {}))
      worksheet.addRow(keys.map(k => safe[k] ?? ''))
    }
  } else {
    if (!Array.isArray(data)) {
      throw new TypeError('exportXlsxFile: expected array of arrays')
    }
    for (const row of data) worksheet.addRow(Array.isArray(row) ? row : [row])
  }

  // Auto width (rough heuristic by char length)
  if (autoWidth) {
    const colCount = worksheet.columnCount
    for (let c = 1; c <= colCount; c++) {
      let maxLen = 8
      worksheet.eachRow(row => {
        const cell = row.getCell(c)
        const v = cell?.value
        const s =
          v == null
            ? ''
            : typeof v === 'string'
              ? v
              : v?.text != null
                ? String(v.text)
                : Array.isArray(v?.richText)
                  ? v.richText.map(x => x?.text || '').join('')
                  : String(v)
        if (s.length > maxLen) maxLen = s.length
      })
      worksheet.getColumn(c).width = Math.min(maxLen + 2, maxColWidth)
    }
  }

  if (isBrowser) {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: XLSX_MIME })
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
