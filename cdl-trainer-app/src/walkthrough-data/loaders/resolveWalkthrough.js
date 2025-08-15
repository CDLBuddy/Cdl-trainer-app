// ============================================================================
// resolveWalkthrough (v2)  —  NO REACT HOOKS HERE
// Centralized utility for fetching + shaping the walkthrough for a CDL class.
// Supports optional toast callback passed in from React.
// ============================================================================

import { doc, getDoc } from 'firebase/firestore'

import { db } from '@utils/firebase.js'

import { DEFAULT_WALKTHROUGHS, getWalkthroughByClass } from '@walkthrough-data'

// ---------- token normalization (kept in sync with your barrels) ------------
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

// ---------- Firestore payload coercion (tolerant) ---------------------------
function coerceToScript(payload) {
  if (!payload) return null
  if (Array.isArray(payload.sections)) return payload.sections           // preferred
  if (Array.isArray(payload.script))   return payload.script             // alias
  if (Array.isArray(payload.steps))    return [{ section: 'Custom', steps: payload.steps }] // legacy
  return null
}

// ============================================================================
// Overlay engine (tiny + safe)
// ============================================================================
function deepClone(obj) {
  try { return structuredClone(obj) } catch { return JSON.parse(JSON.stringify(obj)) }
}

function applyOverlay(baseScript, overlay) {
  if (!overlay || !Array.isArray(overlay.rules) || !Array.isArray(baseScript)) return baseScript
  const out = deepClone(baseScript)

  const findSection = (title) => {
    const idx = out.findIndex(s => String(s?.section || '').trim().toLowerCase() === String(title).trim().toLowerCase())
    return { idx, section: idx >= 0 ? out[idx] : null }
  }

  for (const rule of overlay.rules) {
    try {
      const { match = {} } = rule
      const { section: sectionTitle } = match
      if (!sectionTitle) continue

      const { idx, section } = findSection(sectionTitle)
      if (idx < 0 && rule.op !== 'appendSteps') continue // nothing to do

      switch (rule.op) {
        case 'renameSection': {
          out[idx].section = rule.to || out[idx].section
          break
        }
        case 'replaceSectionSteps': {
          out[idx].steps = Array.isArray(rule.steps) ? rule.steps : []
          break
        }
        case 'appendSteps': {
          if (idx < 0) {
            out.push({ section: sectionTitle, steps: Array.isArray(rule.steps) ? rule.steps : [] })
          } else {
            out[idx].steps = Array.isArray(out[idx].steps) ? out[idx].steps : []
            out[idx].steps.push(...(Array.isArray(rule.steps) ? rule.steps : []))
          }
          break
        }
        case 'removeStep': {
          const { stepLabel, tag } = match
          const steps = Array.isArray(section.steps) ? section.steps : []
          out[idx].steps = steps.filter(st => {
            const sameLabel = stepLabel && String(st?.label || '').toLowerCase() === String(stepLabel).toLowerCase()
            const hasTag = tag && Array.isArray(st?.tags) && st.tags.map(t => String(t).toLowerCase()).includes(String(tag).toLowerCase())
            return !(sameLabel || hasTag)
          })
          break
        }
        case 'replaceStepText': {
          const { stepLabel } = match
          const steps = Array.isArray(section.steps) ? section.steps : []
          out[idx].steps = steps.map(st =>
            stepLabel && String(st?.label || '').toLowerCase() === String(stepLabel).toLowerCase()
              ? { ...st, script: String(rule.to ?? st.script) }
              : st
          )
          break
        }
        default:
          // ignore unknown ops
          break
      }
    } catch {
      // ignore a bad rule; leave script as-is
    }
  }

  return out
}

function applyOverlays(baseScript, overlays = []) {
  return overlays.reduce((acc, ov) => applyOverlay(acc, ov), baseScript)
}

// ---------- Local (code) restriction overlays ------------------------------
const RESTRICTION_OVERLAY_LOADERS = {
  E: async () => {
    try {
      const mod = await import('../overlays/restrictions/automatic.js')
      return mod.default || null
    } catch { return null }
  },
  LZ: async () => {
    try {
      const mod = await import('../overlays/restrictions/no-air.js')
      return mod.default || null
    } catch { return null }
  },
  O: async () => {
    try {
      const mod = await import('../overlays/restrictions/no-fifth-wheel.js')
      return mod.default || null
    } catch { return null }
  },
}

const RESTRICTION_ORDER = ['E', 'LZ', 'O']

