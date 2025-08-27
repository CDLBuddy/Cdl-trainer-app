// src/student/profile/services/index.js
// -----------------------------------------------------------------------------
// Student Profile • Services Barrel (tree-shakeable + admin-compatible)
// - Re-exports the pure API (reads/writes & normalizers)
// - Adds tiny helpers that *prefer the canonical cert builder*
// - Provides back-compat aliases (names mirror Admin services where useful)
// - Safe to import anywhere; no side effects
// -----------------------------------------------------------------------------

import * as api from './profileApi.js'

// ---- Primary exports (tree-shakeable) --------------------------------------
export * from './profileApi.js'
export { default as profileApi } from './profileApi.js'

/**
 * Build a canonical TPR completion payload for a student.
 * - Uses the same canonical builder as Admin (lazy-loaded)
 * - Input comes from getCanonicalCertInput() so UI, Admin, and workers agree
 *
 * @param {string} studentId
 * @returns {Promise<import('@/types/eldt').TPRCompletion>}
 */
export async function buildTPRCompletionForStudent(studentId) {
  const input = await api.getCanonicalCertInput(studentId)
  const { buildTPRCompletion } = await import('@/utils/cert-builder')
  return buildTPRCompletion(input)
}

// ---- Back-compat aliases (mirror Admin service names where helpful) --------
// These keep older call sites happy and make cross-role code reuse simpler.
export const loadProviderProfile = api.getProviderProfile
/**
 * Historical name used in some flows. Returns ELDT progress for the student.
 * @param {string} studentId
 * @param {object} [_opts]
 */
export async function loadStudentTraining(studentId, _opts = {}) {
  return api.getProgress(studentId)
}

// ---- Optional lazy helpers (for code-splitting) ----------------------------
export const lazy = {
  profileApi:  () => import('./profileApi.js'),
  certBuilder: () => import('@/utils/cert-builder'),
}