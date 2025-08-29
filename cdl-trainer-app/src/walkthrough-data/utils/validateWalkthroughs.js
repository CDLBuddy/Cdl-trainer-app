// Path: src/walkthrough-data/utils/validateWalkthroughs.js
// ============================================================================
// Walkthrough validator (dev utility, zero deps)
// - Validates the structure used by loaders and Student UI.
// - Single or batch validation; tolerant of optional fields (tags, hidden, etc).
// - Deluxe options: duplicate detection, strict key checks, trim/max lengths.
// - Non-breaking: preserves original exports & shapes. Extra fields are additive.
// ============================================================================

/** Dev-mode guard for gentle console warnings */
const IS_DEV =
  typeof import.meta !== 'undefined' && import.meta?.env?.DEV === true

/**
 * @typedef {Object} ValidateOptions
 * @property {boolean} [allowEmpty=false]              Allow an empty walkthrough array without flagging an error
 * @property {boolean} [requireSectionSteps=true]      Each section must have a steps array
 * @property {boolean} [requireStepScript=true]        Each step must have a non-empty string `script`
 * @property {boolean} [requireLabel=false]            If true, every step must include a `label` (or `stepLabel`)
 * @property {boolean} [trimStrings=true]              Trim string fields before validation checks
 * @property {boolean} [warnPassFailNotRequired=true]  Warn if a passFail step is not marked required
 * @property {boolean} [allowDuplicateSections=false]  If true, do not error on duplicate section names
 * @property {boolean} [allowDuplicateStepLabels=true] If false, flags duplicate labels within the same section
 * @property {boolean} [strictKeys=false]              If true, warn on unknown keys at section/step level
 * @property {number}  [maxStringLength=2000]          Soft cap for strings (script/labels/tags); warns if exceeded
 * @property {string}  [pathPrefix=""]                 Optional prefix for all problem paths (e.g., "class-a")
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
    allowDuplicateSections: false,
    allowDuplicateStepLabels: true,
    strictKeys: false,
    maxStringLength: 2000,
    pathPrefix: '',
  })
)

/** Push a message with a normalized path prefix */
function push(problems, path, msg, prefix = '') {
  const p = prefix ? `${prefix}.${path}` : path
  problems.push(`${p}: ${msg}`)
}

/** Basic helpers */
const isObj = v => v !== null && typeof v === 'object'
const isBool = v => typeof v === 'boolean'
const isStr = v => typeof v === 'string'
const clampLen = (s, n) => (s.length > n ? s.slice(0, n) : s)

/** Allowlist for strict key checks (non-breaking; tolerant to common extras) */
const SECTION_KEYS = new Set([
  'section',
  'critical',
  'passFail',
  'hidden',
  'steps',
])
const STEP_KEYS = new Set([
  'label',
  'stepLabel',
  'script',
  'mustSay',
  'required',
  'passFail',
  'skip',
  'hidden',
  'tags',
])

/** Quick stats (optional to read by callers; not required) */
function summarizeWalkthroughSections(data) {
  let sections = 0,
    steps = 0,
    required = 0,
    passFail = 0
  if (Array.isArray(data)) {
    sections = data.length
    for (const s of data) {
      const arr = Array.isArray(s?.steps) ? s.steps : []
      steps += arr.length
      for (const st of arr) {
        if (st?.required) required++
        if (st?.passFail) passFail++
      }
    }
  }
  return { sections, steps, required, passFail }
}

/**
 * Validate a single walkthrough (array of sections).
 * @param {string} name - human label for logs (e.g., "class-a")
 * @param {any} data - the walkthrough content (array of sections)
 * @param {ValidateOptions} [options]
 * @returns {{ ok: boolean, problems: string[], counts?: {sections:number,steps:number,required:number,passFail:number} }}
 */
