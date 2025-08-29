//src/admin/walkthroughs/Upload/services/uploadUtils.js
// Pull resiliently from your utils barrel
import * as WTUtils from '@walkthrough-data/utils'

export const parseMarkdownAny =
  WTUtils.parseMarkdownToWalkthrough ||
  WTUtils.parseMarkdown ||
  (() => {
    throw new Error('parseMarkdown not available from @walkthrough-data/utils')
  })

export const parseCsvAny =
  WTUtils.parseCsvToWalkthrough ||
  WTUtils.parseCsv ||
  (() => {
    throw new Error('parseCsv not available from @walkthrough-data/utils')
  })

export const validateShape =
  WTUtils.validateWalkthroughShape || (() => ({ ok: true, errors: [] }))

export function normalizeClassCode(v) {
  if (!v) return 'A'
  const s = String(v).trim().toUpperCase()
  if (['A', 'CLASS A', 'CLASS-A', 'CLASS_A', 'CLASS-A'].includes(s)) return 'A'
  if (['B', 'CLASS B', 'CLASS-B', 'CLASS_B'].includes(s)) return 'B'
  if (
    s.includes('PASSENGER') ||
    s.includes('BUS') ||
    s === 'P' ||
    s === 'CLASS P' ||
    s === 'PASSENGER-BUS'
  )
    return 'PASSENGER-BUS'
  const token = s.toLowerCase()
  if (token === 'class-a') return 'A'
  if (token === 'class-b') return 'B'
  if (token === 'passenger-bus') return 'PASSENGER-BUS'
  return 'A'
}

export function rowsToSections(rows) {
  if (!Array.isArray(rows)) return []
  const SEC = ['section', 'Section', 'SECTION']
  const LABEL = ['stepLabel', 'label', 'Label']
  const SCRIPT = ['script', 'Script', 'text', 'Text']
  const BOOL = v => {
    if (typeof v === 'boolean') return v
    if (v == null) return false
    const s = String(v).trim().toLowerCase()
    return s === '1' || s === 'true' || s === 'yes' || s === 'y'
  }

  const groups = new Map()
  for (const r of rows) {
    const secName =
      String(r[SEC.find(k => k in r) ?? 'section'] ?? '').trim() || 'Untitled'
    const label = r[LABEL.find(k => k in r) ?? 'stepLabel']
    const script = r[SCRIPT.find(k => k in r) ?? 'script']
    if (!script || !String(script).trim()) continue

    const mustSay = BOOL(r.mustSay ?? r['must say'] ?? r['Must Say'])
    const required = BOOL(r.required)
    const passFail = BOOL(r.passFail ?? r['pass/fail'] ?? r['Pass/Fail'])
    const skip = BOOL(r.skip)

    if (!groups.has(secName)) groups.set(secName, [])
    groups.get(secName).push({
      label: label ? String(label) : undefined,
      script: String(script),
      mustSay,
      required,
      passFail,
      skip,
    })
  }

  return Array.from(groups.entries()).map(([section, steps]) => ({
    section,
    steps,
  }))
}

export function ensureScriptShape(maybe) {
  if (!Array.isArray(maybe)) return []
  return maybe.map(sec => ({
    section: String(sec?.section ?? 'Untitled'),
    critical: !!sec?.critical,
    passFail: !!sec?.passFail,
    steps: Array.isArray(sec?.steps)
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
      : [],
  }))
}

export function validateScript(script) {
  const problems = []
  if (!Array.isArray(script) || script.length === 0)
    problems.push('No sections found.')
  script.forEach((sec, si) => {
    if (!sec?.section) problems.push(`Section ${si + 1} is missing a title.`)
    if (!Array.isArray(sec?.steps) || sec.steps.length === 0) {
      problems.push(`Section "${sec?.section || si + 1}" has no steps.`)
    } else {
      sec.steps.forEach((st, ti) => {
        if (!st?.script?.trim())
          problems.push(
            `Section "${sec?.section}": step ${ti + 1} is missing script text.`
          )
        if (st?.passFail && st?.required !== true) {
          problems.push(
            `Section "${sec?.section}": step ${ti + 1} is pass/fail but not marked required.`
          )
        }
      })
    }
  })
  return { ok: problems.length === 0, problems }
}
