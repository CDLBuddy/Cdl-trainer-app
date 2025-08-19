// src/admin/settings/utils/validators.js
// ======================================================================
// Validators
// - Utility functions for validating common admin settings inputs
// - Keep pure + side-effect free
// ======================================================================

/**
 * Validate a HEX color string (#RRGGBB).
 * Supports optional leading '#', case-insensitive.
 *
 * @param {string} [s='']
 * @returns {boolean}
 *
 * @example
 * isHexColor('#ff0033') // true
 * isHexColor('00ffcc')  // true
 * isHexColor('#abc')    // false (not expanded 6-digit)
 */
export function isHexColor(s = '') {
  return /^#?[0-9A-F]{6}$/i.test(String(s).trim())
}

/**
 * Validate a URL string (basic check).
 *
 * @param {string} [s='']
 * @returns {boolean}
 */
export function isValidUrl(s = '') {
  try {
    new URL(String(s).trim())
    return true
  } catch {
    return false
  }
}

/**
 * Validate a non-empty string.
 *
 * @param {string} [s='']
 * @returns {boolean}
 */
export function isNonEmptyString(s = '') {
  return String(s).trim().length > 0
}