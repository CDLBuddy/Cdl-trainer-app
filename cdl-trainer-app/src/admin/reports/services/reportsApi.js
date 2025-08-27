// src/admin/reports/services/reportsApi.js
// ======================================================================
// Reports API (pure)
// - Thin wrappers around your existing admin-data utils
// - Normalizes shapes so UI can rely on a stable contract
// - Compatible with current hooks (same return signature)
// ======================================================================

import { fetchUsersForSchool, fetchCompaniesForSchool } from '@utils/admin-data.js'
import { getCurrentSchoolBranding } from '@utils/school-branding.js'

/* ----------------------------- helpers ------------------------------ */

const S = (v) => (v == null ? '' : String(v))

function clamp01(n) {
  const x = Number(n)
  return Number.isFinite(x) ? Math.max(0, Math.min(100, Math.round(x))) : undefined
}

function normalizeBrand(raw = {}) {
  const schoolName = S(raw.schoolName || raw.name || raw.displayName || 'Current School')
  return { ...raw, schoolName }
}

function dedupe(list, keyOf = (x) => x?.id ?? x?.uid ?? x?.email ?? '') {
  const seen = new Set()
  const out = []
  for (const item of list) {
    const k = S(keyOf(item))
    if (k && seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out
}

/* ----------------------------- normalizers ----------------------------- */

/**
 * Normalize a user to the fields the UI consumes.
 * Tolerates different backend shapes/keys.
 * @param {any} u
 */
export function normalizeUser(u = {}) {
  const id   = u.id ?? u.uid ?? u.userId ?? u.email ?? null
  const role = S(u.role ?? u.type ?? '').toLowerCase()

  const name =
    u.name ??
    u.fullName ??
    [u.firstName ?? u.first_name, u.lastName ?? u.last_name].filter(Boolean).join(' ') ||
    ''

  const assignedCompany    = u.assignedCompany ?? u.company ?? u.org ?? ''
  const assignedInstructor = u.assignedInstructor ?? u.instructor ?? ''

  const permitExpiry    = u.permitExpiry ?? u.clpExpiry ?? u.permit_expires ?? ''
  const profileProgress = clamp01(u.profileProgress ?? u.profileCompletion)

  const email = u.email ?? u.username ?? ''

  return {
    id,
    name: S(name),
    email: S(email),
    role,
    assignedCompany: S(assignedCompany),
    assignedInstructor: S(assignedInstructor),
    permitExpiry,
    profileProgress,
    __raw: u,
  }
}

/**
 * Normalize a company snapshot for chips + roster header.
 * @param {any} c
 */
export function normalizeCompany(c = {}) {
  const studentCount =
    Number.isFinite(c.studentCount) ? Number(c.studentCount)
  : Number.isFinite(c.rosterCount)  ? Number(c.rosterCount)
  : Number(c.count ?? 0) || 0

  return {
    id: c.id ?? c.companyId ?? c.uid ?? null,
    name: S(c.name ?? c.companyName ?? c.title ?? 'Company'),
    studentCount,
    expiringSoon: Number(c.expiringSoon ?? c.soonToExpire ?? 0) || 0,
    __raw: c,
  }
}

/* ------------------------------- public -------------------------------- */

/**
 * Load all data needed by the AdminReports screen.
 * Returns { brand, users, companies } — same contract your hook expects.
 *
 * @param {string} schoolId
 * @param {{ signal?: AbortSignal, timeoutMs?: number, normalize?: boolean, partialOk?: boolean }} [opts]
 */
export async function loadReportsBundle(schoolId, opts = {}) {
  const {
    signal,
    timeoutMs = 0,           // 0 = no timeout
    normalize = true,        // UI relies on normalized fields
    partialOk = false,       // false = fail-fast (current behavior)
  } = opts

  const tasks = [
    wrapMaybe(getCurrentSchoolBranding, [], { label: 'branding', signal, timeoutMs }),
    wrapMaybe(fetchUsersForSchool,     [schoolId], { label: 'users', signal, timeoutMs }),
    wrapMaybe(fetchCompaniesForSchool, [schoolId], { label: 'companies', signal, timeoutMs }),
  ]

  const runAll = partialOk ? allSettledValues(tasks) : allStrict(tasks)
  const [brandRaw, usersRaw, companiesRaw] = await runAll

  const brand     = brandRaw || {}
  const usersArr  = Array.isArray(usersRaw) ? usersRaw : []
  const compsArr  = Array.isArray(companiesRaw) ? companiesRaw : []

  if (!normalize) return { brand, users: usersArr, companies: compsArr }

  // Normalize + de-dupe (protect against duplicated rows from the backend)
  const users     = dedupe(usersArr.map(normalizeUser), (u) => u.id ?? u.email ?? u.name)
  const companies = dedupe(compsArr.map(normalizeCompany), (c) => c.id ?? c.name)

  return {
    brand: normalizeBrand(brand),
    users,
    companies,
  }
}

/* ------------------------------ internals ------------------------------ */

/**
 * Wrap a function call with optional AbortSignal/timeout without requiring
 * the underlying impl to support either. If it throws, the error rethrows.
 */
function wrapMaybe(fn, args = [], { label = 'task', signal, timeoutMs = 0 } = {}) {
  const p = Promise.resolve().then(() => fn(...args))

  if (!signal && !timeoutMs) return p

  const killers = []
  if (signal) {
    killers.push(
      new Promise((_, reject) => {
        if (signal.aborted) reject(abortError(label))
        signal.addEventListener('abort', () => reject(abortError(label)), { once: true })
      })
    )
  }
  if (timeoutMs > 0) {
    killers.push(new Promise((_, reject) => {
      setTimeout(() => reject(timeoutError(label, timeoutMs)), timeoutMs)
    }))
  }

  return Promise.race([p, ...killers])
}

function abortError(label) {
  const e = new Error(`${label} aborted`)
  e.name = 'AbortError'
  return e
}
function timeoutError(label, ms) {
  const e = new Error(`${label} timed out after ${ms}ms`)
  e.name = 'TimeoutError'
  return e
}

async function allStrict(tasks) { return Promise.all(tasks) }
async function allSettledValues(tasks) {
  const settled = await Promise.allSettled(tasks)
  return settled.map((r) => (r.status === 'fulfilled' ? r.value : undefined))
}