export function validateWalkthrough(name, data, options) {
  const opts = { ...DEFAULT_OPTS, ...(options || {}) }
  const problems = []
  const prefix = opts.pathPrefix || ''

  if (!Array.isArray(data)) {
    problems.push(`"${name}" must export an array. Got ${typeof data}.`)
    return { ok: false, problems }
  }

  if (!opts.allowEmpty && data.length === 0) {
    push(problems, name, 'walkthrough has no sections (empty array).', prefix)
  } else if (IS_DEV && problems.length === 0 && data.length === 0) {
    console.warn(
      `[validateWalkthrough] "${name}" is an empty walkthrough array.`
    )
  }

  // Detect duplicate section names (often accidental)
  const sectionNames = new Set()

  data.forEach((section, sIdx) => {
    const path = `${name}[${sIdx}]`

    if (!isObj(section)) {
      push(problems, path, 'section must be an object.', prefix)
      return
    }

    // strict key check (non-fatal)
    if (opts.strictKeys) {
      for (const k of Object.keys(section)) {
        if (!SECTION_KEYS.has(k)) {
          push(
            problems,
            path,
            `unknown key "${k}" on section (strictKeys).`,
            prefix
          )
        }
      }
    }

    // section.section (name)
    let sectionKey = section.section
    if (opts.trimStrings && isStr(sectionKey)) sectionKey = sectionKey.trim()

    if (!isStr(sectionKey) || sectionKey.length === 0) {
      push(
        problems,
        path,
        'section.section must be a non-empty string.',
        prefix
      )
    } else {
      if (!opts.allowDuplicateSections) {
        if (sectionNames.has(sectionKey)) {
          push(
            problems,
            path,
            `section "${sectionKey}" is duplicated within "${name}".`,
            prefix
          )
        } else {
          sectionNames.add(sectionKey)
        }
      }
      if (isStr(sectionKey) && sectionKey.length > opts.maxStringLength) {
        push(
          problems,
          path,
          `section name too long (${sectionKey.length} > ${opts.maxStringLength}).`,
          prefix
        )
      }
    }

    // section flags (optional)
    for (const key of ['critical', 'passFail', 'hidden']) {
      if (key in section && !isBool(section[key])) {
        push(problems, path, `${key} must be boolean when present.`, prefix)
      }
    }

    // steps (required unless relaxed)
    if (!Array.isArray(section.steps)) {
      if (opts.requireSectionSteps) {
        push(problems, path, 'steps must be an array.', prefix)
      }
      return
    }

    const seenLabels = new Set()

    section.steps.forEach((step, stIdx) => {
      const spath = `${path}.steps[${stIdx}]`
      if (!isObj(step)) {
        push(problems, spath, 'step must be an object.', prefix)
        return
      }

      // strict key check (non-fatal)
      if (opts.strictKeys) {
        for (const k of Object.keys(step)) {
          if (!STEP_KEYS.has(k)) {
            push(
              problems,
              spath,
              `unknown key "${k}" on step (strictKeys).`,
              prefix
            )
          }
        }
      }

      // script (required by default)
      let script = step.script
      if (opts.trimStrings && isStr(script)) script = script.trim()
      if (opts.requireStepScript) {
        if (!isStr(script) || script.length === 0) {
          push(
            problems,
            spath,
            'script is required (non-empty string).',
            prefix
          )
        }
      } else if (script != null && !isStr(script)) {
        push(problems, spath, 'script must be a string when provided.', prefix)
      }
      if (isStr(script) && script.length > opts.maxStringLength) {
        push(
          problems,
          spath,
          `script too long (${script.length} > ${opts.maxStringLength}).`,
          prefix
        )
      }

      // Labels (optional; some sources use stepLabel)
      let label = step.label ?? step.stepLabel
      if (opts.trimStrings && isStr(label)) label = label.trim()
      if (opts.requireLabel && (!isStr(label) || label.length === 0)) {
        push(
          problems,
          spath,
          'label is required (string); stepLabel may be used as an alias.',
          prefix
        )
      } else {
        if (step.label != null && !isStr(step.label)) {
          push(problems, spath, 'label must be a string when provided.', prefix)
        }
        if (step.stepLabel != null && !isStr(step.stepLabel)) {
          push(
            problems,
            spath,
            'stepLabel must be a string when provided.',
            prefix
          )
        }
      }
      if (isStr(label) && label.length > opts.maxStringLength) {
        push(
          problems,
          spath,
          `label too long (${label.length} > ${opts.maxStringLength}).`,
          prefix
        )
      }

      // Duplicate step labels within a section (optional)
      if (!opts.allowDuplicateStepLabels && isStr(label) && label) {
        const key = label.toLowerCase()
        if (seenLabels.has(key)) {
          push(
            problems,
            spath,
            `duplicate step label "${label}" within section "${sectionKey || '(unnamed)'}".`,
            prefix
          )
        } else {
          seenLabels.add(key)
        }
      }

      // Boolean flags
      for (const flag of [
        'mustSay',
        'required',
        'skip',
        'passFail',
        'hidden',
      ]) {
        if (flag in step && !isBool(step[flag])) {
          push(problems, spath, `${flag} must be boolean when present.`, prefix)
        }
      }

      // Tags
      if ('tags' in step) {
        if (!Array.isArray(step.tags)) {
          push(
            problems,
            spath,
            'tags must be an array of strings when present.',
            prefix
          )
        } else {
          for (let i = 0; i < step.tags.length; i++) {
            const tpath = `${spath}.tags[${i}]`
            const raw = step.tags[i]
            if (!isStr(raw)) {
              push(problems, tpath, 'tag must be a string.', prefix)
            } else {
              const tag = opts.trimStrings ? raw.trim() : raw
              if (tag.length === 0) {
                push(problems, tpath, 'tag cannot be empty.', prefix)
              } else if (tag.length > opts.maxStringLength) {
                push(
                  problems,
                  tpath,
                  `tag too long (${tag.length} > ${opts.maxStringLength}).`,
                  prefix
                )
              }
            }
          }
        }
      }

      // Nudge: passFail steps should usually be required
      if (
        opts.warnPassFailNotRequired &&
        step.passFail === true &&
        step.required !== true
      ) {
        push(
          problems,
          spath,
          'is passFail but not marked required: consider required:true.',
          prefix
        )
      }
    })
  })

  const counts = summarizeWalkthroughSections(data)
  return { ok: problems.length === 0, problems, counts }
}

