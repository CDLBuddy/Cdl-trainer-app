// Path: src/admin/reports/student-reports/cert-template.js
// ======================================================================
// TPR Certificate helpers (pure functions)
// - Prefers the canonical TS builder (utils/cert-builder.ts) automatically
//   with a safe, synchronous fallback builder below.
// - buildCertPayload: compose a normalized completion record
// - buildTprCsvRow:    map that record to a CSV row for bulk uploads
// - toCsv:             tiny CSV stringifier (RFC-4180-ish)
// ======================================================================

// ------------------------------ canonical (preferred) -----------------------
// We import the TS builder *asynchronously* and cache the module. The
// exported buildCertPayload remains synchronous: if the canonical builder
// has loaded, we use it; otherwise we fall back to the local builder.
//
let __canonMod = null
let __canonLoadStarted = false

function __preloadCanonical() {
  if (__canonLoadStarted) return
  __canonLoadStarted = true
  try {
    // Kick off an idle preload (best effort)
    const start = () => {
      import('@/utils/cert-builder.ts')
        .then((m) => { __canonMod = m || null })
        .catch(() => { /* ignore; fallback stays in place */ })
    }
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // @ts-ignore
      window.requestIdleCallback(start, { timeout: 1200 })
    } else {
      setTimeout(start, 0)
    }
  } catch {
    // ignore
  }
}
__preloadCanonical()

// ------------------------------ utils --------------------------------------

const S = (x) => (x == null ? '' : String(x).trim())