async function loadRestrictionOverlays(restrictions = []) {
  const want = RESTRICTION_ORDER.filter(tok => restrictions.includes(tok))
  const loaded = []
  for (const tok of want) {
    const loader = RESTRICTION_OVERLAY_LOADERS[tok]
    if (!loader) continue
    try {
      const ov = await loader()
      if (ov) loaded.push({ id: `restriction:${tok}`, ...ov })
    } catch {
      // ignore missing overlay
    }
  }
  return loaded
}

// ---------- Optional: school overlay (patch, not full replacement) ----------
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
    // swallow overlay errors
  }
  return null
}

// ============================================================================
// Main resolver
// ============================================================================

/**
 * @param {string|{classType:string, schoolId?:string, preferCustom?:boolean, softFail?:boolean, restrictions?:string[], toast?:(msg:string,type?:"info"|"success"|"error"|"warning")=>void}} arg1
 * @param {string=} arg2 schoolId if using positional form
 * @returns {Promise<any>}
 */
export async function resolveWalkthrough(arg1, arg2) {
  // Normalize args (back-compat)
  const opts =
    typeof arg1 === 'object' && arg1 !== null
      ? { preferCustom: true, softFail: false, restrictions: [], ...arg1 }
      : { classType: arg1, schoolId: arg2, preferCustom: true, softFail: false, restrictions: [] }

  const { classType, schoolId, preferCustom, softFail, restrictions = [], toast } = opts

  if (!classType) {
    if (import.meta.env.DEV) console.warn('[resolveWalkthrough] Missing classType')
    return typeof arg1 === 'object' ? { script: null, sourceHint: 'error' } : null
  }

  const token = toToken(classType)

  // 1) Try FULL custom replacement first (existing behavior)
  if (preferCustom && schoolId) {
    try {
      const ref = doc(db, 'schools', String(schoolId), 'walkthroughs', token)
      const snap = await getDoc(ref)

      if (snap.exists()) {
        const script = coerceToScript(snap.data())
        if (script && script.length) {
          if (import.meta.env.DEV) console.warn(`[resolveWalkthrough] Loaded custom walkthrough for ${token} (school ${schoolId})`)
          const restrOverlays = await loadRestrictionOverlays(restrictions)
          const finalScript = restrOverlays.length ? applyOverlays(script, restrOverlays) : script
          const resObj = { script: finalScript, isCustom: true, sourceHint: `school:${schoolId}`, applied: restrOverlays.map(o => o.id) }
          return typeof arg1 === 'object' ? resObj : finalScript
        }
        if (import.meta.env.DEV) console.warn(`[resolveWalkthrough] Custom walkthrough for ${token} exists but is empty/malformed`)
      } else if (import.meta.env.DEV) {
        console.warn(`[resolveWalkthrough] No custom walkthrough found for ${token} at school ${schoolId}`)
      }
    } catch {
      try {
        // Use optional callback provided by caller (React layer)
        toast?.('Failed to load custom walkthrough. Using default.', 'warning')
      } catch (toastErr) {
        if (import.meta.env.DEV) console.warn('[resolveWalkthrough] Failed to show toast for custom walkthrough error', toastErr)
      }
      if (softFail) {
        return typeof arg1 === 'object' ? { script: null, sourceHint: 'custom-error' } : null
      }
    }
  }

  // 2) Base default
  const base = getWalkthroughByClass?.(token) || DEFAULT_WALKTHROUGHS?.[token] || null
  if (!base) {
    try {
      toast?.(`Walkthrough for ${classType} not available.`, 'error')
    } catch (toastErr) {
      if (import.meta.env.DEV) console.warn('[resolveWalkthrough] Failed to show toast for missing walkthrough', toastErr)
    }
    return typeof arg1 === 'object' ? { script: null, sourceHint: 'not-found' } : null
  }

  // 3) School overlay (patch) + Restriction overlays (patch)
  const overlays = []
  const schoolOv = await loadSchoolOverlay(schoolId, token)
  if (schoolOv) overlays.push(schoolOv)

  const restrOverlays = await loadRestrictionOverlays(restrictions)
  overlays.push(...restrOverlays)

  const finalScript = overlays.length ? applyOverlays(base, overlays) : base

  const resObj = {
    script: finalScript,
    isCustom: false,
    sourceHint: schoolOv ? 'defaults+school-overlay' : 'defaults',
    applied: overlays.map(o => o.id),
  }
  return typeof arg1 === 'object' ? resObj : finalScript
}
