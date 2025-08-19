// src/admin/settings/utils/mappers.js
// Normalizers to keep Firestore <-> app shape consistent

import { BRAND_FALLBACK } from './constants.js'
import { DEFAULT_BRAND, DEFAULT_PREFS } from './defaults.js'

/**
 * schools/{id} -> { brand, prefs }
 */
export function fromSchoolDoc(data = {}) {
  const brand = {
    schoolName: data.schoolName ?? DEFAULT_BRAND.schoolName,
    logoUrl: data.logoUrl ?? DEFAULT_BRAND.logoUrl,
    primaryColor: data.primaryColor ?? DEFAULT_BRAND.primaryColor,
  }

  // adminPrefs is where prefs are stored today
  const prefs = {
    ...DEFAULT_PREFS,
    ...(data.adminPrefs || {}),
  }

  return { brand: { ...BRAND_FALLBACK, ...brand }, prefs }
}

/**
 * { brand?, prefs? } -> patch for schools/{id}
 * Keeps old location (adminPrefs) but can be swapped later.
 */
export function toSchoolDocPatch({ brand, prefs } = {}) {
  const patch = {}
  if (brand && typeof brand === 'object') {
    if ('schoolName' in brand) patch.schoolName = brand.schoolName
    if ('logoUrl' in brand) patch.logoUrl = brand.logoUrl
    if ('primaryColor' in brand) patch.primaryColor = brand.primaryColor
  }
  if (prefs && typeof prefs === 'object') {
    patch.adminPrefs = { ...(prefs || {}) }
  }
  return patch
}