// Path: src/walkthrough-data/loaders/resolveWalkthrough.js
// ======================================================================
// resolveWalkthrough (v2.1 polished) — PURE FUNCTION (no React hooks)
// - Resolves a walkthrough script by classType (+ optional school custom)
// - Applies school overlays and CDL restriction overlays (non-destructive)
// - Two call forms:
//     resolveWalkthrough(classType, schoolId?)
//     resolveWalkthrough({ classType, schoolId?, preferCustom?, softFail?, restrictions?, toast? })
// - SSR-safe, idempotent fetches, tolerant parsing + clear dev diagnostics
// ======================================================================

import { doc, getDoc } from 'firebase/firestore'
import { db } from '@utils/firebase.js'

import {
  DEFAULT_WALKTHROUGHS,
  getWalkthroughByClass, // token/code helper
} from '@walkthrough-data'

import { applyOverlays } from '@walkthrough-utils'
import { overlaysForRestrictions } from '@walkthrough-overlays'

// ---------- Small helpers ---------------------------------------------------

/** DEV flag without crashing in non-Vite envs */
const __DEV__ = !!(typeof import !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV)

/** Best-effort toast (never throws) */
function safeToast(fn, msg, type = 'info') {
  try { fn?.(msg, type) } catch { /* noop */ }
}

/** Map various inputs → canonical token used in data barrels */
const CODE_TO_TOKEN = {
  A: 'class-a',
  'A-WO-AIR-ELEC': 'class-a-wo-air-elec',
  'A-WO-HYD-ELEC': 'class-a-wo-hyd-elec',
  B: 'class-b',
  'PASSENGER-BUS': 'passenger-bus',
}
function toToken(input) {
  if (input == null) return ''
  const s = String(input).trim()
  const code = s.toUpperCase().replace(/\s+/g, '-').replace(/_/g, '-')
  if (CODE_TO_TOKEN[code]) return CODE_TO_TOKEN[code]
  // generic slug
  return s.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
}

/** Coerce heterogeneous Firestore payloads into a sections[] script */
function coerceToScript(payload) {
  if (!payload) return null
  if (Array.isArray(payload.sections)) return payload.sections
  if (Array.isArray(payload.script))   return payload.script
  if (Array.isArray(payload.steps))    return [{ section: 'Custom', steps: payload.steps }]
  return null
}

/** Normalize & dedupe restriction codes (E/L/Z/O/… → string[]) */
function normalizeRestrictions(list) {
  if (!Array.isArray(list) || list.length === 0) return []
  const out = []
  const seen = new Set()
  for (const v of list) {
    const s = String(v ?? '').trim().toUpperCase()
    if (!s) continue
    if (!seen.has(s)) { seen.add(s); out.push(s) }
  }
  return out
}

/** Provenance / meta string for quick UIs */
function buildSourceHint({ isCustom, hasSchoolOverlay, usedRestrictionIds }) {
  const parts = [isCustom ? 'custom' : 'defaults']
  if (hasSchoolOverlay) parts.push('school-overlay')
  if (usedRestrictionIds?.length) parts.push('restrictions')
  return parts.join('+')
}

// ---------- Memoized Firestore fetches (no duplicate requests) --------------

/** @type {Map<string, Promise<any|null>>} */
const _customCache = new Map()
/** @type {Map<string, Promise<any|null>>} */
const _overlayCache = new Map()

async function loadCustomScript(schoolId, token) {
  if (!db || !schoolId || !token) return null
  const key = `${schoolId}::${token}`
  if (_customCache.has(key)) return _customCache.get(key)

  const p = (async () => {
    try {
      const ref = doc(db, 'schools', String(schoolId), 'walkthroughs', token)
      const snap = await getDoc(ref)
      if (!snap.exists()) return null
      return coerceToScript(snap.data()) || null
    } catch (e) {
      if (__DEV__) console.warn('[resolveWalkthrough] custom fetch failed:', e)
      return null
    }
  })()

  _customCache.set(key, p)
  return p
}