/** ISO date (YYYY-MM-DD) without TZ drift */
export function toISODate(x) {
  if (!x) return ''
  const str = String(x).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  try {
    const d = new Date(x)
    if (!Number.isFinite(d.valueOf())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch { return '' }
}

const num = (v, def = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

// ------------------------------ builder ------------------------------------

/**
 * Build a normalized cert payload.
 * Prefers the canonical TS builder if it has been preloaded; otherwise
 * uses a local, dependency-free fallback builder.
 * @param {{student?:any, provider?:any, training?:any, schoolId?:string}} args
 */
export function buildCertPayload(args = {}) {
  // If the canonical builder is ready, use it and apply a tiny compat shim
  try {
    const fn = __canonMod?.buildCert || __canonMod?.default?.buildCert
    if (typeof fn === 'function') {
      const out = fn(args) || {}
      // Compat: older UI expects training.completionDate
      if (out?.training) {
        if (!out.training.completionDate && out.training.completedAt) {
          out.training.completionDate = out.training.completedAt
        }
      }
      // Top-level mirror as well
      if (!out.completedAt && out?.training?.completedAt) {
        out.completedAt = out.training.completedAt
      }
      return out
    }
  } catch {
    // fall through to fallback
  }

  // Fallback builder (previous implementation; kept tight and in-sync)
  const { student = {}, provider = {}, training = {}, schoolId = '' } = args

  // ---- trainee
  const first = S(student.firstName || student.first_name || student.givenName)
  const last  = S(student.lastName  || student.last_name  || student.familyName)
  const full  = S(student.fullName || student.name || `${first} ${last}`.trim())

  const trainee = {
    id: S(student.id || student.uid),
    firstName: first || undefined,
    lastName: last || undefined,
    fullName: full || `${first} ${last}`.trim(),
    dob: toISODate(student.dob || student.dateOfBirth || student.birthDate),
    licenseNumber: S(student.licenseNumber || student.cdlNumber || ''),
    licenseState:  S(student.licenseState  || student.cdlState  || ''),
    clpNumber: S(student.clpNumber || student.clp || ''),
    clpState:  S(student.clpState  || ''),
    clpIssued: toISODate(student.clpIssued || student.clpIssuedAt),
    email: S(student.email || ''),
    assignedCompany: S(student.assignedCompany || student.company || ''),
  }

  // ---- provider
  const prov = {
    name: S(provider.name || provider.providerName || provider.schoolName || 'Training Provider'),
    tprId: S(provider.tprId || provider.tprID || provider.trainingProviderId || ''),
    tin:   S(provider.tin || provider.taxId || ''),
    contactName:  S(provider.contactName || provider.adminName || ''),
    contactEmail: S(provider.contactEmail || provider.email || ''),
    contactPhone: S(provider.contactPhone || provider.phone || ''),
    address: {
      street: S(provider.street || ''),
      city:   S(provider.city || ''),
      state:  S(provider.state || ''),
      zip:    S(provider.zip || ''),
    },
  }

  // ---- training
  const classType = S(training.classType || training.cdlClass || training.class || 'A')
    .replace(/^class\s*/i, '')
    .toUpperCase() // 'A' | 'B' | 'C'
  const endorsement = S(training.endorsement || training.track || '').toUpperCase()
  const theory = {
    completed: !!(training.theory?.completed ?? training.theoryCompleted),
    completedAt: toISODate(training.theory?.completedAt || training.theoryCompletedAt),
    scorePct: Number.isFinite(Number(training.theory?.scorePct ?? training.theoryScorePct))
      ? Number(training.theory?.scorePct ?? training.theoryScorePct)
      : undefined,
  }
  const btw = {
    completed: !!(training.btw?.completed ?? training.btwCompleted ?? training.rangeCompleted),
    completedAt: toISODate(training.btw?.completedAt || training.btwCompletedAt),
    rangeHours: num(training.btw?.rangeHours ?? training.btwRangeHours ?? training.rangeHours, 0),
    publicRoadHours: num(training.btw?.publicRoadHours ?? training.btwPublicRoadHours ?? training.roadHours, 0),
    vehicleType: S(training.vehicleType || ''),
  }

  const completionDate =
    toISODate(
      training.completionDate ||
      training.completedAt ||
      theory.completedAt ||
      btw.completedAt
    )

  // derive programType (theory|btw|both)
  const programType = (theory.completed && btw.completed) ? 'both'
                     : (theory.completed ? 'theory'
                     : (btw.completed ? 'btw' : 'both'))

  const payload = {
    meta: {
      recordId: S(training.recordId || `cert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`),
      createdAt: new Date().toISOString(),
      schoolId: S(schoolId),
      schema: 'tpr.completion.v1',
    },
    provider: prov,
    trainee,
    training: {
      classType,
      endorsement,
      programType,
      theory,
      btw,
      completionDate,
      restrictionsLifted: Array.isArray(training.restrictionsLifted) ? training.restrictionsLifted : [],
      categories: Array.isArray(training.categories) ? training.categories.filter(Boolean) : [],
    },
    // Mirrors some fields at top-level for consumers that expect them
    programType,
    completedAt: completionDate,
  }

  return payload
}

// Back-compat alias (some callers may import this name)
export { buildCertPayload as buildCertTemplate }

// ------------------------------ CSV helpers ------------------------------

/** Stable FMCSA-style headers (adjust if their template changes) */
export const TPR_CSV_HEADERS = [
  'ProviderTPRID',
  'ProviderName',
  'CDLClass',
  'Endorsement',
  'TraineeFullName',
  'TraineeDOB',
  'CLPNumber',
  'CLPIssuingState',
  'CompletionDate',
  'TheoryCompleted',
  'BTWCompleted',
]

/**
 * Create a CSV row for TPR bulk-upload.
 * @param {ReturnType<typeof buildCertPayload>} cert
 */
export function buildTprCsvRow(cert) {
  const r = cert || {}
  const p = r.provider || {}
  const t = r.training || {}
  const u = r.trainee || {}

  return {
    ProviderTPRID: S(p.tprId),
    ProviderName: S(p.name),
    CDLClass: S(t.classType),                           // 'A' | 'B' | 'C'
    Endorsement: S(t.endorsement || ''),               // 'P','S','N',''...
    TraineeFullName: S(u.fullName),
    TraineeDOB: S(u.dob),
    CLPNumber: S(u.clpNumber || u.licenseNumber || ''),
    CLPIssuingState: S(u.clpState || u.licenseState || '').toUpperCase(),
    CompletionDate: S(t.completionDate || r.completedAt || t.theory?.completedAt || t.btw?.completedAt || ''),
    TheoryCompleted: t.theory?.completed ? 'Y' : 'N',
    BTWCompleted: t.btw?.completed ? 'Y' : 'N',
  }
}

/**
 * Stringify rows -> CSV text (RFC-4180-ish).
 * @param {Array<object>|object} rows
 * @param {string[]=} headers
 * @param {{ addBOM?: boolean, eol?: string, delimiter?: string }=} opts
 */
export function toCsv(rows, headers, opts = {}) {
  const items = Array.isArray(rows) ? rows : [rows]
  if (!items.length) return ''
  const delimiter = opts.delimiter ?? ','
  const eol = opts.eol ?? '\r\n'
  const addBOM = opts.addBOM ?? false

  const HEADERS = (headers && headers.length ? headers : Object.keys(items[0]))

  const esc = (val) => {
    const raw = val == null ? '' : String(val)
    const needsQuote =
      raw.includes(delimiter) ||
      raw.includes('"') ||
      raw.includes('\n') ||
      raw.includes('\r') ||
      /^\s|\s$/.test(raw)
    return needsQuote ? `"${raw.replace(/"/g, '""')}"` : raw
  }

  const lines = [
    HEADERS.map(h => esc(h)).join(delimiter),
    ...items.map(item => HEADERS.map(h => esc(item[h])).join(delimiter)),
  ]

  const csv = lines.join(eol) + eol
  return addBOM ? '\uFEFF' + csv : csv
}