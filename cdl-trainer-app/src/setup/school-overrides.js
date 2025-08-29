//src/setup/school-overrides.js
//-----------------------------------------------------------------------------
// School-specific resource overrides (runs once on app boot)
// - Attaches/merges `window.schoolWebsites` and `window.schoolScheduling`
// - Accepts JSON maps via env:
//     VITE_SCHOOL_WEBSITES_MAP='{"browning-mountain":"https://browningmountaintraining.com/"}'
//     VITE_SCHOOL_SCHEDULING_MAP='{"browning-mountain":"https://calendly.com/..."}'
// - Keys are normalized to lowercase for consistent lookups
// - Never clobbers existing values already on window
// - Safe in production; extra console hints in dev
// -----------------------------------------------------------------------------
//
// ⚠️ Make sure this file is imported BEFORE your app renders, e.g. in main.jsx:
//   import '@/setup/school-overrides.js'
// -----------------------------------------------------------------------------

;(function initSchoolOverrides(win) {
  if (typeof win === 'undefined') return

  const DEV = !!import.meta.env.DEV

  const normKey = id =>
    String(id || '')
      .trim()
      .toLowerCase()

  const asStringMap = obj =>
    Object.fromEntries(
      Object.entries(obj || {}).map(([k, v]) => [normKey(k), String(v || '')])
    )

  const readJSON = raw => {
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
    // Tweak/remove as needed; helpful starter if you use this school
    'browning-mountain': 'https://browningmountaintraining.com/',
  }

  // ---- Env-driven maps (optional) -------------------------------------------
  // Example:
  //   VITE_SCHOOL_WEBSITES_MAP='{"my-school":"https://mysite.com"}'
  //   VITE_SCHOOL_SCHEDULING_MAP='{"my-school":"https://calendly.com/my-school/btw"}'
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
    /* no defaults */ ...asStringMap(ENV_SCHEDULING),
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
      // Intentionally ignore errors when setting localStorage
    }
    if (DEV) console.warn('[school-overrides] Seeded schoolId:', seedId)
  }

  if (DEV) {
    console.warn('[school-overrides] websites:', win.schoolWebsites)
    console.warn('[school-overrides] scheduling:', win.schoolScheduling)
  }
})(typeof window !== 'undefined' ? window : undefined)
