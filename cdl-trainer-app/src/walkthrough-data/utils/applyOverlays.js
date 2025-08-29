// Path: src/walkthrough-data/utils/applyOverlays.js
// ======================================================================
// applyOverlays(script, overlays)
// - Pure, side-effect free; returns a NEW script
// - Supported ops:
//     • renameSection
//     • replaceSectionSteps
//     • appendSteps
//     • removeSection | hideSection
//     • removeStep    | hideStep        (by exact stepLabel OR by tag)
//     • replaceStepText                (by exact stepLabel)
// - Section match: exact by section title (string)
// - Step match:    exact by stepLabel (label/stepLabel) OR tag in step.tags[]
// - Exports:
//     • applyOverlays(script, overlays)               -> WalkthroughScript
//     • applyOverlaysWithMeta(script, overlays)       -> { script, appliedIds }
// ======================================================================

/** @typedef {import('../schema').WalkthroughScript} WalkthroughScript */
/** @typedef {import('../schema').WalkthroughOverlay} WalkthroughOverlay */
/** @typedef {import('../schema').OverlayRule} OverlayRule */

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

// ---------- Cloning helpers (defensive) ---------------------------------

function cloneStep(step) {
  return {
    ...step,
    // Keep common flags; copy tags defensively
    tags: Array.isArray(step?.tags) ? [...step.tags] : (typeof step?.tags === 'string' ? [step.tags] : undefined),
  }
}

function cloneSection(section) {
  return {
    ...section,
    steps: Array.isArray(section?.steps) ? section.steps.map(cloneStep) : [],
  }
}

function cloneScript(script) {
  return Array.isArray(script) ? script.map(cloneSection) : []
}

function normalizeSteps(steps) {
  return Array.isArray(steps) ? steps.map(cloneStep) : []
}

// ---------- Match helpers ------------------------------------------------

function findSectionIndex(script, sectionName) {
  const name = String(sectionName ?? '')
  return script.findIndex(s => (s?.section || '') === name)
}

function getStepLabelLike(st) {
  return st?.stepLabel ?? st?.label ?? ''
}

function matchStepIndexByLabel(steps, label) {
  if (!label) return -1
  const target = String(label)
  return steps.findIndex(st => getStepLabelLike(st) === target)
}

function stepHasTag(step, tag) {
  if (!tag) return false
  const t = String(tag)
  const tags = Array.isArray(step?.tags) ? step.tags : []
  return tags.includes(t)
}

// ---------- Single-rule application (returns NEW script ref) --------------

/**
 * @param {WalkthroughScript} script
 * @param {OverlayRule} rule
 * @returns {WalkthroughScript}
 */
function applyRule(script, rule) {
  if (!rule || typeof rule !== 'object') return script

  const out = cloneScript(script)
  const { op = '', match = {} } = rule
  const secIdx = findSectionIndex(out, match.section)

  // Section-level ops that can act without a valid section index
  if (op === 'removeSection' || op === 'hideSection') {
    if (secIdx < 0) return out
    const sec = out[secIdx]
    if (op === 'removeSection') {
      const next = out.slice()
      next.splice(secIdx, 1)
      return next
    }
    out[secIdx] = { ...sec, hidden: true }
    return out
  }

  // Ops that require a found section
  if (secIdx < 0) return out
  const sec = out[secIdx]
  const steps = Array.isArray(sec.steps) ? sec.steps : []

  switch (op) {
    case 'renameSection': {
      out[secIdx] = { ...sec, section: String(rule.to ?? sec.section) }
      return out
    }

    case 'replaceSectionSteps': {
      out[secIdx] = { ...sec, steps: normalizeSteps(rule.steps) }
      return out
    }

    case 'appendSteps': {
      const extra = normalizeSteps(rule.steps)
      if (extra.length === 0) return out
      out[secIdx] = { ...sec, steps: steps.concat(extra) }
      return out
    }

    case 'removeStep': {
      if (match.stepLabel) {
        const idx = matchStepIndexByLabel(steps, match.stepLabel)
        if (idx >= 0) {
          const nextSteps = steps.slice()
          nextSteps.splice(idx, 1)
          out[secIdx] = { ...sec, steps: nextSteps }
        }
      } else if (match.tag) {
        const nextSteps = steps.filter(st => !stepHasTag(st, match.tag))
        if (nextSteps.length !== steps.length) {
          out[secIdx] = { ...sec, steps: nextSteps }
        }
      }
      return out
    }

    case 'hideStep': {
      let changed = false
      const nextSteps = steps.map(st => {
        const byLabel = match.stepLabel && getStepLabelLike(st) === match.stepLabel
        const byTag   = match.tag && stepHasTag(st, match.tag)
        if (byLabel || byTag) { changed = true; return { ...st, hidden: true } }
        return st
      })
      if (changed) out[secIdx] = { ...sec, steps: nextSteps }
      return out
    }

    case 'replaceStepText': {
      const idx = matchStepIndexByLabel(steps, match.stepLabel)
      if (idx >= 0) {
        const next = steps.slice()
        next[idx] = { ...next[idx], script: String(rule.to ?? next[idx].script ?? '') }
        out[secIdx] = { ...sec, steps: next }
      }
      return out
    }

    default: {
      if (IS_DEV) console.warn('[applyOverlays] Unknown op:', op, 'rule:', rule)
      return out
    }
  }
}

// ---------- Batch application ---------------------------------------------

/**
 * Apply overlays and return script + meta.
 * @param {WalkthroughScript} baseScript
 * @param {WalkthroughOverlay[]} overlays
 * @returns {{ script: WalkthroughScript, appliedIds: string[] }}
 */
export function applyOverlaysWithMeta(baseScript, overlays = []) {
  if (!Array.isArray(baseScript) || baseScript.length === 0) {
    return { script: [], appliedIds: [] }
  }

  let script = cloneScript(baseScript)
  const appliedIds = []

  for (const ov of overlays) {
    if (!ov || !Array.isArray(ov.rules) || ov.rules.length === 0) continue

    if (IS_DEV && typeof ov.id !== 'string') {
      console.warn('[applyOverlays] Overlay missing/invalid id:', ov)
    }

    for (const rule of ov.rules) {
      script = applyRule(script, rule)
    }

    if (ov.id) appliedIds.push(String(ov.id))
  }

  return { script, appliedIds }
}

/**
 * Drop-in: apply overlays and return the **script only**.
 * Matches existing callers (e.g., resolveWalkthrough).
 * @param {WalkthroughScript} baseScript
 * @param {WalkthroughOverlay[]} overlays
 * @returns {WalkthroughScript}
 */
export function applyOverlays(baseScript, overlays = []) {
  return applyOverlaysWithMeta(baseScript, overlays).script
}

export default applyOverlays