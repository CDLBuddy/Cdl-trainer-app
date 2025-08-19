// Path: src/admin/dashboard/hooks/subhooks/useUserExports.js
// ============================================================================
// useUserExports
// - Thin wrapper around utils/exports with toasts + quality-of-life options
// - Backward compatible:
//     exportUsersToCSV(list, filename?)
//     exportUsersToPDF(list)
// - Enhancements:
//   • Accepts an optional options object instead of filename for CSV:
//       exportUsersToCSV(list, { filename?: string, columns?: string[] })
//   • Defensive empty/shape checks
//   • Stable callbacks (useCallback) with toast integration
// ============================================================================

import { useCallback } from 'react'
import { useToast } from '@components/ToastContext.js'
import {
  exportUsersToCSV as csvUtil,
  exportUsersToPDF as pdfUtil,
} from '../../utils/exports.js'

/**
 * Normalize the second arg (filenameOrOpts) into an options object.
 * Backward compatible with the old `(list, filename?)` signature.
 */
function normalizeCsvOpts(filenameOrOpts) {
  if (!filenameOrOpts) return {}
  if (typeof filenameOrOpts === 'string') return { filename: filenameOrOpts }
  if (typeof filenameOrOpts === 'object') return filenameOrOpts
  return {}
}

/**
 * Best-effort light validation to avoid exporting junk.
 */
function isLikelyUserList(list) {
  return Array.isArray(list) && (list.length === 0 || typeof list[0] === 'object')
}

export function useUserExports() {
  const { showToast } = useToast()

  /**
   * Export to CSV.
   * @param {Array<object>} list
   * @param {string|{filename?:string, columns?:string[]}} [filenameOrOpts]
   */
  const exportUsersToCSV = useCallback(
    (list, filenameOrOpts) => {
      if (!isLikelyUserList(list)) {
        showToast('Nothing to export.', 'error')
        return
      }
      const opts = normalizeCsvOpts(filenameOrOpts)
      // Delegate to utils; utils already handles toasts and escaping.
      csvUtil(list, opts.filename || 'users', showToast, opts.columns)
    },
    [showToast]
  )

  /**
   * Export to PDF.
   * @param {Array<object>} list
   */
  const exportUsersToPDF = useCallback(
    (list) => {
      if (!isLikelyUserList(list)) {
        showToast('Nothing to export.', 'error')
        return
      }
      pdfUtil(list, showToast)
    },
    [showToast]
  )

  return { exportUsersToCSV, exportUsersToPDF }
}