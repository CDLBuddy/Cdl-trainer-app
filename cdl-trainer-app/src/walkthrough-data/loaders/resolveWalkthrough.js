// ============================================================================
// resolveWalkthrough (v2)
// Centralized utility for fetching + shaping the walkthrough for a CDL class.
//
// What’s new in v2
// - Backward compatible API, PLUS optional `restrictions` overlays
// - Keeps your current school-level *custom replacement* behavior
// - Adds light-weight *overlay* support (school tweaks & restriction patches)
// - Deterministic, idempotent overlay application (base → school → restrictions)
//
// API (all forms supported):
//   resolveWalkthrough(classType, schoolId?)
//   resolveWalkthrough({ classType, schoolId?, preferCustom?, softFail?, restrictions?: string[] })
//
// Returns (same as before):
//   - simple form: WalkthroughScript | null
//   - object form: { script, isCustom?, sourceHint?, applied?: string[] }  // +applied
//
// Notes
// - “Custom replacement” = full script stored at Firestore: schools/{id}/walkthroughs/{token}
// - “School overlay”      = patch rules stored at schools/{id}/walkthroughOverlays/{token}
// - “Restriction overlays”= local code overlays (e.g. E, L/Z, O) mapped below
// - Overlays are tiny objects: { id, rules: OverlayRule[] } (see rule ops below)
// ============================================================================

import { doc, getDoc } from 'firebase/firestore'
import { db } from '@utils/firebase.js'
import { showToast } from '@utils/ui-helpers.js'
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
// ----------------------------------------------------------------------------
// Rule ops supported:
// - renameSection:        { match:{section}, to }
// - replaceSectionSteps:  { match:{section}, steps: Step[] }
// - appendSteps:          { match:{section}, steps: Step[] }
// - removeStep:           { match:{section, stepLabel? , tag?} }
// - replaceStepText:      { match:{section, stepLabel}, to }
//
// Matching is by visible section title (string) and either step label or tag.
// If a step has `tags:[]`, you can target by { tag: 'air-brake' } etc.
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
          // create section if missing
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
// Map restriction tokens -> lazy overlay loader. Overlays are optional.
// If a file is missing, we silently skip it.
const RESTRICTION_OVERLAY_LOADERS = {
  // E: Automatic transmission only — remove clutch callouts, tweak safe start copy
  E: async () => {
    try {
      const mod = await import('../overlays/restrictions/automatic.js')
      return mod.default || null
    } catch { return null }
  },

  // L/Z: No full air brakes — remove air-line/glad-hands + air-brake check; (optionally append hydraulic check)
  LZ: async () => {
    try {
      const mod = await import('../overlays/restrictions/no-air.js')
      return mod.default || null
    } catch { return null }
  },

  // O: No tractor-trailer CMV — swap fifth-wheel coupling with pintle/gooseneck steps
  O: async () => {
    try {
      const mod = await import('../overlays/restrictions/no-fifth-wheel.js')
      return mod.default || null
    } catch { return null }
  },
}

// Deterministic application order so results are stable
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
    // expect { rules: [...] }
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
export async function resolveWalkthrough(arg1, arg2) {
  // Normalize args (back-compat)
  const opts =
    typeof arg1 === 'object' && arg1 !== null
      ? { preferCustom: true, softFail: false, restrictions: [], ...arg1 }
      : { classType: arg1, schoolId: arg2, preferCustom: true, softFail: false, restrictions: [] }

  const { classType, schoolId, preferCustom, softFail, restrictions = [] } = opts

  if (!classType) {
    if (__DEV__) console.warn('[resolveWalkthrough] Missing classType')
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
          if (__DEV__) console.warn(`[resolveWalkthrough] Loaded custom walkthrough for ${token} (school ${schoolId})`)
          // Even if a full custom exists, we still allow *restriction* overlays if desired.
          const restrOverlays = await loadRestrictionOverlays(restrictions)
          const finalScript = restrOverlays.length ? applyOverlays(script, restrOverlays) : script
          const resObj = { script: finalScript, isCustom: true, sourceHint: `school:${schoolId}`, applied: restrOverlays.map(o => o.id) }
          return typeof arg1 === 'object' ? resObj : finalScript
        }
        if (__DEV__) console.warn(`[resolveWalkthrough] Custom walkthrough for ${token} exists but is empty/malformed`)
      } else if (__DEV__) {
        console.warn(`[resolveWalkthrough] No custom walkthrough found for ${token} at school ${schoolId}`)
      }
    } catch (err) {
      if (__DEV__) console.error('[resolveWalkthrough] Error fetching custom walkthrough:', err)
      try { showToast?.('Failed to load custom walkthrough. Using default.', 'warning') } catch {}
      // continue to defaults unless softFail says otherwise
      if (softFail) {
        return typeof arg1 === 'object' ? { script: null, sourceHint: 'custom-error' } : null
      }
    }
  }

  // 2) Base default
  const base =
    getWalkthroughByClass(token)  // accepts code or token; returns script
    || DEFAULT_WALKTHROUGHS[token]
    || null

  if (!base) {
    if (__DEV__) console.error(`[resolveWalkthrough] No walkthrough found for "${token}"`)
    try { showToast?.(`Walkthrough for ${classType} not available.`, 'error') } catch {}
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