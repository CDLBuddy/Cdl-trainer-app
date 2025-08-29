//src/admin/walkthroughs/shared/wtValidation.js

// Walkthrough validation & normalization utils (shared)
/**
 * @typedef {{ label?: string, script: string, mustSay?: boolean, required?: boolean, passFail?: boolean, skip?: boolean, tags?: string[] }} WalkthroughStep
 * @typedef {{ section: string, critical?: boolean, passFail?: boolean, steps: WalkthroughStep[] }} WalkthroughSection
 */

export const deepClone = v =>
  typeof structuredClone === 'function'
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v))

/** Normalize any “maybe” value into a valid WalkthroughSection[] */
export function ensureScriptShape(maybe) {
  const arr = Array.isArray(maybe) ? maybe : []
  if (!arr.length) return [{ section: 'Untitled', steps: [{ script: '' }] }]

  return arr.map((sec, si) => ({
    section: String(sec?.section ?? `Section ${si + 1}`),
    critical: !!sec?.critical,
    passFail: !!sec?.passFail,
    steps:
      Array.isArray(sec?.steps) && sec.steps.length
        ? sec.steps
            .map(st => {
              const script = String(st?.script ?? '').trim()
              if (!script) return null
              return {
                label: st?.label ? String(st.label) : undefined,
                script,
                mustSay: !!st?.mustSay,
                required: !!st?.required,
                passFail: !!st?.passFail,
                skip: !!st?.skip,
                tags: Array.isArray(st?.tags) ? st.tags.map(String) : undefined,
              }
            })
            .filter(Boolean)
        : [{ script: '' }],
  }))
}

/** Validate a WalkthroughSection[] for common authoring mistakes */
export function validateScript(script) {
  const problems = []
  if (!Array.isArray(script) || !script.length) {
    problems.push('Add at least one section.')
    return { ok: false, problems }
  }
  script.forEach((sec, si) => {
    if (!sec?.section?.trim()) problems.push(`Section ${si + 1} needs a title.`)
    if (!Array.isArray(sec?.steps) || !sec.steps.length) {
      problems.push(`Section "${sec?.section || si + 1}" must include steps.`)
      return
    }
    sec.steps.forEach((st, ti) => {
      if (!st?.script?.trim())
        problems.push(`Step ${ti + 1} in "${sec.section}" needs script text.`)
      if (st?.passFail && st?.required !== true) {
        problems.push(
          `Step ${ti + 1} in "${sec.section}" is pass/fail – mark it "required".`
        )
      }
    })
  })
  return { ok: problems.length === 0, problems }
}

/** Handful of cheap stats for headers/summary chips */
export function countScript(script) {
  let sections = 0,
    steps = 0,
    required = 0,
    passFail = 0
  if (Array.isArray(script)) {
    sections = script.length
    for (const sec of script) {
      const arr = Array.isArray(sec?.steps) ? sec.steps : []
      steps += arr.length
      for (const st of arr) {
        if (st?.required) required++
        if (st?.passFail) passFail++
      }
    }
  }
  return { sections, steps, required, passFail }
}
