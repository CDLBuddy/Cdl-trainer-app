// ======================================================================
// applyOverlays(script, overlays)
// - Pure function: returns a NEW script with overlays applied in order
// - Supported ops:
//     • renameSection
//     • replaceSectionSteps
//     • appendSteps
//     • removeSection | hideSection
//     • removeStep    | hideStep        (by exact stepLabel OR by tag)
//     • replaceStepText                (by exact stepLabel)
// - Section matching: exact by section title (string)
// - Step matching:    exact by stepLabel (string) OR by tag (in step.tags[])
// ======================================================================

/** @typedef {import('../schema').WalkthroughScript} WalkthroughScript */
/** @typedef {import('../schema').WalkthroughOverlay} WalkthroughOverlay */
/** @typedef {import('../schema').OverlayRule} OverlayRule */

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

// ---------- Cloning helpers (defensive, side-effect free) -------------------

function cloneStep(step) {
  return {
    ...step,
    tags: Array.isArray(step?.tags) ? [...step.tags] : undefined,
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

// ---------- Match helpers ---------------------------------------------------

function findSectionIndex(script, sectionName) {
  const name = String(sectionName || '')
  return script.findIndex(s => (s?.section || '') === name)
}

function matchStepIndexByLabel(steps, label) {
  if (!label) return -1
  const target = String(label)
  return steps.findIndex(st => (st?.stepLabel || st?.label || '') === target)
}

function stepHasTag(step, tag) {
  if (!tag) return false
  const tags = Array.isArray(step?.tags) ? step.tags : []
  return tags.includes(tag)
}

// ---------- Single-rule application (always returns a NEW script ref) -------

/**
 * Apply a single overlay rule.
 * @param {WalkthroughScript} script
 * @param {OverlayRule} rule
 * @returns {WalkthroughScript}
 */
function applyRule(script, rule) {
  if (!rule || typeof rule !== 'object') return script

  const out = cloneScript(script)
  const { op = '', match = {} } = rule
  const secIdx = findSectionIndex(out, match.section)

  // Ops without section context
  if (op === 'removeSection' || op === 'hideSection') {
    if (secIdx < 0) return out
    const sec = out[secIdx]
    if (op === 'removeSection') {
      const next = out.slice()
      next.splice(secIdx, 1)
      return next
    }
    // hideSection -> keep but flag it
    out[secIdx] = { ...sec, hidden: true }
    return out
  }

  // Ops requiring a section
  if (secIdx < 0) return out // section not found; skip safely
  const sec = out[secIdx]
  const steps = Array.isArray(sec.steps) ? sec.steps : []

  switch (op) {
    case 'renameSection': {
      out[secIdx] = { ...sec, section: rule.to }
      return out
    }

    case 'replaceSectionSteps': {
      out[secIdx] = { ...sec, steps: normalizeSteps(rule.steps) }
      return out
    }

    case 'appendSteps': {
      const extra = normalizeSteps(rule.steps)
      out[secIdx] = { ...sec, steps: steps.concat(extra) }
      return out
    }

    case 'removeStep': {
      // by exact label OR by tag
      if (match.stepLabel) {
        const idx = matchStepIndexByLabel(steps, match.stepLabel)
        if (idx >= 0) {
          const nextSteps = steps.slice()
          nextSteps.splice(idx, 1)
          out[secIdx] = { ...sec, steps: nextSteps }
        }
      } else if (match.tag) {
        const nextSteps = steps.filter(st => !stepHasTag(st, match.tag))
        out[secIdx] = { ...sec, steps: nextSteps }
      }
      return out
    }

    case 'hideStep': {
      // prefer non-destructive hide flag (renderer can decide)
      let changed = false
      const nextSteps = steps.map(st => {
        if (
          (match.stepLabel && (st.stepLabel === match.stepLabel || st.label === match.stepLabel)) ||
          (match.tag && stepHasTag(st, match.tag))
        ) {
          changed = true
          return { ...st, hidden: true }
        }
        return st
      })
      if (changed) out[secIdx] = { ...sec, steps: nextSteps }
      return out
    }

    case 'replaceStepText': {
      const idx = matchStepIndexByLabel(steps, match.stepLabel)
      if (idx >= 0) {
        const next = steps.slice()
        next[idx] = { ...next[idx], script: rule.to }
        out[secIdx] = { ...sec, steps: next }
      }
      return out
    }

    default: {
      if (IS_DEV) {
        // eslint-disable-next-line no-console
        console.warn('[applyOverlays] Unknown op:', op, 'rule:', rule)
      }
      return out
    }
  }
}

// ---------- Batch application -----------------------------------------------

/**
 * Apply a list of overlays in order (left-to-right).
 * Unknown/malformed rules are skipped safely.
 * @param {WalkthroughScript} baseScript
 * @param {WalkthroughOverlay[]} overlays
 * @returns {{ script: WalkthroughScript, appliedIds: string[] }}
 */
export function applyOverlays(baseScript, overlays = []) {
  if (!Array.isArray(baseScript) || baseScript.length === 0) {
    return { script: [], appliedIds: [] }
  }

  let script = cloneScript(baseScript)
  const appliedIds = []

  for (const ov of overlays) {
    if (!ov || !Array.isArray(ov.rules) || ov.rules.length === 0) continue

    if (IS_DEV && typeof ov.id !== 'string') {
      // eslint-disable-next-line no-console
      console.warn('[applyOverlays] Overlay missing/invalid id:', ov)
    }

    for (const rule of ov.rules) {
      script = applyRule(script, rule)
    }

    if (ov.id) appliedIds.push(ov.id)
  }

  return { script, appliedIds }
}

export default applyOverlays