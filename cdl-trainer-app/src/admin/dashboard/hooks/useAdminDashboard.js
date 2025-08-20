// Path: src/admin/dashboard/hooks/useAdminDashboard.js
// ============================================================================
// useAdminDashboard (widget-first)
// - Tiny view-model for AdminDashboard widgets
// - No Users table, filters, or pagination here
// - Derives KPIs, companies snapshot, alerts, activity
// - Safe fallbacks so the dashboard always renders
// ============================================================================

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { clampPct, expirySoon } from '../utils'

import {
  useAuthSchoolGuard,
  useUsersQuery,     // re-use your existing users fetch (students/instructors/admins)
  useUserMetrics,   // studentCount, instructorCount, adminCount, permitSoon, medSoon, incomplete
} from './subhooks'


// ---------- helpers -----------------------------------------------------

/** Get a display-safe name */
function nameOf(u) {
  return (u?.name || u?.email || 'User').trim()
}

/** Coerce ISO-ish string/timestamp to Date (or null) */
function toDate(x) {
  try {
    const d = new Date(x)
    return Number.isFinite(d?.getTime?.()) ? d : null
  } catch { return null }
}

/**
 * Build a small companies snapshot from users:
 * - top companies by student count (descending)
 * - each row: { id:companyName, name, studentCount, active, expiringSoon }
 */
function buildCompaniesSnapshot(users = [], limit = 6) {
  const byCompany = new Map()
  for (const u of users) {
    const role = (u?.role || '').toLowerCase()
    if (role !== 'student') continue
    const c = (u?.assignedCompany || '').trim()
    if (!c) continue
    if (!byCompany.has(c)) {
      byCompany.set(c, { name: c, studentCount: 0, expiringSoon: 0 })
    }
    const bucket = byCompany.get(c)
    bucket.studentCount += 1
    if (expirySoon(u?.permitExpiry)) bucket.expiringSoon += 1
  }

  const rows = Array.from(byCompany.values())
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, Math.max(0, limit))
    .map(r => ({ id: r.name, name: r.name, studentCount: r.studentCount, active: true, expiringSoon: r.expiringSoon }))

  return {
    rows,
    total: byCompany.size,
  }
}

/**
 * Build a lightweight activity list from user changes (best effort).
 * Uses createdAt/updatedAt if present; falls back to recent “new users”.
 */
function buildActivity(users = [], limit = 8) {
  const items = []
  for (const u of users) {
    const createdAt = toDate(u?.createdAt)
    const updatedAt = toDate(u?.updatedAt)

    if (createdAt) {
      items.push({
        actor: nameOf(u),
        action: `joined as ${u?.role || 'student'}`,
        timestamp: createdAt.toISOString(),
      })
    }
    if (updatedAt && (!createdAt || updatedAt > createdAt)) {
      items.push({
        actor: nameOf(u),
        action: `profile updated`,
        timestamp: updatedAt.toISOString(),
      })
    }
  }

  // newest first, unique-ish by actor+timestamp
  const dedupKey = (it) => `${it.actor}|${it.timestamp}|${it.action}`
  const dedup = new Map()
  items
    .sort((a, b) => (toDate(b.timestamp) - toDate(a.timestamp)))
    .forEach(it => { if (!dedup.has(dedupKey(it))) dedup.set(dedupKey(it), it) })

  return Array.from(dedup.values()).slice(0, Math.max(0, limit))
}

/** Create a couple of simple alert cards from KPIs (expand later) */
function buildAlerts({ permitSoon = 0, medSoon = 0, incomplete = 0 } = {}) {
  const out = []
  if (permitSoon > 0) {
    out.push({
      id: 'permits',
      type: 'warning',
      title: 'CDL permits expiring soon',
      message: `${permitSoon} student${permitSoon === 1 ? '' : 's'} need attention in the next 30 days.`,
      cta: 'View Details',
      ctaHref: '/admin/reports', // or a filtered companies view later
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

// ---------- hook --------------------------------------------------------

export function useAdminDashboard() {
  const navigate = useNavigate()

  // 1) Auth + school scope
  const { schoolId, loading: guardLoading } = useAuthSchoolGuard()

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
  // Shape: { overall: 0..100, categories: [{ key, label, value }] }
  const complianceSnapshot = useMemo(() => {
    // Example heuristic: treat non-incomplete students as “profile ok”
    const totalStudents = Math.max(0, Number(studentCount || 0))
    const profileOkPct =
      totalStudents > 0 ? clampPct(((totalStudents - incomplete) / totalStudents) * 100) : 0

    // Weight permits/meds equally for a simple overall
    const atRisk = Number(permitSoon || 0) + Number(medSoon || 0)
    const riskPct = totalStudents > 0 ? clampPct(((totalStudents - atRisk) / totalStudents) * 100) : 100

    const overall = clampPct(Math.round((profileOkPct + riskPct) / 2))

    return {
      overall,
      categories: [
        { key: 'profiles',  label: 'Profiles OK',  value: profileOkPct },
        { key: 'permits',   label: 'Permit Status', value: riskPct },
        { key: 'training',  label: 'Training Logs', value: 65 }, // stub until logs exist
        { key: 'reporting', label: 'TPR Reporting', value: 72 }, // stub until pipeline exists
      ],
    }
  }, [studentCount, incomplete, permitSoon, medSoon])

  // 8) UI density (card spacing)
  const [density, setDensity] = useState('cozy')

  // 9) Handlers for dashboard widgets
  const goToCompanies  = () => navigate('/admin/companies')
  const goToReports    = () => navigate('/admin/reports')
  const goToBilling    = () => navigate('/admin/billing')
  const onOpenSettings = () => navigate('/admin/settings')

  // Quick actions (wire up your drawers/flows later if needed)
  const onAddCompany   = () => navigate('/admin/companies')     // could open a drawer
  const onInviteUser   = () => navigate('/admin/companies')     // invite via company context
  const onOpenBilling  = () => goToBilling()

  return {
    // loading blends guard + data fetch
    loading: guardLoading || usersLoading,

    // density (affects card spacing via .compact class on wrapper)
    density, setDensity,

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