async function loadSchoolOverlay(schoolId, token) {
  if (!db || !schoolId || !token) return null
  const key = `${schoolId}::ov::${token}`
  if (_overlayCache.has(key)) return _overlayCache.get(key)

  const p = (async () => {
    try {
      const ref = doc(db, 'schools', String(schoolId), 'walkthroughOverlays', token)
      const snap = await getDoc(ref)
      if (!snap.exists()) return null
      const data = snap.data()
      if (data && Array.isArray(data.rules)) {
        return { id: `school:${schoolId}:${token}`, rules: data.rules }
      }
    } catch (e) {
      if (__DEV__) console.warn('[resolveWalkthrough] school overlay fetch failed:', e)
    }
    return null
  })()

  _overlayCache.set(key, p)
  return p
}

// ======================================================================
// Main resolver
// ======================================================================

/**
 * Resolve a walkthrough script for a given class / school.
 *
 * @param {string|{
 *   classType: string,
 *   schoolId?: string | null,
 *   preferCustom?: boolean,
 *   softFail?: boolean,
 *   restrictions?: Array<'E'|'L'|'Z'|'O'|string>,
 *   toast?: (msg: string, type?: 'info'|'success'|'error'|'warning') => void
 * }} arg1
 * @param {string=} arg2
 * @returns {Promise<any>} // simple form → WalkthroughScript|null
 *                        // object form → { script, isCustom, sourceHint, applied }
 */
export async function resolveWalkthrough(arg1, arg2) {
  // Normalize args (support both call forms)
  const opts =
    typeof arg1 === 'object' && arg1 !== null
      ? { preferCustom: true, softFail: false, restrictions: [], ...arg1 }
      : { classType: arg1, schoolId: arg2, preferCustom: true, softFail: false, restrictions: [] }

  const {
    classType,
    schoolId = null,
    preferCustom = true,
    softFail = false,
    toast,
  } = opts

  const restrictions = normalizeRestrictions(opts.restrictions)

  if (!classType) {
    if (__DEV__) console.warn('[resolveWalkthrough] Missing classType')
    return typeof arg1 === 'object' ? { script: null, sourceHint: 'error' } : null
  }

  const token = toToken(classType)

  // 1) Full school custom script
  if (preferCustom && schoolId) {
    try {
      const customScript = await loadCustomScript(schoolId, token)
      if (Array.isArray(customScript) && customScript.length) {
        const restrictionOverlays = restrictions.length ? overlaysForRestrictions(restrictions) : []
        const appliedIds = restrictionOverlays.map(o => o?.id).filter(Boolean)
        const finalScript = restrictionOverlays.length
          ? applyOverlays(customScript, restrictionOverlays)
          : customScript

        const meta = {
          script: finalScript,
          isCustom: true,
          sourceHint: buildSourceHint({ isCustom: true, usedRestrictionIds: appliedIds }),
          applied: appliedIds,
        }
        return typeof arg1 === 'object' ? meta : finalScript
      }
      if (__DEV__) console.warn(`[resolveWalkthrough] No usable custom script for "${token}" at school "${schoolId}"`)
    } catch (e) {
      safeToast(toast, 'Failed to load custom walkthrough. Using default.', 'warning')
      if (!softFail) throw e
      // else fall through to defaults
    }
  }

  // 2) Defaults (via helper first; fallback to map)
  const base = (getWalkthroughByClass?.(token) || DEFAULT_WALKTHROUGHS?.[token] || null)
  if (!base) {
    safeToast(toast, `Walkthrough for ${classType} not available.`, 'error')
    return typeof arg1 === 'object' ? { script: null, sourceHint: 'not-found' } : null
  }

  // 3) School overlay + restrictions
  const overlays = []
  const schoolOv = await loadSchoolOverlay(schoolId, token)
  if (schoolOv) overlays.push(schoolOv)

  if (restrictions.length) overlays.push(...overlaysForRestrictions(restrictions))

  const finalScript = overlays.length ? applyOverlays(base, overlays) : base
  const appliedIds  = overlays.map(o => o?.id).filter(Boolean)

  const meta = {
    script: finalScript,
    isCustom: false,
    sourceHint: buildSourceHint({
      isCustom: false,
      hasSchoolOverlay: !!schoolOv,
      usedRestrictionIds: appliedIds.filter(id => String(id).startsWith('restriction:')),
    }),
    applied: appliedIds,
  }

  return typeof arg1 === 'object' ? meta : finalScript
}

export default resolveWalkthrough