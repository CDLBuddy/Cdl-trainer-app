// src/admin/reports/hooks/useStudentCert.js
// ======================================================================
// useStudentCert
// - Accepts either ({ student, training, provider, schoolId }) OR (student, schoolId)
// - Normalizes student/provider/training shapes
// - Optionally loads missing pieces from ../services if available
// - Builds a certificate via cert-template.js (supports both buildCertTemplate/buildCertPayload)
// - Returns: { student, provider, training, cert, ready, issues, loading, error, refresh }
// - Extras: prefetchCertBuilder() to warm the builder on idle/hover
// ======================================================================

import { useCallback, useEffect, useMemo, useState } from 'react'

import { ENV } from '@utils/env.js'

/* ------------------------------ Builder loader --------------------------- */

let _builder = null
let _builderPromise = null

async function ensureBuilder() {
  if (_builder) return _builder
  if (_builderPromise) return _builderPromise

  _builderPromise = (async () => {
    try {
      const mod = await import('../student-reports/cert-template.js')
      _builder = mod?.buildCertTemplate || mod?.buildCertPayload || null
    } catch {
      _builder = null
    }
    return _builder
  })()

  return _builderPromise
}

/** Optional: let callers prefetch this on idle/hover. */
export async function prefetchCertBuilder() {
  try {
    await ensureBuilder()
  } catch {
    // intentionally ignored
  }
}

/* -------------------------------- Utilities ------------------------------ */

function safeStr(v) {
  return v == null ? '' : String(v)
}

/* ----------------------------- Normalizers ------------------------------- */

function normalizeStudent(s = {}) {
  const first = safeStr(s.firstName || s.first_name || '')
  const last = safeStr(s.lastName || s.last_name || '')
  const full = safeStr(s.fullName || s.name || `${first} ${last}`.trim())
  const dob = safeStr(s.dob || s.dateOfBirth || s.birthDate)
  const licNo = safeStr(s.licenseNumber || s.clpNumber || s.license || s.clp)
  const licSt = safeStr(s.licenseState || s.clpState || s.state)
  return {
    ...s,
    firstName: first || undefined,
    lastName: last || undefined,
    fullName: full || undefined,
    dob: dob || undefined,
    licenseNumber: licNo || undefined,
    licenseState: licSt || undefined,
  }
}

function normalizeTraining(t = {}) {
  const cls = safeStr(t.classType || t.class || t.program || 'A')
    .replace(/^class\s*/i, '')
    .toUpperCase()
  const end = safeStr(t.endorsement || '').toUpperCase()
  const theory = t.theory || {
    completed: !!t.theoryCompleted,
    completedAt: t.theoryCompletedAt || '',
  }
  const btw = t.btw || {
    completed: !!(t.behindTheWheelCompleted || t.rangeCompleted),
    completedAt: t.btwCompletedAt || '',
    rangeHours: Number(t.rangeHours || 0) || 0,
    publicRoadHours: Number(t.roadHours || 0) || 0,
  }
  const completionDate = safeStr(t.completionDate || t.completedAt)
  const categories = Array.isArray(t.categories)
    ? t.categories.filter(Boolean)
    : []

  return {
    ...t,
    classType: cls || 'A',
    endorsement: end || undefined,
    theory: {
      completed: !!theory.completed,
      completedAt: theory.completedAt || '',
      ...theory,
    },
    btw: {
      completed: !!btw.completed,
      completedAt: btw.completedAt || '',
      rangeHours: Number(btw.rangeHours || 0) || 0,
      publicRoadHours: Number(btw.publicRoadHours || 0) || 0,
      ...btw,
    },
    completionDate: completionDate || '',
    categories,
  }
}

function normalizeProvider(p = {}) {
  const tprId =
    safeStr(p.tprId) ||
    safeStr(ENV.VITE_TPR_PROVIDER_ID) ||
    (typeof window !== 'undefined' ? safeStr(window.__TPR_ID__) : '') ||
    ''
  const name =
    safeStr(p.name || p.providerName) ||
    (typeof window !== 'undefined' ? safeStr(window.__PROVIDER_NAME__) : '') ||
    'Training Provider'
  const tin = safeStr(p.tin || p.taxId || '')
  return { ...p, tprId, name, tin }
}

/* ----------------------------- Validation -------------------------------- */

function validateCertShape(c) {
  if (!c) return ['Certificate could not be built']
  const errs = []
  if (!safeStr(c?.trainee?.fullName)) errs.push('Trainee full name is missing')
  if (!safeStr(c?.trainee?.dob)) errs.push('DOB is missing')
  if (!safeStr(c?.trainee?.clpNumber || c?.trainee?.licenseNumber))
    errs.push('CLP/CDL number is missing')
  if (!safeStr(c?.trainee?.clpState || c?.trainee?.licenseState))
    errs.push('Issuing state is missing')
  if (!safeStr(c?.training?.classType))
    errs.push('Training class type (A/B/C) is missing')
  if (!safeStr(c?.training?.completionDate || c?.completedAt))
    errs.push('Completion date is missing')
  if (!safeStr(c?.provider?.tprId)) errs.push('Provider TPR ID is missing')
  return errs
}

