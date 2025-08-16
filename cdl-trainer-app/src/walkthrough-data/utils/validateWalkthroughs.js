// ============================================================================
// Walkthrough validator (dev utility, no deps)
// - Validates the structure used by your loaders and student UI.
// - Can validate a single walkthrough array or a map of many.
// - Tolerates optional fields used by overlays/parsers (tags, hidden, etc).
// ============================================================================

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

/**
 * Validate a single walkthrough (array of sections).
 * @param {string} name - human label for logs (e.g., "class-a")
 * @param {any} data - the walkthrough content (array of sections)
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateWalkthrough(name, data) {
  const problems = []

  if (!Array.isArray(data)) {
    problems.push(`"${name}" must export an array. Got ${typeof data}.`)
    return { ok: false, problems }
  }

  // Detect duplicate section names (often accidental)
  const sectionNames = new Set()

  data.forEach((section, sIdx) => {
    const path = `${name}[${sIdx}]`

    if (!section || typeof section !== 'object') {
      problems.push(`${path} must be an object.`)
      return
    }

    // section.section
    if (!section.section || typeof section.section !== 'string') {
      problems.push(`${path}.section must be a non-empty string.`)
    } else {
      const key = section.section
      if (sectionNames.has(key)) {
        problems.push(`${path}.section "${key}" is duplicated within "${name}".`)
      } else {
        sectionNames.add(key)
      }
    }

    // section flags (optional)
    if ('critical' in section && typeof section.critical !== 'boolean') {
      problems.push(`${path}.critical must be boolean when present.`)
    }
    if ('passFail' in section && typeof section.passFail !== 'boolean') {
      problems.push(`${path}.passFail must be boolean when present.`)
    }
    if ('hidden' in section && typeof section.hidden !== 'boolean') {
      problems.push(`${path}.hidden must be boolean when present.`)
    }

    // section.steps
    if (!Array.isArray(section.steps)) {
      problems.push(`${path}.steps must be an array.`)
      return
    }

    section.steps.forEach((step, stIdx) => {
      const spath = `${path}.steps[${stIdx}]`
      if (!step || typeof step !== 'object') {
        problems.push(`${spath} must be an object.`)
        return
      }

      // Required fields
      if (!step.script || typeof step.script !== 'string') {
        problems.push(`${spath}.script is required (string).`)
      }

      // Optional label (some sources use stepLabel)
      if (step.label != null && typeof step.label !== 'string') {
        problems.push(`${spath}.label must be a string when provided.`)
      }
      if (step.stepLabel != null && typeof step.stepLabel !== 'string') {
        problems.push(`${spath}.stepLabel must be a string when provided.`)
      }

      // Boolean flags
      for (const flag of ['mustSay', 'required', 'skip', 'passFail', 'hidden']) {
        if (flag in step && typeof step[flag] !== 'boolean') {
          problems.push(`${spath}.${flag} must be boolean when present.`)
        }
      }

      // Tags
      if ('tags' in step) {
        if (!Array.isArray(step.tags)) {
          problems.push(`${spath}.tags must be an array of strings when present.`)
        } else {
          for (let i = 0; i < step.tags.length; i++) {
            if (typeof step.tags[i] !== 'string') {
              problems.push(`${spath}.tags[${i}] must be a string.`)
            }
          }
        }
      }

      // Nudge: passFail steps should usually be required
      if (step.passFail === true && step.required !== true) {
        problems.push(
          `${spath} is passFail but not marked required: consider required:true.`
        )
      }
    })
  })

  if (IS_DEV && problems.length === 0 && data.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(`[validateWalkthrough] "${name}" is an empty walkthrough array.`)
  }

  return { ok: problems.length === 0, problems }
}

/**
 * Validate a single walkthrough by shape only (no name required).
 * @param {any} data
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateWalkthroughShape(data) {
  return validateWalkthrough('walkthrough', data)
}

/**
 * Validate a map of walkthroughs: { "class-a": [...], "class-b": [...] }
 * @param {Record<string, any>} map
 * @returns {{ ok: boolean, results: Record<string, {ok:boolean, problems:string[]}> }}
 */
export function validateWalkthroughs(map) {
  /** @type {Record<string, {ok:boolean, problems:string[]}>} */
  const results = {}
  let allOk = true

  Object.entries(map || {}).forEach(([key, value]) => {
    const res = validateWalkthrough(key, value)
    results[key] = res
    if (!res.ok) allOk = false
  })

  return { ok: allOk, results }
}

// Back-compat named export some callers may use (alias to shape validator)
export const validateWalkthrough = validateWalkthroughShape