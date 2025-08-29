// Path: src/utils/cert-builder.ts
// ---------------------------------------------------------------------------
// Canonical certificate builder (pure, testable)
// - Maps { student, training, provider } → TPRCompletion
// - Defensive: tolerates many source shapes, normalizes dates/codes
// - Mirrors programType & completedAt at both top-level and training.*
// ---------------------------------------------------------------------------

import type {
  ClassType,
  Endorsement,
  ProgramType,
  TPRCompletion,
  ISODate,
} from '@/types/eldt'
import {
  normalizeClassType,
  normalizeEndorsement,
  normalizeProgramType,
  toISODate,
} from '@/types/eldt'

type AnyRecord = Record<string, unknown>

const S = (v: unknown) => (v == null ? '' : String(v).trim())

function coalesce(...vals: unknown[]) {
  for (const v of vals) {
    const s = S(v)
    if (s) return s
  }
  return ''
}
function coalesceDate(...vals: unknown[]): ISODate | undefined {
  for (const v of vals) {
    const iso = toISODate(v)
    if (iso) return iso
  }
  return undefined
}

function pathGet(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined
  let cur: unknown = obj
  for (const key of path.split('.')) {
    if (cur && typeof cur === 'object' && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  return cur
}

export interface BuildArgs {
  student?: AnyRecord
  training?: AnyRecord
  provider?: AnyRecord
  schoolId?: string
}

/** Build the normalized TPRCompletion payload. */
export function buildCert({
  student = {},
  training = {},
  provider = {},
  schoolId = '',
}: BuildArgs): TPRCompletion {
  // ---- trainee -----------------------------------------------------------
  const first = coalesce(
    student['firstName'],
    student['first_name'],
    student['givenName']
  )
  const last = coalesce(
    student['lastName'],
    student['last_name'],
    student['familyName']
  )
  const full = coalesce(
    student['fullName'],
    student['name'],
    `${first} ${last}`.trim()
  )

  const trainee = {
    fullName: full,
    dob: coalesceDate(
      student['dob'],
      student['dateOfBirth'],
      student['birthDate']
    ) as ISODate, // required by type
    licenseNumber: coalesce(student['licenseNumber'], student['cdlNumber']),
    licenseState: coalesce(student['licenseState'], student['cdlState']),
    clpNumber: S(student['clpNumber']),
    clpState: S(student['clpState']),
    email: S(student['email']),
    id: S((student as AnyRecord).id ?? (student as AnyRecord).uid ?? ''),
  }

  // ---- provider ----------------------------------------------------------
  interface WindowWithTPR extends Window {
    __TPR_ID__?: string
  }
  const tprFromGlobal =
    typeof window !== 'undefined' ? (window as WindowWithTPR).__TPR_ID__ ?? '' : ''

  const prov = {
    tprId: coalesce(provider['tprId'], provider['TPR_ID'], tprFromGlobal),
    name: coalesce(provider['name'], provider['providerName']),
    tin: S(provider['tin'] ?? provider['TIN'] ?? ''),
  }

  // ---- training ----------------------------------------------------------
  // detect program type from flags if not explicitly present
  const theoryCompleted = !!(
    pathGet(training, 'theory.completed') ?? training['theoryCompleted']
  )
  const btwCompleted = !!(
    pathGet(training, 'btw.completed') ?? training['btwCompleted']
  )

  const inferredProgram: ProgramType =
    theoryCompleted && btwCompleted
      ? 'both'
      : theoryCompleted
        ? 'theory'
        : btwCompleted
          ? 'btw'
          : 'both'

  const programType: ProgramType =
    normalizeProgramType(
      coalesce(training['programType'], training['trainingType'])
    ) ?? inferredProgram

  const classType: ClassType =
    normalizeClassType(
      coalesce(training['classType'], training['class'], training['cdlClass'])
    ) ?? 'A'

  const endorsement: Endorsement | '' =
    normalizeEndorsement(
      coalesce(
        training['endorsement'],
        training['endorse'],
        training['endorsements']
      )
    ) ?? ''

  const completedAt = coalesceDate(
    training['completionDate'],
    training['completedAt']
  )

  const theoryCompletedAt = coalesceDate(
    pathGet(training, 'theory.completedAt'),
    training['theoryCompletedAt']
  )
  const btwCompletedAt = coalesceDate(
    pathGet(training, 'btw.completedAt'),
    training['btwCompletedAt']
  )

  const rangeHours =
    Number(
      pathGet(training, 'btw.rangeHours') ?? training['rangeHours'] ?? 0
    ) || 0
  const publicRoadHours =
    Number(
      pathGet(training, 'btw.publicRoadHours') ?? training['roadHours'] ?? 0
    ) || 0

  const categories = Array.isArray(training['categories'])
    ? (training['categories'] as string[]).filter(Boolean)
    : Array.isArray(training['endorsements'])
      ? (training['endorsements'] as string[]).filter(Boolean)
      : []

  // ---- final payload -----------------------------------------------------
  const payload: TPRCompletion = {
    trainee,
    provider: prov,
    training: {
      classType,
      endorsement,
      programType,
      completedAt,
      theory: {
        completed: theoryCompleted || undefined,
        completedAt: theoryCompletedAt || undefined,
      },
      btw: {
        completed: btwCompleted || undefined,
        completedAt: btwCompletedAt || undefined,
        rangeHours,
        publicRoadHours,
      },
      categories,
    },
    // mirror fields for consumers that read top-level
    programType,
    completedAt,
    categories,
    meta: {
      schoolId: S(schoolId),
      recordId:
        S((training as AnyRecord).recordId) ||
        `cert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    },
  }

  return payload
}

export default { buildCert }