/* ----------------------------- Fallback builder -------------------------- */

function fallbackBuild({ student, training, provider }) {
  const s = normalizeStudent(student)
  const t = normalizeTraining(training)
  const p = normalizeProvider(provider)
  return {
    trainee: {
      fullName: s.fullName,
      dob: s.dob,
      licenseNumber: s.licenseNumber,
      licenseState: s.licenseState,
      clpNumber: s.clpNumber || s.licenseNumber,
      clpState: s.clpState || s.licenseState,
      ...s,
    },
    training: t,
    provider: p,
    completedAt:
      t.completionDate || t.btw?.completedAt || t.theory?.completedAt || '',
  }
}

/* ---------------------------------- Hook --------------------------------- */
/**
 * useStudentCert(input, maybeSchoolId?)
 * - input can be { student, training, provider, schoolId } OR a student object
 * - maybeSchoolId is only used for the legacy signature
 */
export default function useStudentCert(input, maybeSchoolId) {
  // Support both signatures
  const argIsObj =
    input &&
    typeof input === 'object' &&
    ('student' in input ||
      'training' in input ||
      'provider' in input ||
      'schoolId' in input)

  const studentInit = argIsObj ? input.student : input
  const trainingInit = argIsObj ? input.training : undefined
  const providerInit = argIsObj ? input.provider : undefined
  const schoolId = argIsObj ? input.schoolId : maybeSchoolId

  const [student, setStudent] = useState(() =>
    normalizeStudent(studentInit || {})
  )
  const [training, setTraining] = useState(() =>
    normalizeTraining(trainingInit || studentInit?.training || {})
  )
  const [provider, setProvider] = useState(() =>
    normalizeProvider(providerInit || {})
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Keep local normalized state in sync if props change
  useEffect(() => {
    setStudent(normalizeStudent(studentInit || {}))
  }, [studentInit])
  useEffect(() => {
    setTraining(normalizeTraining(trainingInit || studentInit?.training || {}))
  }, [trainingInit, studentInit])
  useEffect(() => {
    setProvider(normalizeProvider(providerInit || {}))
  }, [providerInit])

  // Optionally fetch missing bits (if your services expose helpers)
  const loadMissing = useCallback(async () => {
    let services = null
    try {
      services = await import('../services').catch(() => null)
    } catch {
      services = null
    }

    const needsProvider = !provider?.tprId && schoolId
    const needsTraining =
      !training?.completionDate && (student?.id || student?.uid)

    if (!needsProvider && !needsTraining) return

    setLoading(true)
    setError('')
    try {
      const tasks = []
      if (needsProvider && services?.loadProviderProfile) {
        tasks.push(
          services
            .loadProviderProfile(schoolId)
            .then(p =>
              setProvider(prev => normalizeProvider({ ...prev, ...(p || {}) }))
            )
        )
      }
      if (needsTraining && services?.loadStudentTraining) {
        const sid = student?.id || student?.uid
        tasks.push(
          services
            .loadStudentTraining(sid, { schoolId })
            .then(t =>
              setTraining(prev => normalizeTraining({ ...prev, ...(t || {}) }))
            )
        )
      }
      await Promise.all(tasks)
    } catch {
      setError(
        'Some details could not be loaded. You can still view/print the basics.'
      )
    } finally {
      setLoading(false)
    }
  }, [
    provider?.tprId,
    schoolId,
    training?.completionDate,
    student?.id,
    student?.uid,
  ])

  const refresh = useCallback(() => loadMissing(), [loadMissing])

  useEffect(() => {
    loadMissing()
  }, [loadMissing])

  // Build cert + readiness
  const cert = useMemo(() => {
    // Use lazy-loaded builder when available; fallback otherwise (sync)
    // We intentionally build synchronously with the best available builder at this moment
    // to keep the UI responsive. The result will rebuild when state changes.
    const build = _builder || fallbackBuild
    return build({ student, training, provider })
  }, [student, training, provider])

  const issues = useMemo(() => validateCertShape(cert), [cert])
  const ready =
    issues.length === 0 &&
    !!(cert?.training?.completionDate || cert?.completedAt)

  // Gentle background prefetch of the real builder once the hook is used
  useEffect(() => {
    ensureBuilder().catch(() => {})
  }, [])

  return {
    student,
    training,
    provider,
    cert,
    ready,
    issues, // [] when good
    loading,
    error,
    refresh,
  }
}
