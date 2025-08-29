// src/student/dashboard/links.js
// Centralized student resource links (defaults + per-school overrides)

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

// Per-school resources. Keys must match your stored schoolId (case-insensitive).
const SCHOOL_RESOURCES = {
  // example: 'browning-mountain' (or whatever your actual schoolId value is)
  'browning-mountain': [
    {
      href: 'https://browningmountaintraining.com/',
      label: 'Browning Mountain Training',
      icon: '⛰️',
      newTab: true,
    },
  ],
}

/** Normalize key for object lookup */
const keyOf = id =>
  String(id || '')
    .trim()
    .toLowerCase()

/** Merge defaults + school-specific links */
export function getResourcesForSchool(schoolId) {
  const school = SCHOOL_RESOURCES[keyOf(schoolId)] || []
  return [...DEFAULT_RESOURCES, ...school]
}

/**
 * Resolve a scheduler URL:
 * - Per-school env override: VITE_SCHEDULER_URL__<SCHOOLID_AS_ENV_KEY>
 * - Global fallback env:     VITE_SCHEDULER_URL
 * - Otherwise: empty string (no CTA shown)
 *
 * Example: if schoolId === 'browning-mountain' use:
 *   VITE_SCHEDULER_URL__BROWNING_MOUNTAIN="https://calendly.com/..."
 */
export function getSchedulerURL(schoolId) {
  const base = import.meta.env.VITE_SCHEDULER_URL || ''
  const envKey =
    'VITE_SCHEDULER_URL__' +
    keyOf(schoolId)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
  const perSchool = import.meta.env[envKey]
  return perSchool || base || ''
}
