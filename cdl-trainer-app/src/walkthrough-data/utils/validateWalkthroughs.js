// src/walkthrough-data/utils/validateWalkthroughs.js
// ============================================================================
// Walkthrough validator (dev utility, zero deps)
//
// - Validates the structure used by loaders and Student UI.
// - Can validate a single walkthrough array or a map of many.
// - Tolerates optional fields used by overlays/parsers (tags, hidden, etc).
// - Extras: options for stricter checks, consistent path messages.
// ============================================================================

/** Dev-mode guard for gentle console warnings */
const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta?.env?.DEV === true

/**
 * @typedef {Object} ValidateOptions
 * @property {boolean} [allowEmpty=false]              Allow an empty walkthrough array without flagging an error
 * @property {boolean} [requireSectionSteps=true]      Each section must have a steps array
 * @property {boolean} [requireStepScript=true]        Each step must have a non-empty string `script`
 * @property {boolean} [requireLabel=false]            If true, every step must include a `label` (or `stepLabel`)
 * @property {boolean} [trimStrings=true]              Trim string fields before validation checks
 * @property {boolean} [warnPassFailNotRequired=true]  Warn if a passFail step is not marked required
 */

/** Default options (non-breaking) */
const DEFAULT_OPTS = Object.freeze(
  /** @type {ValidateOptions} */ ({
    allowEmpty: false,
    requireSectionSteps: true,
    requireStepScript: true,
    requireLabel: false,
    trimStrings: true,
    warnPassFailNotRequired: true,
  })
)

/** Push a message with a normalized path prefix */
function push(problems, path, msg) {
  problems.push(`${path}: ${msg}`)
}

/** Basic helpers */
const isObj = (v) => v !== null && typeof v === 'object'
const isBool = (v) => typeof v === 'boolean'
const isStr  = (v) => typeof v === 'string'

/**
 * Validate a single walkthrough (array of sections).
 * @param {string} name - human label for logs (e.g., "class-a")
 * @param {any} data - the walkthrough content (array of sections)
 * @param {ValidateOptions} [options]
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateWalkthrough(name, data, options) {
  const opts = { ...DEFAULT_OPTS, ...(options || {}) }
  const problems = []

  if (!Array.isArray(data)) {
    problems.push(`"${name}" must export an array. Got ${typeof data}.`)
    return { ok: false, problems }
  }

  if (!opts.allowEmpty && data.length === 0) {
    // treat as error for clarity; switch to warn only if you prefer
    push(problems, name, 'walkthrough has no sections (empty array).')
  } else if (IS_DEV && problems.length === 0 && data.length === 0) {
    // optional dev nudge if empty is allowed
    console.warn(`[validateWalkthrough] "${name}" is an empty walkthrough array.`)
  }

  // Detect duplicate section names (often accidental)
  const sectionNames = new Set()

  data.forEach((section, sIdx) => {
    const path = `${name}[${sIdx}]`

    if (!isObj(section)) {
      push(problems, path, 'section must be an object.')
      return
    }

    // section.section (name)
    let sectionKey = section.section
    if (opts.trimStrings && isStr(sectionKey)) sectionKey = sectionKey.trim()

    if (!isStr(sectionKey) || sectionKey.length === 0) {
      push(problems, path, 'section.section must be a non-empty string.')
    } else {
      if (sectionNames.has(sectionKey)) {
        push(problems, path, `section "${sectionKey}" is duplicated within "${name}".`)
      } else {
        sectionNames.add(sectionKey)
      }
    }

    // section flags (optional)
    for (const key of ['critical', 'passFail', 'hidden']) {
      if (key in section && !isBool(section[key])) {
        push(problems, path, `${key} must be boolean when present.`)
      }
    }

    // steps (required unless relaxed)
    if (!Array.isArray(section.steps)) {
      if (opts.requireSectionSteps) {
        push(problems, path, 'steps must be an array.')
      }
      return
    }

    section.steps.forEach((step, stIdx) => {
      const spath = `${path}.steps[${stIdx}]`
      if (!isObj(step)) {
        push(problems, spath, 'step must be an object.')
        return
      }

      // script (required by default)
      let script = step.script
      if (opts.trimStrings && isStr(script)) script = script.trim()
      if (opts.requireStepScript) {
        if (!isStr(script) || script.length === 0) {
          push(problems, spath, 'script is required (non-empty string).')
        }
      } else if (script != null && !isStr(script)) {
        push(problems, spath, 'script must be a string when provided.')
      }

      // Labels (optional; some sources use stepLabel)
      let label = step.label ?? step.stepLabel
      if (opts.trimStrings && isStr(label)) label = label.trim()
      if (opts.requireLabel && (!isStr(label) || label.length === 0)) {
        push(problems, spath, 'label is required (string); stepLabel may be used as an alias.')
      } else {
        if (step.label != null && !isStr(step.label)) {
          push(problems, spath, 'label must be a string when provided.')
        }
        if (step.stepLabel != null && !isStr(step.stepLabel)) {
          push(problems, spath, 'stepLabel must be a string when provided.')
        }
      }

      // Boolean flags
      for (const flag of ['mustSay', 'required', 'skip', 'passFail', 'hidden']) {
        if (flag in step && !isBool(step[flag])) {
          push(problems, spath, `${flag} must be boolean when present.`)
        }
      }

      // Tags
      if ('tags' in step) {
        if (!Array.isArray(step.tags)) {
          push(problems, spath, 'tags must be an array of strings when present.')
        } else {
          for (let i = 0; i < step.tags.length; i++) {
            if (!isStr(step.tags[i])) {
              push(problems, `${spath}.tags[${i}]`, 'tag must be a string.')
            }
          }
        }
      }

      // Nudge: passFail steps should usually be required
      if (opts.warnPassFailNotRequired && step.passFail === true && step.required !== true) {
        push(problems, spath, 'is passFail but not marked required: consider required:true.')
      }
    })
  })

  return { ok: problems.length === 0, problems }
}

/**
 * Validate a single walkthrough by shape only (no name required).
 * @param {any} data
 * @param {ValidateOptions} [options]
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateWalkthroughShape(data, options) {
  return validateWalkthrough('walkthrough', data, options)
}

/**
 * Validate a map of walkthroughs: { "class-a": [...], "class-b": [...] }
 * @param {Record<string, any>} map
 * @param {ValidateOptions} [options]
 * @returns {{ ok: boolean, results: Record<string, {ok:boolean, problems:string[]}> }}
 */
export function validateWalkthroughs(map, options) {
  /** @type {Record<string, {ok:boolean, problems:string[]}>} */
  const results = Object.create(null)
  let allOk = true

  for (const [key, value] of Object.entries(map || {})) {
    const res = validateWalkthrough(key, value, options)
    results[key] = res
    if (!res.ok) allOk = false
  }

  return { ok: allOk, results }
}

/* ------------------------------------------------------------------------- */
/* Back-compat / singular aliases expected by SA screens                     */
/* ------------------------------------------------------------------------- */

/**
 * Validate a single walkthrough (alias).
 * @param {any} doc
 * @param {ValidateOptions} [options]
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateSingle(doc, options) {
  return validateWalkthrough('walkthrough', doc, options)
}

/** Exact alias for validateSingle (older name) */
export const validateSingleWalkthrough = validateSingle

/** Shorthand alias for the batch validator */
export const validate = validateWalkthroughs

// Canonical default (keep existing behavior)
export default validateWalkthrough
