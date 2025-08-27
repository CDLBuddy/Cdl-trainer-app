//src/admin/walkthroughs/shared/services/walkthroughHelpers.js
// Misc helpers used across Manager/List/Upload etc.

import { deepClone } from './wtValidation.js'

/** Slug/token for a class code (A/B/PASSENGER-BUS → class-a/class-b/passenger-bus) */
export function toToken(classCode) {
  const s = String(classCode || '').trim().toUpperCase()
  if (s === 'A' || s === 'CLASS A' || s === 'CLASS-A' || s === 'CLASS_A') return 'class-a'
  if (s === 'B' || s === 'CLASS B' || s === 'CLASS-B' || s === 'CLASS_B') return 'class-b'
  if (s.includes('PASSENGER') || s.includes('BUS') || s === 'P' || s === 'CLASS P') return 'passenger-bus'
  return s.toLowerCase().replace(/\s+/g, '-')
}

/** Human label for common tokens */
export function inferLabelFromToken(token) {
  const t = String(token || '').toLowerCase()
  if (t === 'class-a') return 'Class A'
  if (t === 'class-b') return 'Class B'
  if (t === 'passenger-bus') return 'Passenger Bus'
  return token ? token.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : ''
}

/** ISO timestamp (always UTC) */
export const nowIso = () => new Date().toISOString()

/** Tiny id generator safe for client usage (not cryptographically secure) */
export function nextId(prefix = 'id') {
  const rand = Math.random().toString(36).slice(2, 8)
  const ts = Date.now().toString(36)
  return `${prefix}_${ts}_${rand}`
}

/** Alias for consumers who still import cloneDeep() */
export const cloneDeep = deepClone

/** Safe date parse → Date | null */
export function safeDate(v) {
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(+d) ? null : d
}