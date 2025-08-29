// src/admin/settings/utils/useBrandingVars.js
// ======================================================================
// useBrandingVars
// - Provides normalized branding variables for the UI
// - Ensures safe fallbacks for colors, logos, and names
// ======================================================================

import { useMemo } from 'react'

/**
 * Hook: useBrandingVars
 * Normalizes brand data for safe UI usage.
 *
 * @param {object} brand
 * @param {string} [brand.primaryColor] - HEX or CSS color string
 * @param {string} [brand.schoolName]   - Display name of the school
 * @param {string} [brand.logoUrl]      - Optional logo asset
 *
 * @returns {{
 *   primaryColor: string,
 *   schoolName: string,
 *   logoUrl: string,
 * }}
 */
export function useBrandingVars(brand = {}) {
  return useMemo(() => {
    return {
      primaryColor: brand.primaryColor?.trim() || '#5fb3c1',
      schoolName: brand.schoolName?.trim() || '',
      logoUrl: brand.logoUrl?.trim() || '',
    }
  }, [brand.primaryColor, brand.schoolName, brand.logoUrl])
}
