// Path: src/admin/dashboard/services/dashboardApi.js
// ============================================================================
// Admin • Dashboard API (pure module)
// - Unified, school-scoped endpoints used by dashboard widgets
// - Supports AbortSignal, light in-memory caching, and mock mode
// - Stable, hook-friendly shapes; defensive defaults; no UI side-effects
// - Reports-aware deep link helpers (keeps routing consistent with /reports plan)
// ============================================================================

import { ENV } from '@utils/env.js'

/* -------------------------------- Flags ---------------------------------- */
/** Toggle to use baked-in mocks (handy during dev/offline) */
export let USE_DASHBOARD_MOCKS =
  (typeof window !== 'undefined' && window.__DASHBOARD_MOCKS__) ||
  (ENV.VITE_DASHBOARD_MOCKS === 'true') ||
  true // keep true until real endpoints are fully wired

/** Optional base URL for HTTP API (if you’re not using Firestore/callables) */
export const DASHBOARD_BASE_URL =
  ENV.VITE_DASHBOARD_API_URL || '/api/dashboard'

/* --------------------------- Tunable cache TTLs --------------------------- */
const TTL = {
  companies: 30_000,
  alerts:    15_000,
  kpis:      15_000,
  activity:  10_000,
}

/* ------------------------------ Utilities -------------------------------- */

/** Small sleep helper to simulate latency in mocks */
const wait = (ms = 260) => new Promise((r) => setTimeout(r, ms))

/**
 * Fire-and-forget fetch wrapper with AbortSignal & JSON handling.
 * Returns `{ ok, data, error }` (never throws).
 */
