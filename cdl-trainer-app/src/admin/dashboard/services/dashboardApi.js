// Path: src/admin/dashboard/services/dashboardApi.js
// ============================================================================
// Admin • Dashboard API
// - Unified, school-scoped endpoints used by dashboard widgets
// - Supports AbortSignal, light in-memory caching, and mock mode
// - Stable shapes (see JSDoc), defensive defaults, no UI side-effects here
// ============================================================================

/* -------------------------------- Flags ---------------------------------- */
/** Toggle to use baked-in mocks (handy during dev / offline) */
export const USE_DASHBOARD_MOCKS =
  (typeof window !== 'undefined' && window.__DASHBOARD_MOCKS__) ||
  (import.meta?.env?.VITE_DASHBOARD_MOCKS === 'true') ||
  true // default true until your real endpoints are wired

/** Optional base URL for HTTP API (if you’re not using Firestore/callables) */
export const DASHBOARD_BASE_URL =
  import.meta?.env?.VITE_DASHBOARD_API_URL || '/api/dashboard'

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
    setTimeout(() => _cache.get(k) === v && _cache.delete(k), ttlMs).unref?.()
  }
}

/* -------------------------------- Shapes --------------------------------- */
/**
 * @typedef {{ id:string, name:string, studentCount:number, active:boolean, trend:'up'|'flat'|'down', updatedAt:string }} CompanyRow
 * @typedef {{ id:string, type:'warning'|'error'|'info', title:string, detail?:string, href?:string, due?:string }} AlertItem
 * @typedef {{ studentCount:number, instructorCount:number, adminCount:number, permitSoon:number, medSoon:number, incomplete:number }} Kpis
 * @typedef {{ id:string, actor:string, action:string, timestamp:string, icon?:string }} ActivityItem
 */

/* -------------------------------- Mocks ---------------------------------- */

function mockCompanies({ limit = 5 } = {}) {
  const now = Date.now()
  const rows = [
    { id: 'acme', name: 'ACME Logistics',   studentCount: 42, active: true,  trend: 'up'   },
    { id: 'road', name: 'RoadStar Freight', studentCount: 31, active: true,  trend: 'flat' },
    { id: 'midw', name: 'Midwest Carriers', studentCount: 18, active: false, trend: 'down' },
    { id: 'north',name: 'North Haul LLC',   studentCount: 11, active: true,  trend: 'up'   },
    { id: 'swift',name: 'Swift & Sons',     studentCount: 8,  active: true,  trend: 'flat' },
  ].slice(0, Math.max(1, limit)).map((r, i) => ({ ...r, updatedAt: new Date(now - i*3_600_000).toISOString() }))
  return rows
}

function mockAlerts() {
  const soon = (d) => new Date(Date.now() + d * 86_400_000).toISOString()
  return [
    { id: 'a1', type: 'warning', title: '3 permits expiring within 30 days', href: '/admin/reports?view=permits', due: soon(27) },
    { id: 'a2', type: 'error',   title: '1 medical card expired',             href: '/admin/reports?view=med-cards', due: soon(-2) },
    { id: 'a3', type: 'info',    title: 'Instructor upload pending review',   href: '/admin/reports?view=instructors' },
  ]
}

function mockKpis() {
  return {
    studentCount:  128,
    instructorCount: 7,
    adminCount:      2,
    permitSoon:     4,
    medSoon:        2,
    incomplete:    19,
  }
}

function mockActivity({ limit = 10 } = {}) {
  const base = [
    { actor: 'You',            action: 'Marked invoice INV-104 paid' },
    { actor: 'J. Rivera',      action: 'Added student to ACME Logistics' },
    { actor: 'System',         action: 'Reported 8 completions to TPR' },
    { actor: 'M. Chen',        action: 'Updated instructor certification' },
    { actor: 'System',         action: 'Scheduled permit expiry export' },
  ]
  const now = Date.now()
  return base.slice(0, Math.max(1, limit)).map((x, i) => ({
    id: `act-${i + 1}`,
    actor: x.actor,
    action: x.action,
    timestamp: new Date(now - i * 45 * 60 * 1000).toISOString(),
  }))
}

/* ------------------------------- API Facade ------------------------------- */

