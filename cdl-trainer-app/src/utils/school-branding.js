// src/utils/school-branding.js
// ======================================================================
// School Branding Utilities
// - Logo, name, sub-headline, and primary color
// - Integrates with Firestore + localStorage cache
// - Broadcasts updates via DOM CustomEvent ("branding:updated")
// - SSR-safe (guards window/document/localStorage)
// ======================================================================

import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from './firebase.js'

/** Event name emitted when branding is updated. */
export const BRAND_EVENT = 'branding:updated'

/** LocalStorage keys */
export const LS_KEYS = {
  SCHOOL_ID:   'schoolId',
  BRAND_JSON:  'schoolBrand',
  BRAND_LOGO:  'branding.logoUrl',
  BRAND_NAME:  'branding.schoolName',
  BRAND_COLOR: 'branding.primaryColor',
  BRAND_AT:    'branding.lastUpdatedAt',
}

const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined'

/* ---------------------------------------------------------------------- */
/* Demo fallback brands (used offline or if Firestore fails)              */
/* ---------------------------------------------------------------------- */
const DEMO_SCHOOLS = [
  {
    id: 'cdlbuddy',
    schoolName: 'CDL Buddy',
    logoUrl: '/default-logo.svg',
    contactEmail: 'support@cdltrainerapp.com',
    website: 'https://cdltrainerapp.com',
    subHeadline: 'Your all-in-one CDL prep coach. Scroll down to get started!',
    primaryColor: '#4e91ad',
  },
  {
    id: 'browning-mountain',
    schoolName: 'Browning Mountain Training',
    logoUrl: '/default-logo.svg',
    contactEmail: 'karen1@example.com',
    website: '',
    subHeadline: '',
    primaryColor: '#4e91ad',
  },
]

/* ---------------------------------------------------------------------- */
/* Helpers                                                                */
/* ---------------------------------------------------------------------- */

function getLS(key, fallback = null) {
  if (!IS_BROWSER) return fallback
  try { return window.localStorage.getItem(key) ?? fallback } catch { return fallback }
}
function setLS(key, value) {
  if (!IS_BROWSER) return
  try { window.localStorage.setItem(key, value) } catch {}
}
function setCSSVar(name, value) {
  if (!IS_BROWSER) return
  try { document.documentElement.style.setProperty(name, value) } catch {}
}

function normalizeBrand(raw = {}, id = '') {
  const b = { ...(raw || {}) }
  return {
    id: id || b.id || '',
    schoolName: String(b.schoolName || b.name || '').trim(),
    logoUrl: String(b.logoUrl || '').trim(),
    primaryColor: String(b.primaryColor || '').trim(),
    contactEmail: String(b.contactEmail || '').trim(),
    subHeadline: String(b.subHeadline || '').trim(),
    website: String(b.website || '').trim(),
  }
}

/** Apply to CSS vars + write a light cache + broadcast event. */
function applyBrand(brand) {
  if (!brand) return
  if (brand.primaryColor) {
    setCSSVar('--brand-primary', brand.primaryColor)
    setLS(LS_KEYS.BRAND_COLOR, brand.primaryColor)
  }
  if (brand.logoUrl)   setLS(LS_KEYS.BRAND_LOGO, brand.logoUrl)
  if (brand.schoolName) setLS(LS_KEYS.BRAND_NAME, brand.schoolName)
  if (IS_BROWSER) setLS(LS_KEYS.BRAND_AT, String(Date.now()))

  // Emit event to update header/logo etc.
  if (IS_BROWSER) {
    try {
      window.dispatchEvent(
        new CustomEvent(BRAND_EVENT, {
          detail: {
            logoUrl: brand.logoUrl || '',
            schoolName: brand.schoolName || '',
            primaryColor: brand.primaryColor || '',
          },
        })
      )
    } catch {}
  }
}