/**
 * Validate a single walkthrough by shape only (no name required).
 * @param {any} data
 * @param {ValidateOptions} [options]
 * @returns {{ ok: boolean, problems: string[], counts?: {sections:number,steps:number,required:number,passFail:number} }}
 */
export function validateWalkthroughShape(data, options) {
  return validateWalkthrough('walkthrough', data, options)
}

/**
 * Validate a map of walkthroughs: { "class-a": [...], "class-b": [...] }
 * @param {Record<string, any>} map
 * @param {ValidateOptions} [options]
 * @returns {{ ok: boolean, results: Record<string, {ok:boolean, problems:string[], counts?:{sections:number,steps:number,required:number,passFail:number}}>} }
 */
export function validateWalkthroughs(map, options) {
  /** @type {Record<string, {ok:boolean, problems:string[], counts?:any}>} */
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
/* Nice-to-haves (optional helpers; non-breaking)                            */
/* ------------------------------------------------------------------------- */

/** Summarize a walkthrough’s counts (sections/steps/required/passFail) */
export function summarizeWalkthrough(data) {
  return summarizeWalkthroughSections(data)
}

/** Join problems into a single string (useful for throwing/logging) */
export function formatProblems(problems = [], sep = '\n') {
  return String(problems?.join?.(sep) ?? '')
}

/** Throw an Error if validation fails (keeps problems in .problems) */
export function assertValidOrThrow(name, data, options) {
  const res = validateWalkthrough(name, data, options)
  if (!res.ok) {
    const err = new Error(
      `Invalid walkthrough "${name}":\n${formatProblems(res.problems)}`
    )
    // @ts-ignore attach diagnostics without typing burden
    err.problems = res.problems
    throw err
  }
  return res
}

/* ------------------------------------------------------------------------- */
/* Back-compat / singular aliases expected by SA screens                     */
/* ------------------------------------------------------------------------- */

/**
 * Validate a single walkthrough (alias).
 * @param {any} doc
 * @param {ValidateOptions} [options]
 * @returns {{ ok: boolean, problems: string[], counts?: {sections:number,steps:number,required:number,passFail:number} }}
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
