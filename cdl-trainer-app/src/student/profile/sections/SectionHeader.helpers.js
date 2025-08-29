// Path: src/student/profile/sections/SectionHeader.helpers.js
// Small helper kept out of the component file to satisfy react-refresh rule.

/**
 * Format a date/timestamp softly for the meta line.
 * Accepts Date, Firestore Timestamp-like (with toDate()), or ISO string.
 * @param {unknown} value
 * @returns {string}
 */
export function formatWhen(value) {
  if (!value) return ''
  try {
    const d =
      value && typeof value === 'object' && typeof value.toDate === 'function'
        ? value.toDate()
        : value instanceof Date
          ? value
          : new Date(value)
    if (!isFinite(+d)) return ''
    return `on ${d.toLocaleDateString()}`
  } catch {
    return ''
  }
}
