// ======================================================================
// resolveWalkthrough (v2, polished) — NO REACT HOOKS HERE
// - Resolve a base script (defaults or full custom per school)
// - Optionally apply school overlays + CDL restriction overlays
// - Two call forms (matches schema.d.ts):
//     resolveWalkthrough(classType, schoolId?)
//     resolveWalkthrough({ classType, schoolId?, preferCustom?, softFail?, restrictions?, toast? })
// - Pure, side-effect free; tolerant error handling in dev
// ======================================================================

import { doc, getDoc } from 'firebase/firestore'

import { db } from '@utils/firebase.js'
import {
  DEFAULT_WALKTHROUGHS,
  getWalkthroughByClass,   // UI-friendly token/code helper
} from '@walkthrough-data'
import { applyOverlays } from '@walkthrough-utils'
import { overlaysForRestrictions } from '@walkthrough-overlays'

// ---------- Token normalization (kept in sync with your barrels) ----------
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
  const asCode = s.toUpperCase().replace(/\s+/g, '-').replace(/_/g, '-')
  if (CODE_TO_TOKEN[asCode]) return CODE_TO_TOKEN[asCode]
  return s.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
}

// ---------- Firestore payload coercion (tolerant) ------------------------
function coerceToScript(payload) {
  if (!payload) return null
  if (Array.isArray(payload.sections)) return payload.sections           // preferred
  if (Array.isArray(payload.script))   return payload.script             // alias
  if (Array.isArray(payload.steps))    return [{ section: 'Custom', steps: payload.steps }] // legacy
  return null
}

// ---------- School overlay (patch) ---------------------------------------
async function loadSchoolOverlay(schoolId, token) {
  if (!schoolId) return null
  try {
    const ref = doc(db, 'schools', String(schoolId), 'walkthroughOverlays', token)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    const data = snap.data()
    if (data && Array.isArray(data.rules)) {
      return { id: `school:${schoolId}:${token}`, rules: data.rules }
    }
  } catch {
    // swallow overlay errors; base script will still render
  }
  return null
}

// ---------- Provenance helpers -------------------------------------------
function buildSourceHint({ hasSchoolOverlay, usedRestrictionIds, isCustom }) {
  const parts = [isCustom ? 'custom' : 'defaults']
  if (hasSchoolOverlay) parts.push('school-overlay')
  if (usedRestrictionIds?.length) parts.push('restrictions')
  return parts.join('+')
}

// ======================================================================
// Main resolver
// ======================================================================

/**
 * @param {string|{
 *   classType: string,
 *   schoolId?: string | null,
 *   preferCustom?: boolean,
 *   softFail?: boolean,
 *   restrictions?: Array<'E'|'L'|'Z'|'O'|string>,
 *   toast?: (msg: string, type?: 'info'|'success'|'error'|'warning') => void
 * }} arg1
 * @param {string=} arg2
 * @returns {Promise<any>}  // simple form: WalkthroughScript|null
 *                          // object form: { script, isCustom?, sourceHint?, applied? }
 */
export async function resolveWalkthrough(arg1, arg2) {
  // Normalize args (support both forms)
  const opts =
    typeof arg1 === 'object' && arg1 !== null
      ? { preferCustom: true, softFail: false, restrictions: [], ...arg1 }
      : { classType: arg1, schoolId: arg2, preferCustom: true, softFail: false, restrictions: [] }

  const {
    classType,
    schoolId = null,
    preferCustom = true,
    softFail = false,
    restrictions = [],
    toast,
  } = opts

  if (!classType) {
    if (import.meta.env.DEV) console.warn('[resolveWalkthrough] Missing classType')
    return typeof arg1 === 'object' ? { script: null, sourceHint: 'error' } : null
  }

  const token = toToken(classType)

  // 1) Try FULL custom replacement first (if permitted)
  if (preferCustom && schoolId) {
    try {
      const ref = doc(db, 'schools', String(schoolId), 'walkthroughs', token)
      const snap = await getDoc(ref)

      if (snap.exists()) {
        const customScript = coerceToScript(snap.data())
        if (customScript && customScript.length) {
          // Apply restriction overlays on top of custom (school-owned) script
          const restrictionOverlays = overlaysForRestrictions(restrictions || [])
          const appliedIds = restrictionOverlays.map(o => o.id).filter(Boolean)
          const finalScript = restrictionOverlays.length
            ? applyOverlays(customScript, restrictionOverlays)
            : customScript

          const result = {
            script: finalScript,
            isCustom: true,
            sourceHint: buildSourceHint({ isCustom: true, usedRestrictionIds: appliedIds }),
            applied: appliedIds,
          }
          return typeof arg1 === 'object' ? result : finalScript
        }
        if (import.meta.env.DEV) {
          console.warn(`[resolveWalkthrough] Custom walkthrough for ${token} exists but is empty/malformed`)
        }
      } else if (import.meta.env.DEV) {
        console.warn(`[resolveWalkthrough] No custom walkthrough found for ${token} at school ${schoolId}`)
      }
    } catch (e) {
      try { toast?.('Failed to load custom walkthrough. Using default.', 'warning') } catch {}
      if (!softFail) throw e
      // fall through to defaults
    }
  }

  // 2) Base default (token-aware helper first; falls back to map)
  const base =
    getWalkthroughByClass?.(token) ||
    DEFAULT_WALKTHROUGHS?.[token] ||
    null

  if (!base) {
    try { toast?.(`Walkthrough for ${classType} not available.`, 'error') } catch {}
    return typeof arg1 === 'object' ? { script: null, sourceHint: 'not-found' } : null
  }

  // 3) School overlay (patch) + restriction overlays (patch)
  const overlays = []
  const schoolOv = await loadSchoolOverlay(schoolId, token)
  if (schoolOv) overlays.push(schoolOv)

  const restrictionOverlays = overlaysForRestrictions(restrictions || [])
  overlays.push(...restrictionOverlays)

  const finalScript = overlays.length ? applyOverlays(base, overlays) : base

  const appliedIds = overlays.map(o => o.id).filter(Boolean)
  const result = {
    script: finalScript,
    isCustom: false,
    sourceHint: buildSourceHint({
      isCustom: false,
      hasSchoolOverlay: !!schoolOv,
      usedRestrictionIds: appliedIds.filter(id => id?.startsWith?.('restriction:')),
    }),
    applied: appliedIds,
  }

  return typeof arg1 === 'object' ? result : finalScript
}

export default resolveWalkthrough