/** Resolve current school id from cache or default demo id. */
function resolveCurrentSchoolId() {
  const ls = getLS(LS_KEYS.SCHOOL_ID, '')
  if (ls) return ls
  return DEMO_SCHOOLS[0].id
}

/* ---------------------------------------------------------------------- */
/* Public API                                                             */
/* ---------------------------------------------------------------------- */

/** Get current school branding (Firestore → fallback → cache). */
export async function getCurrentSchoolBranding() {
  const id = resolveCurrentSchoolId()

  // 1) Try Firestore
  try {
    const snap = await getDoc(doc(db, 'schools', id))
    if (snap.exists()) {
      const brand = normalizeBrand(snap.data(), id)
      setLS(LS_KEYS.BRAND_JSON, JSON.stringify(brand))
      applyBrand(brand)
      return brand
    }
  } catch {
    // ignored, fallback below
  }

  // 2) Fallback demo
  const demo = normalizeBrand(DEMO_SCHOOLS.find(s => s.id === id) || DEMO_SCHOOLS[0], id)
  setLS(LS_KEYS.BRAND_JSON, JSON.stringify(demo))
  applyBrand(demo)
  return demo
}

/** Fetch branding for a specific school id (without changing the current). */
export async function getBrandingForSchoolId(schoolId) {
  if (!schoolId) return null
  try {
    const snap = await getDoc(doc(db, 'schools', schoolId))
    if (snap.exists()) return normalizeBrand(snap.data(), schoolId)
  } catch {
    /* ignore */
  }
  const demo = DEMO_SCHOOLS.find(s => s.id === schoolId)
  return demo ? normalizeBrand(demo, schoolId) : null
}

/** Set the active school id and preload branding; persists and emits. */
export async function setCurrentSchool(schoolId) {
  if (!schoolId) return
  setLS(LS_KEYS.SCHOOL_ID, schoolId)
  await getCurrentSchoolBranding() // loads + persists + emits
}

/** List demo fallback schools (useful for dev menus). */
export function getAllSchools() {
  return DEMO_SCHOOLS.map(s => normalizeBrand(s, s.id))
}

/** Fetch all schools from Firestore (skips disabled). */
export async function fetchSchoolsFromFirestore() {
  try {
    const snap = await getDocs(collection(db, 'schools'))
    return snap.docs
      .map(d => normalizeBrand(d.data(), d.id))
      .filter(s => !s.disabled)
  } catch {
    return []
  }
}

/** Get cached branding JSON (fast path, may be stale). */
export function getCachedBranding() {
  try {
    const json = getLS(LS_KEYS.BRAND_JSON, null)
    return json ? JSON.parse(json) : null
  } catch {
    return null
  }
}

/** Quick summary: { logoUrl, schoolName, primaryColor }. */
export function getCachedBrandingSummary() {
  return {
    logoUrl: getLS(LS_KEYS.BRAND_LOGO, '') || '',
    schoolName: getLS(LS_KEYS.BRAND_NAME, '') || '',
    primaryColor: getLS(LS_KEYS.BRAND_COLOR, '') || '',
  }
}

/** Subscribe to branding updates (returns unsubscribe). */
export function subscribeBrandingUpdated(cb) {
  if (!IS_BROWSER) return () => {}
  const handler = (e) => cb?.(e?.detail || {})
  window.addEventListener(BRAND_EVENT, handler)
  return () => window.removeEventListener(BRAND_EVENT, handler)
}

/** Optional: clear local branding cache (does not change current school id). */
export function clearBrandingCache() {
  if (!IS_BROWSER) return
  try {
    window.localStorage.removeItem(LS_KEYS.BRAND_JSON)
    window.localStorage.removeItem(LS_KEYS.BRAND_LOGO)
    window.localStorage.removeItem(LS_KEYS.BRAND_NAME)
    window.localStorage.removeItem(LS_KEYS.BRAND_COLOR)
    window.localStorage.removeItem(LS_KEYS.BRAND_AT)
  } catch {}
}