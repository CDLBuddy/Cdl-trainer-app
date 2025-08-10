// src/utils/school-branding.js
// Branding helpers (logo + name + primary color) for React + Vite

import { doc, getDoc, collection, getDocs } from 'firebase/firestore'

import { db } from './firebase'

/** Demo fallback brands (used if Firestore fails or offline) */
const SCHOOL_BRANDS = [
  {
    id: 'cdlbuddy',
    schoolName: 'CDL Buddy',
    logoUrl: '/default-logo.svg',
    contactEmail: 'support@cdltrainerapp.com',
    website: 'https://cdltrainerapp.com',
    subHeadline: 'Your all-in-one CDL prep coach. Scroll down to get started!',
    // primaryColor intentionally omitted for fallback
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

const LS_KEYS = {
  SCHOOL_ID: 'schoolId',
  BRAND_JSON: 'schoolBrand',
  BRAND_LOGO: 'branding.logoUrl',
  BRAND_NAME: 'branding.schoolName',
  BRAND_COLOR: 'branding.primaryColor',
}

/** Apply CSS var and persist for instant UI use */
function applyBrandVars(brand) {
  if (!brand) return
  if (brand.primaryColor) {
    document.documentElement.style.setProperty(
      '--brand-primary',
      brand.primaryColor
    )
    localStorage.setItem(LS_KEYS.BRAND_COLOR, brand.primaryColor)
  }
  if (brand.logoUrl) {
    localStorage.setItem(LS_KEYS.BRAND_LOGO, brand.logoUrl)
  }
  if (brand.schoolName || brand.name) {
    localStorage.setItem(LS_KEYS.BRAND_NAME, brand.schoolName || brand.name)
  }

  // Broadcast to any listeners (e.g., header/logo components)
  try {
    window.dispatchEvent(
      new CustomEvent('branding:updated', {
        detail: {
          logoUrl: brand.logoUrl || '',
          schoolName: brand.schoolName || brand.name || '',
          primaryColor: brand.primaryColor || '',
        },
      })
    )
  } catch {
    /* noop in non-DOM contexts */
  }
}

/** Try Firestore first; if missing, fall back to demo list; persist to localStorage */
export async function getCurrentSchoolBranding() {
  const id = localStorage.getItem(LS_KEYS.SCHOOL_ID) || SCHOOL_BRANDS[0].id

  // 1) Firestore attempt
  try {
    const snap = await getDoc(doc(db, 'schools', id))
    if (snap.exists()) {
      const data = { id, ...snap.data() }
      // Persist + apply
      localStorage.setItem(LS_KEYS.BRAND_JSON, JSON.stringify(data))
      applyBrandVars(data)
      return data
    }
  } catch {
    // ignore; fall back below
  }

  // 2) Fallback demo
  const brand = SCHOOL_BRANDS.find(s => s.id === id) || SCHOOL_BRANDS[0]
  localStorage.setItem(LS_KEYS.BRAND_JSON, JSON.stringify(brand))
  applyBrandVars(brand) // no color in fallback, but we still broadcast
  return brand
}

/** Helper: fetch branding *for a specific schoolId* (not necessarily current) */
export async function getBrandingForSchoolId(schoolId) {
  if (!schoolId) return null
  try {
    const snap = await getDoc(doc(db, 'schools', schoolId))
    if (snap.exists()) {
      return { id: schoolId, ...snap.data() }
    }
  } catch {
    /* ignore */
  }
  return SCHOOL_BRANDS.find(s => s.id === schoolId) || null
}

/** Set current school id and preload branding (logo/name/color) */
export async function setCurrentSchool(schoolId) {
  if (!schoolId) return
  localStorage.setItem(LS_KEYS.SCHOOL_ID, schoolId)
  await getCurrentSchoolBranding() // loads + persists + emits branding:updated
}

/** List all demo schools (legacy/fallback) */
export function getAllSchools() {
  return SCHOOL_BRANDS
}

/** Load all schools from Firestore (filter disabled) */
export async function fetchSchoolsFromFirestore() {
  const snap = await getDocs(collection(db, 'schools'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => !s.disabled)
}

/** Read branding from localStorage without hitting Firestore (fast path) */
export function getCachedBranding() {
  try {
    const json = localStorage.getItem(LS_KEYS.BRAND_JSON)
    return json ? JSON.parse(json) : null
  } catch {
    return null
  }
}

/** Convenience: return the cached logoUrl/schoolName/primaryColor quickly */
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
