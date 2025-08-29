// src/admin/settings/utils/constants.js
// Central constants for Admin Settings

export const LS_KEYS = Object.freeze({
  ACTIVE_TAB: 'admin.settings.tab',
})

export const FIRESTORE = Object.freeze({
  // where your settings live today
  SCHOOL_DOC: schoolId => ['schools', schoolId],
  // if you later move prefs to a dedicated doc:
  SETTINGS_DOC: schoolId => ['settings', schoolId],
})

export const BRAND_FALLBACK = Object.freeze({
  schoolName: 'CDL Trainer',
  primaryColor: '#5fb3c1',
  logoUrl: '/default-logo.svg',
})
