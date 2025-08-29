// Path: src/admin/billing/utils/csv.js
// ============================================================================
// Admin • Billing • CSV helper (browser)
// - Safe CSV escaping
// - Optional UTF-8 BOM for Excel compatibility
// - Configurable delimiter/newline (defaults: "," and CRLF)
// - No external deps; callers can keep using the same signature
// ============================================================================

/**
 * Download a CSV file (browser).
 *
 * @param {string} name    Base filename (no extension). A date suffix is appended.
 * @param {Array<string>} headers  Header cells (will be escaped)
 * @param {Array<Array<any>>} rows Data rows; each row is an array of cells
 * @param {{ bom?: boolean, delimiter?: string, newline?: string }=} opts
 *   - bom: include UTF-8 BOM for Excel (default: true)
 *   - delimiter: CSV field separator (default: ",")
 *   - newline: line separator (default: "\r\n")
 */
export function downloadCsv(name, headers, rows, opts = {}) {
  const { bom = true, delimiter = ',', newline = '\r\n' } = opts

  // Defensive guards
  const safeHeaders = Array.isArray(headers) ? headers : []
  const safeRows = Array.isArray(rows) ? rows : []

  // CSV escape: double-up quotes and wrap in quotes
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`

  const headerLine = safeHeaders.map(esc).join(delimiter)
  const bodyLines = safeRows.map(r =>
    (Array.isArray(r) ? r : [r]).map(esc).join(delimiter)
  )
  const content = [headerLine, ...bodyLines].join(newline)

  // Add BOM for Excel friendliness unless explicitly disabled
  const prefix = bom ? '\uFEFF' : ''

  const blob = new Blob([prefix, content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // Revoke on next tick to ensure the click has consumed the URL
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
