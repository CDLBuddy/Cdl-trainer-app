// Path: src/admin/billing/components/statusMap.js
// ============================================================================
// Billing • Status Map (pure)
// - Single source of truth for allowed statuses across scopes
// - Backward compatible with getAllowedStatuses(boolean)
// - Adds helpful guards, canonicalizer, and flexible scope API
// ============================================================================

/**
 * @typedef {'employer'|'individual'} StatusScope
 * @typedef {'paid'|'partial'|'unpaid'} EmployerStatus
 * @typedef {'paid'|'partial'|'pending'|'waived'} IndividualStatus
 */

// Central lists — edit here to add/remove statuses
export const EMPLOYER_STATUSES   = Object.freeze(['paid', 'partial', 'unpaid'])
export const INDIVIDUAL_STATUSES = Object.freeze(['paid', 'partial', 'pending', 'waived'])

// Fast lookup Sets (internal)
const EMPLOYER_SET   = new Set(EMPLOYER_STATUSES)
const INDIVIDUAL_SET = new Set(INDIVIDUAL_STATUSES)

// Friendly alias map so small wording changes don’t break UI
const ALIASES = Object.freeze({
  // employer-ish
  unpaid: 'unpaid',
  partial: 'partial',
  paid: 'paid',

  // individual-ish
  pending: 'pending',
  waived: 'waived',

  // common phrases
  'partially paid': 'partial',
  'incomplete': 'pending',
  'not paid': 'unpaid',
  'fully paid': 'paid',
})

/** Normalize any input → canonical token (lowercase), or '' if none. */
export function normalizeStatus(value) {
  const v = String(value ?? '').trim().toLowerCase()
  if (!v) return ''
  return ALIASES[v] || v
}

/**
 * Back-compat helper: boolean means “isIndividual”.
 * - getAllowedStatuses(true)  -> individual list
 * - getAllowedStatuses(false) -> employer list
 *
 * You can also pass a string scope ("individual" | "employer").
 */
export function getAllowedStatuses(scopeOrBool) {
  const scope =
    typeof scopeOrBool === 'string'
      ? scopeOrBool
      : scopeOrBool ? 'individual' : 'employer'
  return scope === 'individual' ? INDIVIDUAL_STATUSES : EMPLOYER_STATUSES
}

/** More explicit alias if you prefer string scopes in new code. */
export function getStatuses(scope /*: StatusScope */ = 'employer') {
  return scope === 'individual' ? INDIVIDUAL_STATUSES : EMPLOYER_STATUSES
}

/** Predicate: is the (normalized) value allowed for the given scope? */
export function isAllowedStatus(value, scopeOrBool) {
  const token = normalizeStatus(value)
  const scope =
    typeof scopeOrBool === 'string'
      ? scopeOrBool
      : scopeOrBool ? 'individual' : 'employer'
  return scope === 'individual' ? INDIVIDUAL_SET.has(token) : EMPLOYER_SET.has(token)
}

/** Scope-specific predicates (nice for guards / TS inference in JSdoc). */
export const isEmployerStatus   = (v) => EMPLOYER_SET.has(normalizeStatus(v))
export const isIndividualStatus = (v) => INDIVIDUAL_SET.has(normalizeStatus(v))

/** Export aliases in case you want to display friendly synonyms in UIs. */
export { ALIASES as STATUS_ALIASES }