// src/admin/reports/services/tprClient.js
// ============================================================================
// TPR Client (unified facade)
// - Modes: 'api' | 'bulk' | 'portal' (configure via ENV or window globals)
// - submitCompletion(payload, opts)
// - bulkUpload(payloads, opts)
// - providerId(), mode(), canSubmitViaApi(), validateProviderConfig()
// - No import.meta.* usage; SSR/StrictMode safe
// ============================================================================

import { ENV } from '@utils/env.js'

/* --------------------------------- Config --------------------------------- */

const BASE = (ENV && (ENV.VITE_TPR_API_BASE || ENV.TPR_API_BASE)) || '' // e.g., 'https://tpr.example.com'

const PROVIDER_ID =
  (ENV && (ENV.VITE_TPR_PROVIDER_ID || ENV.TPR_PROVIDER_ID)) ||
  (typeof window !== 'undefined' && /** @type any */ (window)).__TPR_ID__ ||
  ''

const MODE = String(
  (ENV && (ENV.VITE_TPR_MODE || ENV.TPR_MODE)) ||
    (typeof window !== 'undefined' && /** @type any */ (window)).__TPR_MODE__ ||
    'portal'
).toLowerCase() // 'api' | 'bulk' | 'portal'

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_RETRIES = 2 // for API mode (5xx / network)

/* --------------------------------- Types ---------------------------------- */
/**
 * @typedef {{
 *   trainee?: {
 *     firstName?: string, middleName?: string, lastName?: string, fullName?: string,
 *     dob?: string, // YYYY-MM-DD
 *     clpNumber?: string, clpState?: string,
 *     licenseNumber?: string, licenseState?: string
 *   },
 *   training?: {
 *     classType?: 'A'|'B'|'C',
 *     endorsement?: string,
 *     theory?: { completed?: boolean, completedAt?: string },
 *     btw?:    { completed?: boolean, completedAt?: string },
 *     completionDate?: string // YYYY-MM-DD
 *   },
 *   provider?: { tprId?: string, name?: string, tin?: string }
 * }} CompletionPayload
 */

/* ------------------------------- Utilities -------------------------------- */

const __DEV__ =
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV === 'development') ||
  (typeof window !== 'undefined' && /** @type any */ (window)).__DEV__

function isObj(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}
const wait = ms => new Promise(r => setTimeout(r, ms))

function joinUrl(base, path) {
  if (!base) return path
  return `${base.replace(/\/+$/, '')}/${String(path || '').replace(/^\/+/, '')}`
}

/** Compose AbortSignals so timeouts + caller signal both work */
function composeSignal(timeoutMs, externalSignal) {
  if (timeoutMs <= 0 && !externalSignal) return undefined
  const controller = new AbortController()
  let timeoutId = null

  const onAbort = () =>
    controller.abort(
      externalSignal?.reason || new DOMException('aborted', 'AbortError')
    )
  externalSignal?.addEventListener?.('abort', onAbort, { once: true })

  if (timeoutMs > 0) {
    timeoutId = setTimeout(
      () => controller.abort(new Error('timeout')),
      timeoutMs
    )
    timeoutId?.unref?.() // no-op in browsers
  }

  return {
    signal: controller.signal,
    cleanup() {
      if (timeoutId) clearTimeout(timeoutId)
      externalSignal?.removeEventListener?.('abort', onAbort)
    },
  }
}

