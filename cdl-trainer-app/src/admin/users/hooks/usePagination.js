// Path: src/admin/dashboard/hooks/subhooks/usePagination.js
// ============================================================================
// usePagination
// - Client-side pagination with defensive clamping
// - Backward compatible return shape:
//   { page, setPage, pageSize, setPageSize, start, end, pageSafe, pageCount }
// - Extras: next/prev, setPageSafe, hasPrev/hasNext, first/last indices,
//           optional localStorage persistence, optional page size options.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'

/**
 * @param {Object} opts
 * @param {number} [opts.total=0]             Total number of items
 * @param {number} [opts.pageSizeDefault=25]  Initial page size
 * @param {number[]} [opts.pageSizeOptions=[10,25,50,100]] Allowed sizes (for UIs)
 * @param {string} [opts.persistKey]          If provided, persist {page,pageSize} in localStorage
 */
export function usePagination({
  total = 0,
  pageSizeDefault = 25,
  pageSizeOptions = [10, 25, 50, 100],
  persistKey,
} = {}) {
  // Optional persisted state
  const readPersist = () => {
    if (!persistKey) return null
    try {
      const raw = localStorage.getItem(persistKey)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
  const initial = readPersist()

  const [page, _setPage] = useState(() => Math.max(1, Number(initial?.page) || 1))
  const [pageSize, _setPageSize] = useState(
    () => Number(initial?.pageSize) || pageSizeDefault
  )

  // Clamp derived values
  const pageCount = Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)))
  const pageSafe = Math.min(Math.max(1, page), pageCount)

  // Persist when requested
  useEffect(() => {
    if (!persistKey) return
    try {
      localStorage.setItem(persistKey, JSON.stringify({ page, pageSize }))
    } catch {
      /* ignore */
    }
  }, [persistKey, page, pageSize])

  // Auto-clamp page when total or pageSize change
  useEffect(() => {
    if (page !== pageSafe) _setPage(pageSafe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSafe])

  // Reset to page 1 when pageSize changes (common UX), but keep explicit setter available
  const setPageSize = (n) => {
    const size = Math.max(1, Number(n) || pageSizeDefault)
    _setPageSize(size)
    _setPage(1)
  }

  const setPage = (n) => _setPage(Math.max(1, Math.min(Number(n) || 1, pageCount)))
  const setPageSafe = (n) => setPage(n)

  const next = () => setPage(pageSafe + 1)
  const prev = () => setPage(pageSafe - 1)

  const slice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize
    const end = start + pageSize
    const firstIndex = total ? start + 1 : 0
    const lastIndex = Math.min(end, total)
    const hasPrev = pageSafe > 1
    const hasNext = pageSafe < pageCount
    return { start, end, pageSafe, pageCount, firstIndex, lastIndex, hasPrev, hasNext }
  }, [pageSafe, pageSize, pageCount, total])

  // Backward-compatible shape + helpful extras
  return {
    page,
    setPage,
    pageSize,
    setPageSize,

    // original return fields
    start: slice.start,
    end: slice.end,
    pageSafe: slice.pageSafe,
    pageCount: slice.pageCount,

    // extras
    firstIndex: slice.firstIndex,
    lastIndex: slice.lastIndex,
    hasPrev: slice.hasPrev,
    hasNext: slice.hasNext,
    next,
    prev,
    setPageSafe,
    pageSizeOptions,
  }
}