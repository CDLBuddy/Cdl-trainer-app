// src/setup/school-overrides.js
//-----------------------------------------------------------------------------
// School-specific resource overrides (runs once on app boot)
// - Attaches/merges `window.schoolWebsites` and `window.schoolScheduling`
// - Accepts JSON maps via env (VITE_SCHOOL_WEBSITES_MAP / VITE_SCHOOL_SCHEDULING_MAP)
// - Keys normalized to lowercase; idempotent; dev logs only
// - Emits "school-overrides:ready" CustomEvent when done
// - Exports tiny helpers: getSchoolWebsite(id), getSchoolScheduling(id)
//-----------------------------------------------------------------------------

// Small local normalize used by both the IIFE and exported helpers
const __normalizeKey = (id) => String(id || '').trim().toLowerCase()

;(function initSchoolOverrides(win) {
  if (typeof win === 'undefined') return

  const DEV = !!import.meta.env?.DEV

  const normKey = __normalizeKey

  const asStringMap = (obj) =>
    Object.fromEntries(
      Object.entries(obj || {}).map(([k, v]) => [normKey(k), String(v ?? '')])
    )

  const readJSON = (raw) => {
    if (!raw) return {}
    try {
      const v = JSON.parse(raw)
      return v && typeof v === 'object' ? v : {}
    } catch {
      if (DEV) console.warn('[school-overrides] Failed to parse JSON env:', raw)
      return {}
    }
  }

  // ---- Defaults (only used if not present via env or existing window maps) ---
  const DEFAULT_WEBSITES = {
    'browning-mountain': 'https://browningmountaintraining.com/',
  }

  // ---- Env-driven maps (optional) -------------------------------------------
  const ENV_WEBSITES = readJSON(import.meta.env.VITE_SCHOOL_WEBSITES_MAP)
  const ENV_SCHEDULING = readJSON(import.meta.env.VITE_SCHOOL_SCHEDULING_MAP)

  // ---- Existing global maps (merge-safe) ------------------------------------
  const existingWeb = asStringMap(win.schoolWebsites || {})
  const existingSch = asStringMap(win.schoolScheduling || {})

  // ---- Final merged maps (lowest → highest precedence) ----------------------
  const websites = {
    ...asStringMap(DEFAULT_WEBSITES),
    ...asStringMap(ENV_WEBSITES),
    ...existingWeb,
  }
  const scheduling = {
    ...asStringMap(ENV_SCHEDULING),
    ...existingSch,
  }

  // Attach back to window (preserve references if already present)
  win.schoolWebsites = { ...(win.schoolWebsites || {}), ...websites }
  win.schoolScheduling = { ...(win.schoolScheduling || {}), ...scheduling }

  // Optional: seed a default schoolId for local dev if none exists
  const seedId = (import.meta.env.VITE_DEFAULT_SCHOOL_ID || '').trim()
  if (seedId && !localStorage.getItem('schoolId')) {
    try {
      localStorage.setItem('schoolId', seedId)
    } catch {
      /* ignore */
    }
    if (DEV) console.warn('[school-overrides] Seeded schoolId:', seedId)
  }

  if (DEV) {
    console.warn('[school-overrides] websites:', win.schoolWebsites)
    console.warn('[school-overrides] scheduling:', win.schoolScheduling)
  }

  // Let listeners know we’re ready (debug tooling, etc.)
  try {
    win.dispatchEvent(new CustomEvent('school-overrides:ready'))
  } catch {
    /* ignore */
  }
})(typeof window !== 'undefined' ? window : undefined)

// ---- Tiny helpers (safe to import anywhere) ---------------------------------

/** Get the marketing/website URL for a school id (or empty string). */
export function getSchoolWebsite(id) {
  if (typeof window === 'undefined') return ''
  const key = __normalizeKey(id)
  return window.schoolWebsites?.[key] || ''
}

/** Get the external scheduling URL (Calendly, etc.) for a school id. */
export function getSchoolScheduling(id) {
  if (typeof window === 'undefined') return ''
  const key = __normalizeKey(id)
  return window.schoolScheduling?.[key] || ''
}