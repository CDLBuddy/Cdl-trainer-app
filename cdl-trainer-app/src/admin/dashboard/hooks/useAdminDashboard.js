// Path: src/admin/dashboard/hooks/useAdminDashboard.js
// ============================================================================
// useAdminDashboard (widget-first)
// - Tiny view-model for AdminDashboard widgets
// - No Users table, filters, or pagination here
// - Derives KPIs, companies snapshot, alerts, activity
// - Safe fallbacks so the dashboard always renders
// - Lint-friendly: stable callbacks/memos, clear shapes, no side effects
// ============================================================================

// @ts-check

import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { clampPct, expirySoon } from '../utils'

import {
  useAuthSchoolGuard,
  useUsersQuery,   // fetch students/instructors/admins for a school
  useUserMetrics, // studentCount, instructorCount, adminCount, permitSoon, medSoon, incomplete
} from './subhooks'

/* -------------------------------------------------------------------------- */
/* Types (JSDoc)                                                              */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {{ id: string, name: string, studentCount: number, active: boolean, expiringSoon: number }} CompanyRow
 * @typedef {{ id: string, type: 'warning'|'error'|'info', title: string, message: string, cta?: string, ctaHref?: string }} AlertCard
 * @typedef {{ actor: string, action: string, timestamp: string }} ActivityItem
 * @typedef {{ overall: number, categories: Array<{ key: string, label: string, value: number }> }} ComplianceSnapshot
 */

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Get a display-safe name */
function nameOf(u) {
  const raw = (u?.name || u?.email || 'User')
  return typeof raw === 'string' ? raw.trim() : 'User'
}

/** Coerce ISO-ish string/timestamp to ms number (or 0) for safe sort */
function toTime(input) {
  try {
    const t = new Date(input).getTime()
    return Number.isFinite(t) ? t : 0
  } catch {
    return 0
  }
}

/**
 * Build a small companies snapshot from users:
 * - top companies by student count (descending)
 * - each row: { id:companyName, name, studentCount, active, expiringSoon }
 * @param {Array<any>} users
 * @param {number} limit
 * @returns {{ rows: CompanyRow[], total: number }}
 */
function buildCompaniesSnapshot(users = [], limit = 6) {
  /** @type {Map<string, { name: string, studentCount: number, expiringSoon: number }>} */
  const byCompany = new Map()

  for (const u of users) {
    const role = String(u?.role || '').toLowerCase()
    if (role !== 'student') continue
    const c = String(u?.assignedCompany || '').trim()
    if (!c) continue

    const bucket = byCompany.get(c) ?? { name: c, studentCount: 0, expiringSoon: 0 }
    bucket.studentCount += 1
    if (expirySoon(u?.permitExpiry)) bucket.expiringSoon += 1
    byCompany.set(c, bucket)
  }

  const rows = Array.from(byCompany.values())
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, Math.max(0, limit))
    .map((r) => ({
      id: r.name,
      name: r.name,
      studentCount: r.studentCount,
      active: true,
      expiringSoon: r.expiringSoon,
    }))

  return { rows, total: byCompany.size }
}

/**
 * Build a lightweight activity list from user changes (best effort).
 * Uses createdAt/updatedAt if present; falls back to recent “new users”.
 * @param {Array<any>} users
 * @param {number} limit
 * @returns {ActivityItem[]}
 */
function buildActivity(users = [], limit = 8) {
  /** @type {ActivityItem[]} */
  const items = []

  for (const u of users) {
    const createdAt = u?.createdAt
    const updatedAt = u?.updatedAt

    if (createdAt) {
      items.push({
        actor: nameOf(u),
        action: `joined as ${u?.role || 'student'}`,
        timestamp: new Date(createdAt).toISOString(),
      })
    }
    // Only add updated if it’s later than created (when both exist)
    if (updatedAt && (!createdAt || toTime(updatedAt) > toTime(createdAt))) {
      items.push({
        actor: nameOf(u),
        action: 'profile updated',
        timestamp: new Date(updatedAt).toISOString(),
      })
    }
  }

  // newest first, dedupe by actor|timestamp|action
  const dedup = new Map()
  for (const it of items.sort((a, b) => toTime(b.timestamp) - toTime(a.timestamp))) {
    const k = `${it.actor}|${it.timestamp}|${it.action}`
    if (!dedup.has(k)) dedup.set(k, it)
  }
  return Array.from(dedup.values()).slice(0, Math.max(0, limit))
}

/**
 * Create a couple of simple alert cards from KPIs (expand later)
 * @param {{ permitSoon?: number, medSoon?: number, incomplete?: number }} k
 * @returns {AlertCard[]}
 */
