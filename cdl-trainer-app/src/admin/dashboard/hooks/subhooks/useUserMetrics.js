// Path: src/admin/dashboard/hooks/subhooks/useUserMetrics.js
// ============================================================================
// useUserMetrics
// - Derives KPI metrics from a users list
// - Backward compatible keys consumed by UI:
//     { studentCount, instructorCount, adminCount, permitSoon, medSoon, incomplete }
// - Extras included (non-breaking):
//     { totalUsers, roleHistogram, percents: {...} }
// - Config via options: lowProfileThreshold, expiringDays, expirySoon override
// ============================================================================

import { useMemo } from 'react'
import { expirySoon as expirySoonDefault } from '../../utils'

/**
 * @typedef {Object} UseUserMetricsOptions
 * @property {number} [lowProfileThreshold=80]   // % threshold for "incomplete" profiles
 * @property {number} [expiringDays=30]          // days considered "expiring soon"
 * @property {(dateStr?: string) => boolean} [expirySoon] // custom expiry fn
 */

/**
 * @param {{ users: Array<Record<string, any>>, options?: UseUserMetricsOptions }} params
 */
export function useUserMetrics({ users, options = {} }) {
  const {
    lowProfileThreshold = 80,
    expiringDays = 30,
    expirySoon: expirySoonOverride,
  } = options

  // Normalize input once
  const list = useMemo(() => (Array.isArray(users) ? users : []), [users])

  // Choose the expiry check (memoized)
  const expiryCheck = useMemo(() => {
    if (typeof expirySoonOverride === 'function') return expirySoonOverride
    // Default: consider either util's soon OR within N days from now
    return (dateStr) => expirySoonDefault(dateStr) || withinDays(dateStr, expiringDays)
  }, [expiringDays, expirySoonOverride])

  const {
    studentCount,
    instructorCount,
    adminCount,
    permitSoon,
    medSoon,
    incomplete,
    total,
    roleHistogram,
  } = useMemo(() => {
    let students = 0
    let instructors = 0
    let admins = 0
    let permitExp = 0
    let medExp = 0
    let lowProfile = 0

    /** @type {Record<string, number>} */
    const hist = Object.create(null)

    for (const u of list) {
      const role = String(u?.role ?? 'student').toLowerCase()
      hist[role] = (hist[role] || 0) + 1

      if (role === 'student') students++
      else if (role === 'instructor') instructors++
      else if (role === 'admin') admins++

      // Accept both medCardExpiry / medCard for legacy data
      const medDate = u?.medCardExpiry ?? u?.medCard

      if (expiryCheck(u?.permitExpiry)) permitExp++
      if (expiryCheck(medDate)) medExp++

      const pct = Number.isFinite(+u?.profileProgress) ? +u.profileProgress : 0
      if (pct < lowProfileThreshold) lowProfile++
    }

    return {
      studentCount: students,
      instructorCount: instructors,
      adminCount: admins,
      permitSoon: permitExp,
      medSoon: medExp,
      incomplete: lowProfile,
      total: list.length,
      roleHistogram: hist,
    }
  }, [list, lowProfileThreshold, expiryCheck])

  // Percent helpers (rounded, safe)
  const pct = (n) => {
    const d = total || 1
    return Math.round((Math.max(0, n) / d) * 100)
  }

  // Back-compat core keys
  const core = { studentCount, instructorCount, adminCount, permitSoon, medSoon, incomplete }

  // Non-breaking extras
  const extras = {
    totalUsers: total,
    roleHistogram,
    percents: {
      students: pct(studentCount),
      instructors: pct(instructorCount),
      admins: pct(adminCount),
      permitSoon: pct(permitSoon),
      medSoon: pct(medSoon),
      incomplete: pct(incomplete),
    },
  }

  return { ...core, ...extras }
}

/* ----------------------------- helpers ------------------------------ */

/** True if dateStr is within N days from now (future only). */
function withinDays(dateStr, days) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  const now = Date.now()
  const diffDays = Math.floor((d.getTime() - now) / (1000 * 60 * 60 * 24))
  return diffDays <= days
}

export default useUserMetrics