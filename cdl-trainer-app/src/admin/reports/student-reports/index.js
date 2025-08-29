// src/admin/reports/student-reports/index.js
// ======================================================================
// Barrel for student-reports subpackage (side-effect free)
// - Re-exports pure helpers used by StudentReportDrawer
// - Adds csvFromCert(): Excel-friendly (UTF-8 BOM) single-row CSV builder
// - Tree-shake friendly; no default export
// ======================================================================

// @ts-check

import {
  buildCertPayload,
  buildTprCsvRow,
  toCsv,
  toISODate,
} from './cert-template.js'
import { openPrintableCert, downloadCsv, copy } from './pdf-utils.js'

export {
  buildCertPayload,
  buildTprCsvRow,
  toCsv,
  toISODate,
  openPrintableCert,
  downloadCsv,
  copy,
}

/**
 * Build a single-row CSV string from a certificate payload.
 * Ensures a UTF-8 BOM for Excel, stable column order, and a trailing newline.
 *
 * @param {ReturnType<typeof buildCertPayload>} cert
 * @param {string[]=} headers Optional header order; defaults to TPR-friendly order.
 * @returns {string} CSV text (with UTF-8 BOM)
 */
export function csvFromCert(cert, headers) {
  // Stable default order matching our buildTprCsvRow() keys
  const DEFAULT_HEADERS = [
    'ProviderTPRID',
    'ProviderName',
    'CDLClass',
    'Endorsement',
    'TraineeFullName',
    'TraineeDOB',
    'CLPNumber',
    'CLPIssuingState',
    'CompletionDate',
    'TheoryCompleted',
    'BTWCompleted',
  ]

  const row = buildTprCsvRow(cert)
  const cols =
    Array.isArray(headers) && headers.length ? headers : DEFAULT_HEADERS

  // Build body without BOM, then prepend BOM and ensure final newline
  const body = toCsv([row], cols).replace(/^\uFEFF/, '')
  const withBom = '\uFEFF' + body + (/\r?\n$/.test(body) ? '' : '\r\n')
  return withBom
}
