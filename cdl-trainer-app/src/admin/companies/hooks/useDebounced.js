// Path: src/admin/companies/hooks/useDebounced.js
// ======================================================================
// useDebounced
// - Delays propagation of a value until user input has "settled"
// - SSR-safe, side-effect free, React-optimized
// ======================================================================

import { useEffect, useState } from 'react'

/**
 * useDebounced
 * @template T
 * @param {T} value - Incoming value to debounce
 * @param {number} [delay=250] - Debounce time in ms
 * @returns {T} Debounced value
 */
export default function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(handle)
  }, [value, delay])

  return debounced
}
