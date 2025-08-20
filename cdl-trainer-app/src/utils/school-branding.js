// src/utils/school-branding.js
// ======================================================================
// School Branding Utilities
// - Logo, name, sub-headline, and primary color
// - Integrates with Firestore + localStorage cache
// - Broadcasts updates via DOM CustomEvent ("branding:updated")
// ======================================================================

import { doc, getDoc, collection, getDocs } from 'firebase/firestore'

import { db } from './firebase.js'

// ----------------------------------------------------------------------
// Demo fallback brands (used offline or if Firestore fails)
// ----------------------------------------------------------------------
const DEMO_SCHOOLS = [
  {
    id: 'cdlbuddy',
    schoolName: 'CDL Buddy',
    logoUrl: '/default-logo.svg',
    contactEmail: 'support@cdltrainerapp.com',
    website: 'https://cdltrainerapp.com',
    subHeadline: 'Your all-in-one CDL prep coach. Scroll down to get started!',
  },
  {
    id: 'browning-mountain',
    schoolName: 'Browning Mountain Training',
    logoUrl: '/default-logo.svg',
    contactEmail: 'karen1@example.com',
    website: '(optional)',
    subHeadline: '(optional)',
  },
]

// ----------------------------------------------------------------------
// LocalStorage keys
// ----------------------------------------------------------------------
const LS_KEYS = {
  SCHOOL_ID: 'schoolId',
  BRAND_JSON: 'schoolBrand',
  BRAND_LOGO: 'branding.logoUrl',
  BRAND_NAME: 'branding.schoolName',
  BRAND_COLOR: 'branding.primaryColor',
}

// ----------------------------------------------------------------------
// Internal: Apply branding to CSS vars + persist for instant UI usage
// ----------------------------------------------------------------------
function applyBrandVars(brand) {
  if (!brand) return

  if (brand.primaryColor) {
    document.documentElement.style.setProperty('--brand-primary', brand.primaryColor)
    localStorage.setItem(LS_KEYS.BRAND_COLOR, brand.primaryColor)
  }
  if (brand.logoUrl) {
    localStorage.setItem(LS_KEYS.BRAND_LOGO, brand.logoUrl)
  }
  if (brand.schoolName || brand.name) {
    localStorage.setItem(LS_KEYS.BRAND_NAME, brand.schoolName || brand.name)
  }

  // Broadcast to any listeners (header/logo components, Shell, etc.)
  try {
    window.dispatchEvent(
      new CustomEvent('branding:updated', {
        detail: {
          logoUrl: brand.logoUrl || '',
          schoolName: brand.schoolName || brand.name || '',
          primaryColor: brand.primaryColor || '',
        },
      }),
    )
  } catch {
    /* no-op in non-DOM contexts */
  }
}

// ----------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------

/** Get current school branding (Firestore → fallback → cache) */
export async function getCurrentSchoolBranding() {
  const id = localStorage.getItem(LS_KEYS.SCHOOL_ID) || DEMO_SCHOOLS[0].id

  // 1) Firestore attempt
  try {
    const snap = await getDoc(doc(db, 'schools', id))
    if (snap.exists()) {
      const data = { id, ...snap.data() }
      localStorage.setItem(LS_KEYS.BRAND_JSON, JSON.stringify(data))
      applyBrandVars(data)
      return data
    }
  } catch {
    // ignored, fallback below
  }

  // 2) Fallback demo
  const brand = DEMO_SCHOOLS.find(s => s.id === id) || DEMO_SCHOOLS[0]
  localStorage.setItem(LS_KEYS.BRAND_JSON, JSON.stringify(brand))
  applyBrandVars(brand)
  return brand
}

/** Fetch branding for a specific school id (without changing current) */
export async function getBrandingForSchoolId(schoolId) {
  if (!schoolId) return null
  try {
    const snap = await getDoc(doc(db, 'schools', schoolId))
    if (snap.exists()) {
      return { id: schoolId, ...snap.data() }
    }
  } catch {
    // ignore
  }
  return DEMO_SCHOOLS.find(s => s.id === schoolId) || null
}

/** Set the active schoolId and preload branding */
export async function setCurrentSchool(schoolId) {
  if (!schoolId) return
  localStorage.setItem(LS_KEYS.SCHOOL_ID, schoolId)
  await getCurrentSchoolBranding() // loads + persists + emits
}

/** List demo fallback schools */
export function getAllSchools() {
  return DEMO_SCHOOLS
}

/** Fetch all schools from Firestore (skips disabled) */
export async function fetchSchoolsFromFirestore() {
  const snap = await getDocs(collection(db, 'schools'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => !s.disabled)
}

/** Get cached branding JSON (fast path, may be stale) */
export function getCachedBranding() {
  try {
    const json = localStorage.getItem(LS_KEYS.BRAND_JSON)
    return json ? JSON.parse(json) : null
  } catch {
    return null
  }
}

/** Quick summary: { logoUrl, schoolName, primaryColor } */
export function getCachedBrandingSummary() {
  return {
    logoUrl: localStorage.getItem(LS_KEYS.BRAND_LOGO) || '',
    schoolName: localStorage.getItem(LS_KEYS.BRAND_NAME) || '',
    primaryColor: localStorage.getItem(LS_KEYS.BRAND_COLOR) || '',
  }
}

/** Subscribe to branding updates (returns unsubscribe) */
export function subscribeBrandingUpdated(cb) {
  const handler = e => cb?.(e.detail || {})
  window.addEventListener('branding:updated', handler)
  return () => window.removeEventListener('branding:updated', handler)
}