function buildAlerts({ permitSoon = 0, medSoon = 0, incomplete = 0 } = {}) {
  /** @type {AlertCard[]} */
  const out = []

  if (permitSoon > 0) {
    out.push({
      id: 'permits',
      type: 'warning',
      title: 'CDL permits expiring soon',
      message: `${permitSoon} student${permitSoon === 1 ? '' : 's'} need attention in the next 30 days.`,
      cta: 'View Details',
      ctaHref: '/admin/reports',
    })
  }
  if (medSoon > 0) {
    out.push({
      id: 'medcards',
      type: 'warning',
      title: 'Medical cards expiring soon',
      message: `${medSoon} student${medSoon === 1 ? '' : 's'} approaching expiration.`,
      cta: 'Review',
      ctaHref: '/admin/reports',
    })
  }
  if (incomplete > 0) {
    out.push({
      id: 'profiles',
      type: 'info',
      title: 'Incomplete profiles',
      message: `${incomplete} profile${incomplete === 1 ? '' : 's'} below 80% completion.`,
      cta: 'Nudge Students',
      ctaHref: '/admin/reports',
    })
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * @returns {{
 *   loading: boolean,
 *   density: 'cozy'|'compact',
 *   setDensity: import('react').Dispatch<import('react').SetStateAction<'cozy'|'compact'>>,
 *   studentCount: number, instructorCount: number, adminCount: number,
 *   permitSoon: number, medSoon: number, incomplete: number,
 *   alerts: AlertCard[], activity: ActivityItem[],
 *   topCompanies: CompanyRow[], companyCount: number,
 *   complianceSnapshot: ComplianceSnapshot,
 *   goToCompanies: () => void, goToReports: () => void, goToBilling: () => void,
 *   onAddCompany: () => void, onInviteUser: () => void, onOpenSettings: () => void, onOpenBilling: () => void,
 *   expirySoon: typeof expirySoon, clampPct: typeof clampPct
 * }}
 */
export function useAdminDashboard() {
  const navigate = useNavigate()

  // 1) Auth + school scope (loop-safe: do NOT navigate from inside this hook)
  const { schoolId, loading: guardLoading } = useAuthSchoolGuard({
    requireRole: 'admin',
    redirectTo: null, // let <RequireRole requiredRole="admin" /> own redirects
  })

  // 2) Users (one fetch; we derive everything else from here)
  const { users = [], loading: usersLoading } = useUsersQuery({ schoolId })

  // 3) KPI metrics (re-use your existing subhook)
  const {
    studentCount = 0,
    instructorCount = 0,
    adminCount = 0,
    permitSoon = 0,
    medSoon = 0,
    incomplete = 0,
  } = useUserMetrics({ users })

  // 4) Companies snapshot (top companies & total count)
  const companies = useMemo(() => buildCompaniesSnapshot(users, 6), [users])

  // 5) Activity feed (best effort from createdAt/updatedAt)
  const activity = useMemo(() => buildActivity(users, 8), [users])

  // 6) Alerts (derived from KPIs for now; can later come from a service)
  const alerts = useMemo(
    () => buildAlerts({ permitSoon, medSoon, incomplete }),
    [permitSoon, medSoon, incomplete]
  )

  // 7) Compliance snapshot (placeholder until reports service provides it)
  const complianceSnapshot = useMemo(() => {
    // Example heuristic: treat non-incomplete students as “profile ok”
    const totalStudents = Math.max(0, Number(studentCount || 0))
    const profileOkPct =
      totalStudents > 0 ? clampPct(((totalStudents - Number(incomplete || 0)) / totalStudents) * 100) : 0

    // Weight permits/meds equally for a simple overall
    const atRisk = Number(permitSoon || 0) + Number(medSoon || 0)
    const riskPct = totalStudents > 0 ? clampPct(((totalStudents - atRisk) / totalStudents) * 100) : 100

    const overall = clampPct(Math.round((profileOkPct + riskPct) / 2))

    return {
      overall,
      categories: [
        { key: 'profiles',  label: 'Profiles OK',   value: profileOkPct },
        { key: 'permits',   label: 'Permit Status', value: riskPct },
        { key: 'training',  label: 'Training Logs', value: 65 }, // stub until logs exist
        { key: 'reporting', label: 'TPR Reporting', value: 72 }, // stub until pipeline exists
      ],
    }
  }, [studentCount, incomplete, permitSoon, medSoon])

  // 8) UI density (card spacing)
  /** @type {['cozy'|'compact', import('react').Dispatch<import('react').SetStateAction<'cozy'|'compact'>>]} */
  const [density, setDensity] = useState('cozy')

  // 9) Stable handlers for dashboard widgets
  const goToCompanies  = useCallback(() => navigate('/admin/companies'), [navigate])
  const goToReports    = useCallback(() => navigate('/admin/reports'), [navigate])
  const goToBilling    = useCallback(() => navigate('/admin/billing'), [navigate])
  const onOpenSettings = useCallback(() => navigate('/admin/settings'), [navigate])

  // Quick actions (wire up your drawers/flows later if needed)
  const onAddCompany  = goToCompanies
  const onInviteUser  = goToCompanies
  const onOpenBilling = goToBilling

  return {
    // loading blends guard + data fetch
    loading: Boolean(guardLoading || usersLoading),

    // density (affects card spacing via .compact class on wrapper)
    density,
    setDensity,

    // KPIs
    studentCount,
    instructorCount,
    adminCount,
    permitSoon,
    medSoon,
    incomplete,

    // Widgets data
    alerts,
    activity,
    topCompanies: companies.rows,
    companyCount: companies.total,
    complianceSnapshot,

    // Widget handlers / navigation
    goToCompanies,
    goToReports,
    goToBilling,
    onAddCompany,
    onInviteUser,
    onOpenSettings,
    onOpenBilling,

    // Utils (kept for convenience)
    expirySoon,
    clampPct,
  }
}

export default useAdminDashboard