async function fetchJSON(url, { method = 'GET', body, headers, signal } = {}) {
  try {
    const res = await fetch(url, {
      method,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const ct = res.headers.get('content-type') || ''
    const isJson = /\bapplication\/json\b/i.test(ct)
    const data = isJson ? await res.json() : await res.text()
    if (!res.ok) return { ok: false, data: null, error: data || `HTTP ${res.status}` }
    return { ok: true, data, error: null }
  } catch (err) {
    if (signal?.aborted) return { ok: false, data: null, error: 'aborted' }
    return { ok: false, data: null, error: String(err?.message || err) }
  }
}

/* ------------------------------- Caching --------------------------------- */
// Simple in-memory cache keyed by a stable string
const _cache = new Map()
const _key = (name, args) => `${name}:${JSON.stringify(args || {})}`
const _getCached = (k) => _cache.get(k)
const _setCached = (k, v, ttlMs = 30_000) => {
  _cache.set(k, v)
  if (ttlMs > 0) {
    const t = setTimeout(() => {
      if (_cache.get(k) === v) _cache.delete(k)
    }, ttlMs)
    // Node-only; ignore in browsers
    t.unref?.()
  }
}
/** Maintenance helper: clear whole dashboard cache */
export function clearDashboardCache() { _cache.clear() }
/** Maintenance helper: flip mock mode at runtime (useful in dev tools) */
export function setDashboardMocksEnabled(v) { USE_DASHBOARD_MOCKS = !!v }

/* -------------------------------- Shapes --------------------------------- */
/**
 * Normalized company row used by the Companies widget.
 * @typedef {{ id:string, name:string, studentCount:number, active:boolean, trend:'up'|'flat'|'down', updatedAt:string }} CompanyRow
 */

/**
 * Normalized alert used by Alerts widget.
 * - `severity` is the canonical field; `type` is kept for backward compat.
 * @typedef {{
 *   id: string,
 *   severity: 'info'|'warning'|'error'|'success',
 *   title: string,
 *   description?: string,
 *   count?: number,
 *   href?: string,
 *   ctaLabel?: string,
 *   icon?: string,
 *   dueAtISO?: string,
 *   // legacy aliases kept for compat
 *   type?: 'warning'|'error'|'info'|'success',
 *   detail?: string,
 *   due?: string,
 * }} AlertItem
 */

/**
 * KPIs counters.
 * @typedef {{ studentCount:number, instructorCount:number, adminCount:number, permitSoon:number, medSoon:number, incomplete:number }} Kpis
 */

/**
 * Normalized activity item used by Activity widget.
 * - Canonical fields: id, type, message, actor, date (ISO), meta
 * - Legacy aliases `action`, `timestamp` included for compat
 * @typedef {{
 *   id:string,
 *   type:string,
 *   message:string,
 *   actor?:string,
 *   date:string,       // ISO date string
 *   meta?:any,
 *   // legacy
 *   action?:string,
 *   timestamp?:string,
 * }} ActivityItem
 */

/* ----------------------- Reports deep-link helpers ----------------------- */
/**
 * Build a link into the Admin Reports screen with optional state.
 * Keeps the dashboard decoupled from the Reports implementation details
 * while still routing users directly to the right view/filter.
 *
 * Examples:
 *   buildReportsURL({ view: 'permits' })                // /admin/reports?view=permits
 *   buildReportsURL({ companyId: 'acme' })              // /admin/reports?company=acme
 *   buildReportsURL({ q: 'rivera', role: 'student' })   // /admin/reports?q=rivera&role=student
 */
export function buildReportsURL({ view, companyId, role, q } = {}) {
  const params = new URLSearchParams()
  if (view)      params.set('view', String(view))
  if (companyId) params.set('company', String(companyId))
  if (role)      params.set('role', String(role).toLowerCase())
  if (q)         params.set('q', String(q))
  const qs = params.toString()
  return `/admin/reports${qs ? `?${qs}` : ''}`
}

/* -------------------------------- Mocks ---------------------------------- */

function mockCompanies({ limit = 5 } = {}) {
  const now = Date.now()
  const rows = [
    { id: 'acme',  name: 'ACME Logistics',   studentCount: 42, active: true,  trend: 'up'   },
    { id: 'road',  name: 'RoadStar Freight', studentCount: 31, active: true,  trend: 'flat' },
    { id: 'midw',  name: 'Midwest Carriers', studentCount: 18, active: false, trend: 'down' },
    { id: 'north', name: 'North Haul LLC',   studentCount: 11, active: true,  trend: 'up'   },
    { id: 'swift', name: 'Swift & Sons',     studentCount: 8,  active: true,  trend: 'flat' },
  ]
  return rows.slice(0, Math.max(1, limit)).map((r, i) => ({
    ...r,
    updatedAt: new Date(now - i * 3_600_000).toISOString(),
  }))
}

function mockAlerts() {
  const soon = (d) => new Date(Date.now() + d * 86_400_000).toISOString()
  /** @type {AlertItem[]} */
  return [
    {
      id: 'a1',
      severity: 'warning',
      title: '3 permits expiring within 30 days',
      href: buildReportsURL({ view: 'permits' }),
      dueAtISO: soon(27),
    },
    {
      id: 'a2',
      severity: 'error',
      title: '1 medical card expired',
      href: buildReportsURL({ view: 'med-cards' }),
      dueAtISO: soon(-2),
    },
    {
      id: 'a3',
      severity: 'info',
      title: 'Instructor upload pending review',
      href: buildReportsURL({ view: 'instructors' }),
    },
  ]
}

function mockKpis() {
  return {
    studentCount: 128,
    instructorCount: 7,
    adminCount: 2,
    permitSoon: 4,
    medSoon: 2,
    incomplete: 19,
  }
}

function mockActivity({ limit = 10 } = {}) {
  const base = [
    { actor: 'You',       message: 'Marked invoice INV-104 paid',         type: 'BILLING'   },
    { actor: 'J. Rivera', message: 'Added student to ACME Logistics',     type: 'ENROLLMENT'},
    { actor: 'System',    message: 'Reported 8 completions to TPR',       type: 'REPORTING' },
    { actor: 'M. Chen',   message: 'Updated instructor certification',    type: 'PROFILE'   },
    { actor: 'System',    message: 'Scheduled permit expiry export',      type: 'AUTOMATION'},
  ]
  const now = Date.now()
  return base.slice(0, Math.max(1, limit)).map((x, i) => ({
    id: `act-${i + 1}`,
    actor: x.actor,
    type: x.type,
    message: x.message,
    date: new Date(now - i * 45 * 60 * 1000).toISOString(),
    // legacy aliases:
    action: x.message,
    timestamp: new Date(now - i * 45 * 60 * 1000).toISOString(),
  }))
}

/* ---------------------------- Normalizers -------------------------------- */

const asSeverity = (v) => {
  const s = String(v || '').toLowerCase()
  return /** @type {'info'|'warning'|'error'|'success'} */(
    s === 'warning' ? 'warning' :
    s === 'error'   ? 'error'   :
    s === 'success' ? 'success' : 'info'
  )
}

/** @param {any} raw @param {number} i */
function normalizeAlert(raw, i) {
  const id = String(raw?.id ?? `alert-${i + 1}`)
  const severity = asSeverity(raw?.severity ?? raw?.type ?? 'info')
  const title = String(raw?.title || 'Alert')
  const description = raw?.description ?? raw?.detail ?? ''
  // If backend didn’t supply a link, smart-default to reports root for warning/error types.
  const href = raw?.href || (severity !== 'info' ? buildReportsURL({ view: 'overview' }) : '')
  const ctaLabel = raw?.ctaLabel || ''
  const icon = raw?.icon || ''
  const dueAtISO = raw?.dueAtISO ?? raw?.due ?? ''
  const count = Number.isFinite(raw?.count) ? Number(raw.count) : undefined
  /** @type {AlertItem} */
  return {
    id,
    severity,
    title,
    description,
    href,
    ctaLabel,
    icon,
    dueAtISO,
    count,
    // legacy aliases kept for compatibility:
    type: severity, // mirrors severity
    detail: description,
    due: dueAtISO,
  }
}

/** @param {any} raw @param {number} i */
function normalizeActivity(raw, i) {
  const id = String(raw?.id ?? `act-${i + 1}`)
  const type = String(raw?.type || 'UNKNOWN')
  const message = String(raw?.message ?? raw?.action ?? 'Updated')
  const actor = raw?.actor ? String(raw.actor) : undefined
  const dateISO =
    typeof raw?.date === 'string' ? raw.date :
    typeof raw?.timestamp === 'string' ? raw.timestamp :
    new Date().toISOString()
  /** @type {ActivityItem} */
  return {
    id,
    type,
    message,
    actor,
    date: dateISO,
    meta: raw?.meta ?? undefined,
    // legacy aliases:
    action: message,
    timestamp: dateISO,
  }
}

/* ------------------------------- API Facade ------------------------------- */

export const companies = {
  /**
   * @param {{ schoolId?:string, limit?:number, signal?:AbortSignal }} params
   * @returns {Promise<CompanyRow[]>}
   */
  async getSnapshot({ schoolId, limit = 5, signal } = {}) {
    const key = _key('companies:getSnapshot', { schoolId, limit })
    const hit = _getCached(key)
    if (hit) return hit

    if (USE_DASHBOARD_MOCKS || !schoolId) {
      await wait()
      const data = mockCompanies({ limit })
      _setCached(key, data, TTL.companies)
      return data
    }

    const url = `${DASHBOARD_BASE_URL}/companies?s=${encodeURIComponent(schoolId)}&limit=${limit}`
    const { ok, data, error } = await fetchJSON(url, { signal })
    if (!ok) throw new Error(error || 'Failed to load companies')

    const rows = (Array.isArray(data) ? data : []).map((c) => ({
      id: c.id ?? c.companyId ?? String(c.name || 'company'),
      name: String(c.name || 'Company'),
      studentCount: Number(c.studentCount ?? c.students ?? 0) || 0,
      active: 'active' in c ? !!c.active : (String(c.status || '').toLowerCase() !== 'inactive'),
      trend: ['up', 'flat', 'down'].includes(String(c.trend)) ? c.trend : 'flat',
      updatedAt: c.updatedAt || c.updated_at || new Date().toISOString(),
    }))
    _setCached(key, rows, TTL.companies)
    return rows
  },
}

export const alerts = {
  /**
   * @param {{ schoolId?:string, signal?:AbortSignal }} params
   * @returns {Promise<AlertItem[]>}
   */
  async get({ schoolId, signal } = {}) {
    const key = _key('alerts:get', { schoolId })
    const hit = _getCached(key)
    if (hit) return hit

    if (USE_DASHBOARD_MOCKS || !schoolId) {
      await wait()
      const data = mockAlerts()
      _setCached(key, data, TTL.alerts)
      return data
    }

    const url = `${DASHBOARD_BASE_URL}/alerts?s=${encodeURIComponent(schoolId)}`
    const { ok, data, error } = await fetchJSON(url, { signal })
    if (!ok) throw new Error(error || 'Failed to load alerts')

    const rows = (Array.isArray(data) ? data : []).map((a, i) => normalizeAlert(a, i))
    _setCached(key, rows, TTL.alerts)
    return rows
  },
}

export const kpis = {
  /**
   * @param {{ schoolId?:string, signal?:AbortSignal }} params
   * @returns {Promise<Kpis>}
   */
  async get({ schoolId, signal } = {}) {
    const key = _key('kpis:get', { schoolId })
    const hit = _getCached(key)
    if (hit) return hit

    if (USE_DASHBOARD_MOCKS || !schoolId) {
      await wait()
      const data = mockKpis()
      _setCached(key, data, TTL.kpis)
      return data
    }

    const url = `${DASHBOARD_BASE_URL}/kpis?s=${encodeURIComponent(schoolId)}`
    const { ok, data, error } = await fetchJSON(url, { signal })
    if (!ok) throw new Error(error || 'Failed to load KPIs')

    const safe = (n, d = 0) => (Number.isFinite(+n) ? +n : d)
    const out = {
      studentCount:  safe(data.studentCount),
      instructorCount:safe(data.instructorCount),
      adminCount:    safe(data.adminCount),
      permitSoon:    safe(data.permitSoon),
      medSoon:       safe(data.medSoon),
      incomplete:    safe(data.incomplete),
    }
    _setCached(key, out, TTL.kpis)
    return out
  },
}

export const activity = {
  /**
   * @param {{ schoolId?:string, limit?:number, signal?:AbortSignal }} params
   * @returns {Promise<ActivityItem[]>}
   */
  async getRecent({ schoolId, limit = 10, signal } = {}) {
    const key = _key('activity:getRecent', { schoolId, limit })
    const hit = _getCached(key)
    if (hit) return hit

    if (USE_DASHBOARD_MOCKS || !schoolId) {
      await wait()
      const data = mockActivity({ limit })
      _setCached(key, data, TTL.activity)
      return data
    }

    const url = `${DASHBOARD_BASE_URL}/activity?s=${encodeURIComponent(schoolId)}&limit=${limit}`
    const { ok, data, error } = await fetchJSON(url, { signal })
    if (!ok) throw new Error(error || 'Failed to load activity')

    const rows = (Array.isArray(data) ? data : []).map((e, i) => normalizeActivity(e, i))
    _setCached(key, rows, TTL.activity)
    return rows
  },
}

/* ------------------------- Named exports for hooks ------------------------ */
/** Matches `useDashboardKpis` expectations */
export async function getKpis(args) {
  return kpis.get(args)
}
/** Matches `useDashboardAlerts` expectations */
export async function getAlerts(args) {
  return alerts.get(args)
}
/** Matches `useRecentActivity` expectations */
export async function getRecentActivity(args) {
  return activity.getRecent(args)
}

/* ------------------------------ Public API -------------------------------- */

const dashboardApi = { companies, alerts, kpis, activity }
export default dashboardApi

// Low-level helper (intentionally exported for test harnesses)
export { fetchJSON as __fetchJSON }