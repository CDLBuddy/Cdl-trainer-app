// src/student/dashboard/links.js
// ======================================================================
// Student dashboard resource links
// - Defaults + per-school additions
// - Reads runtime overrides from `school-overrides` (window maps)
// - Safe, normalized, and de-duplicated
// ======================================================================

// ----- Defaults -------------------------------------------------------------

export const DEFAULT_RESOURCES = [
  {
    href: 'https://www.in.gov/bmv/licenses-permits-ids/commercial-drivers-license-overview/',
    label: 'Indiana BMV: CDL Overview',
    icon: '🏛️',
    newTab: true,
  },
  {
    href: 'https://www.fmcsa.dot.gov',
    label: 'FMCSA',
    icon: '🛡️',
    newTab: true,
  },
]

// Optional local per-school extras (kept for convenience).
// Keys should match stored schoolId (case-insensitive).
const SCHOOL_RESOURCES = {
  // example / seed
  'browning-mountain': [
    {
      href: 'https://browningmountaintraining.com/',
      label: 'Browning Mountain Training',
      icon: '⛰️',
      newTab: true,
    },
  ],
}

// ----- Utils ----------------------------------------------------------------

const keyOf = (id) => String(id || '').trim().toLowerCase()

const ensureHttps = (url = '') =>
  url && /^https?:\/\//i.test(url) ? url : (url ? `https://${url}` : '')

/** Deduplicate by normalized href (case-insensitive) */
function dedupeLinks(list) {
  const seen = new Set()
  const out = []
  for (const item of list) {
    const raw = String(item?.href || '')
    const href = ensureHttps(raw)
    const key = href.toLowerCase()
    if (!href || seen.has(key)) continue
    seen.add(key)
    out.push({ ...item, href })
  }
  return out
}

// ----- API ------------------------------------------------------------------

/**
 * Merge defaults + local per-school + runtime website override
 * (if provided via window.schoolWebsites by `school-overrides.js`).
 */
export function getResourcesForSchool(schoolId) {
  const k = keyOf(schoolId)

  // 1) defaults
  const links = [...DEFAULT_RESOURCES]

  // 2) local static extras for this school
  const local = Array.isArray(SCHOOL_RESOURCES[k]) ? SCHOOL_RESOURCES[k] : []
  links.push(...local)

  // 3) runtime school website override (seeded by setup/school-overrides.js)
  try {
    const site = ensureHttps(globalThis?.window?.schoolWebsites?.[k] || '')
    if (site) {
      links.push({
        href: site,
        label: 'School Website',
        icon: '🏫',
        newTab: true,
      })
    }
  } catch {
    /* no-op; SSR or window unavailable */
  }

  return dedupeLinks(links)
}

/**
 * Resolve a scheduler URL for CTAs.
 * Priority:
 *   1) Runtime map from `school-overrides` (window.schoolScheduling)
 *   2) Per-school env: VITE_SCHEDULER_URL__<SCHOOLID_AS_ENV_KEY>
 *   3) Global fallback env: VITE_SCHEDULER_URL
 *   4) '' (no CTA)
 */
export function getSchedulerURL(schoolId) {
  const k = keyOf(schoolId)

  // 1) runtime override (preferred)
  try {
    const runtime = ensureHttps(globalThis?.window?.schoolScheduling?.[k] || '')
    if (runtime) return runtime
  } catch {
    /* no-op; SSR or window unavailable */
  }

  // 2) per-school env
  const envKey =
    'VITE_SCHEDULER_URL__' + k.toUpperCase().replace(/[^A-Z0-9]/g, '_')
  const perSchool = ensureHttps(import.meta.env[envKey] || '')
  if (perSchool) return perSchool

  // 3) global env
  const base = ensureHttps(import.meta.env.VITE_SCHEDULER_URL || '')
  return base || ''
}