async function fetchJSON(
  url,
  {
    method = 'GET',
    headers,
    body,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
  } = {}
) {
  const composed = composeSignal(timeoutMs, signal)
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(PROVIDER_ID ? { 'X-TPR-Provider': PROVIDER_ID } : null),
        ...(headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: composed?.signal,
    })

    const ct = res.headers.get('content-type') || ''
    const isJson = /\bapplication\/json\b/i.test(ct)
    const data = isJson
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => '')

    if (!res.ok) {
      const transient = res.status >= 500 && res.status < 600
      if (transient && retries > 0) {
        if (__DEV__) console.warn('[tprClient] retrying after 5xx:', res.status)
        await wait(400 * (DEFAULT_RETRIES - retries + 1))
        return fetchJSON(url, {
          method,
          headers,
          body,
          signal,
          timeoutMs,
          retries: retries - 1,
        })
      }
      return {
        ok: false,
        status: res.status,
        data,
        error: data?.message || data || `HTTP ${res.status}`,
      }
    }
    return { ok: true, status: res.status, data, error: null }
  } catch (err) {
    const transient = /aborted|timeout|network/i.test(
      String(err?.message || err)
    )
    if (transient && retries > 0) {
      if (__DEV__)
        console.warn('[tprClient] retrying after network error:', err)
      await wait(400 * (DEFAULT_RETRIES - retries + 1))
      return fetchJSON(url, {
        method,
        headers,
        body,
        signal,
        timeoutMs,
        retries: retries - 1,
      })
    }
    return {
      ok: false,
      status: 0,
      data: null,
      error: String(err?.message || err),
    }
  } finally {
    composed?.cleanup?.()
  }
}

/* ------------------------------ Normalization ----------------------------- */

const trimmed = s => (typeof s === 'string' ? s.trim() : '')

/**
 * Validate & normalize your completion payload into a shape the backend can accept.
 * Throws a descriptive Error with .issues array when invalid.
 * @param {CompletionPayload} input
 */
function normalizeCompletion(input) {
  const issues = []
  if (!isObj(input)) issues.push('payload must be an object')

  const trainee = isObj(input?.trainee) ? input.trainee : {}
  const training = isObj(input?.training) ? input.training : {}
  const provider = isObj(input?.provider) ? input.provider : {}

  const fullName =
    trimmed(trainee.fullName) ||
    [
      trimmed(trainee.firstName),
      trimmed(trainee.middleName),
      trimmed(trainee.lastName),
    ]
      .filter(Boolean)
      .join(' ')

  const dob = trimmed(trainee.dob)
  const clp = trimmed(trainee.clpNumber || trainee.licenseNumber)
  const state = trimmed(trainee.clpState || trainee.licenseState)

  const classType = trimmed(training.classType || '')
  const completionDate = trimmed(
    training.completionDate ||
      training?.theory?.completedAt ||
      training?.btw?.completedAt ||
      ''
  )
  const theoryDone = !!training?.theory?.completed
  const btwDone = !!training?.btw?.completed

  const tprId = trimmed(provider.tprId || PROVIDER_ID)

  if (!fullName) issues.push('trainee.fullName (or names) is required')
  if (!dob) issues.push('trainee.dob is required (YYYY-MM-DD)')
  if (!clp) issues.push('trainee.clpNumber / licenseNumber is required')
  if (!state) issues.push('trainee.clpState / licenseState is required')
  if (!classType) issues.push('training.classType is required (A|B|C)')
  if (!completionDate) issues.push('training.completionDate is required')
  if (!tprId) issues.push('provider.tprId is required (configure PROVIDER ID)')

  if (issues.length) {
    const err = new Error('Invalid completion payload')
    err /** @type any */.issues = issues
    throw err
  }

  return {
    trainee: {
      fullName,
      firstName: trimmed(trainee.firstName),
      middleName: trimmed(trainee.middleName),
      lastName: trimmed(trainee.lastName),
      dob,
      clpNumber: clp,
      clpState: state,
      licenseNumber: trimmed(trainee.licenseNumber),
      licenseState: trimmed(trainee.licenseState),
    },
    training: {
      classType,
      endorsement: trimmed(training.endorsement),
      theory: {
        completed: theoryDone,
        completedAt: trimmed(training?.theory?.completedAt) || completionDate,
      },
      btw: {
        completed: btwDone,
        completedAt: trimmed(training?.btw?.completedAt) || completionDate,
      },
      completionDate,
    },
    provider: {
      tprId,
      name: trimmed(provider.name),
      tin: trimmed(provider.tin),
    },
  }
}

/* --------------------------------- Public --------------------------------- */

/**
 * Submit a single completion.
 * - API mode: POST to `${BASE}/completions`
 * - Portal/Bulk mode: returns an instruction stub the UI can present
 * @param {CompletionPayload} payload
 * @param {{ signal?:AbortSignal, timeoutMs?:number }} [opts]
 */