export const companies = {
  /**
   * @param {{ schoolId:string, limit?:number, signal?:AbortSignal }} params
   * @returns {Promise<CompanyRow[]>}
   */
  async getSnapshot({ schoolId, limit = 5, signal } = {}) {
    const key = _key('companies:getSnapshot', { schoolId, limit })
    const hit = _getCached(key)
    if (hit) return hit

    if (USE_DASHBOARD_MOCKS || !schoolId) {
      await wait()
      const data = mockCompanies({ limit })
      _setCached(key, data)
      return data
    }

    // Example HTTP endpoint; replace with Firestore/callable if desired
    const url = `${DASHBOARD_BASE_URL}/companies?s=${encodeURIComponent(schoolId)}&limit=${limit}`
    const { ok, data, error } = await fetchJSON(url, { signal })
    if (!ok) throw new Error(error || 'Failed to load companies')
    const rows = (Array.isArray(data) ? data : []).map((c) => ({
      id: c.id ?? c.companyId,
      name: String(c.name || 'Company'),
      studentCount: Number(c.studentCount ?? c.students ?? 0) || 0,
      active: Boolean('active' in c ? c.active : (String(c.status || '').toLowerCase() !== 'inactive')),
      trend: ['up', 'flat', 'down'].includes(String(c.trend)) ? c.trend : 'flat',
      updatedAt: c.updatedAt || c.updated_at || new Date().toISOString(),
    }))
    _setCached(key, rows)
    return rows
  },
}

export const alerts = {
  /**
   * @param {{ schoolId:string, signal?:AbortSignal }} params
   * @returns {Promise<AlertItem[]>}
   */
  async get({ schoolId, signal } = {}) {
    const key = _key('alerts:get', { schoolId })
    const hit = _getCached(key)
    if (hit) return hit

    if (USE_DASHBOARD_MOCKS || !schoolId) {
      await wait()
      const data = mockAlerts()
      _setCached(key, data, 15_000)
      return data
    }

    const url = `${DASHBOARD_BASE_URL}/alerts?s=${encodeURIComponent(schoolId)}`
    const { ok, data, error } = await fetchJSON(url, { signal })
    if (!ok) throw new Error(error || 'Failed to load alerts')
    const rows = (Array.isArray(data) ? data : []).map((a, i) => ({
      id: a.id ?? `alert-${i + 1}`,
      type: /** @type {'warning'|'error'|'info'} */ (['warning','error','info'].includes(a.type) ? a.type : 'info'),
      title: String(a.title || 'Alert'),
      detail: a.detail || '',
      href: a.href || '',
      due: a.due || '',
    }))
    _setCached(key, rows, 15_000)
    return rows
  },
}

export const kpis = {
  /**
   * @param {{ schoolId:string, signal?:AbortSignal }} params
   * @returns {Promise<Kpis>}
   */
  async get({ schoolId, signal } = {}) {
    const key = _key('kpis:get', { schoolId })
    const hit = _getCached(key)
    if (hit) return hit

    if (USE_DASHBOARD_MOCKS || !schoolId) {
      await wait()
      const data = mockKpis()
      _setCached(key, data, 15_000)
      return data
    }

    const url = `${DASHBOARD_BASE_URL}/kpis?s=${encodeURIComponent(schoolId)}`
    const { ok, data, error } = await fetchJSON(url, { signal })
    if (!ok) throw new Error(error || 'Failed to load KPIs')

    const safe = (n, d=0) => (Number.isFinite(+n) ? +n : d)
    const out = {
      studentCount:   safe(data.studentCount),
      instructorCount:safe(data.instructorCount),
      adminCount:     safe(data.adminCount),
      permitSoon:     safe(data.permitSoon),
      medSoon:        safe(data.medSoon),
      incomplete:     safe(data.incomplete),
    }
    _setCached(key, out, 15_000)
    return out
  },
}

export const activity = {
  /**
   * @param {{ schoolId:string, limit?:number, signal?:AbortSignal }} params
   * @returns {Promise<ActivityItem[]>}
   */
  async getRecent({ schoolId, limit = 10, signal } = {}) {
    const key = _key('activity:getRecent', { schoolId, limit })
    const hit = _getCached(key)
    if (hit) return hit

    if (USE_DASHBOARD_MOCKS || !schoolId) {
      await wait()
      const data = mockActivity({ limit })
      _setCached(key, data, 10_000)
      return data
    }

    const url = `${DASHBOARD_BASE_URL}/activity?s=${encodeURIComponent(schoolId)}&limit=${limit}`
    const { ok, data, error } = await fetchJSON(url, { signal })
    if (!ok) throw new Error(error || 'Failed to load activity')
    const rows = (Array.isArray(data) ? data : []).map((e, i) => ({
      id: e.id ?? `act-${i + 1}`,
      actor: String(e.actor || 'System'),
      action: String(e.action || 'Updated'),
      timestamp: e.timestamp || new Date().toISOString(),
      icon: e.icon || '',
    }))
    _setCached(key, rows, 10_000)
    return rows
  },
}

/* ------------------------------ Public API ------------------------------- */

const dashboardApi = { companies, alerts, kpis, activity }
export default dashboardApi