export async function submitCompletion(payload, opts = {}) {
  const normalized = normalizeCompletion(payload)

  if (MODE === 'api' && BASE) {
    const { ok, data, error, status } = await fetchJSON(
      joinUrl(BASE, '/completions'),
      {
        method: 'POST',
        body: { providerId: normalized.provider.tprId, completion: normalized },
        signal: opts.signal,
        timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      }
    )
    if (!ok) {
      const err = new Error(
        `TPR API error ${status || ''}: ${error || 'unknown'}`
      )
      err /** @type any */.status = status
      err /** @type any */.payload = normalized
      throw err
    }
    return { ok: true, mode: MODE, data }
  }

  // Non-API modes: surface clear guidance for the UI
  return {
    ok: true,
    mode: MODE,
    data: normalized,
    instructions:
      MODE === 'bulk'
        ? 'Aggregate CSV rows and upload via the TPR bulk upload portal.'
        : 'Enter this completion in the TPR web portal.',
  }
}

/**
 * Bulk upload many completions.
 * - API mode: concurrent queue (configurable), returns per-item successes/failures
 * - Portal/Bulk: returns a stub with the normalized rows so you can create CSV
 * @param {CompletionPayload[]} payloads
 * @param {{
 *   signal?: AbortSignal,
 *   timeoutMs?: number,
 *   concurrency?: number,
 *   onProgress?: (info:{ total:number, done:number, ok:number, failed:number, current?:number }) => void
 * }} [opts]
 */
export async function bulkUpload(payloads = [], opts = {}) {
  const rows = payloads.map(normalizeCompletion)

  if (MODE !== 'api' || !BASE) {
    return {
      ok: true,
      mode: MODE,
      message:
        MODE === 'bulk'
          ? 'Prepare a CSV and upload via the TPR bulk portal.'
          : 'Multiple completions ready; enter via TPR portal or switch to API mode.',
      rows, // feed these to your exporters to build CSV
      count: rows.length,
    }
  }

  // API mode: concurrent queue
  const total = rows.length
  const concurrency = Math.max(1, Math.min(Number(opts.concurrency || 4), 10))
  let done = 0,
    ok = 0,
    failed = 0

  /** @type {Array<{ok:boolean, data?:any, error?:any, index:number}>} */
  const results = new Array(total)
  let index = 0
  let aborted = false

  const work = async () => {
    while (!aborted) {
      const i = index++
      if (i >= total) break
      const item = rows[i]
      try {
        if (opts.signal?.aborted) throw new Error('aborted')
        const {
          ok: resOk,
          data,
          error,
          status,
        } = await fetchJSON(joinUrl(BASE, '/completions'), {
          method: 'POST',
          body: { providerId: item.provider.tprId, completion: item },
          signal: opts.signal,
          timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        })
        if (!resOk) throw new Error(`HTTP ${status || 0}: ${error || 'failed'}`)
        results[i] = { ok: true, data, index: i }
        ok++
      } catch (error) {
        results[i] = { ok: false, error, index: i }
        failed++
      } finally {
        done++
        opts.onProgress?.({ total, done, ok, failed, current: i })
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => work())
  try {
    await Promise.all(workers)
  } catch (e) {
    aborted = true
    throw e
  }

  return {
    ok: failed === 0,
    mode: MODE,
    total,
    failed,
    results,
  }
}

/* --------------------------------- Helpers -------------------------------- */

export function providerId() {
  return PROVIDER_ID
}
export function mode() {
  return MODE
}

/** Quick capability check for UI toggles */
export function canSubmitViaApi() {
  return MODE === 'api' && !!BASE && !!PROVIDER_ID
}

/** Optional: quick preflight to surface config issues in the UI */
export function validateProviderConfig() {
  const issues = []
  if (!PROVIDER_ID) issues.push('Missing providerId (TPR ID)')
  if (MODE === 'api' && !BASE)
    issues.push('API mode selected but no VITE_TPR_API_BASE configured')
  return {
    ok: issues.length === 0,
    issues,
    mode: MODE,
    providerId: PROVIDER_ID,
    base: BASE,
  }
}
