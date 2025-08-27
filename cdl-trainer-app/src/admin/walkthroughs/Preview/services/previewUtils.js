//src/admin/walkthroughs/Preview/services/previewUtils.js
export const safeDate = (v) => {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(+d) ? null : d
}

// Lightweight, defensive validator for admin preview
export function validateScript(script) {
  const problems = []
  if (!Array.isArray(script)) return { ok: false, problems: ['Script must be an array of sections.'] }

  script.forEach((sec, si) => {
    if (!sec || typeof sec !== 'object') { problems.push(`Section #${si + 1} must be an object.`); return }
    if (!sec.section || typeof sec.section !== 'string') problems.push(`Section #${si + 1} is missing a title.`)
    if (!Array.isArray(sec.steps)) { problems.push(`Section "${sec.section || `#${si + 1}`}" steps must be an array.`); return }
    if (sec.steps.length === 0) problems.push(`Section "${sec.section || `#${si + 1}`}" has no steps.`)
    sec.steps.forEach((st, ti) => {
      if (!st || typeof st !== 'object') { problems.push(`Section "${sec.section || `#${si + 1}`}" step #${ti + 1} must be an object.`); return }
      if (!st.script || typeof st.script !== 'string') problems.push(`Section "${sec.section || `#${si + 1}`}" step #${ti + 1} must include script text.`)
      ;['mustSay', 'required', 'passFail', 'skip'].forEach((f) => {
        if (st[f] != null && typeof st[f] !== 'boolean') problems.push(`Section "${sec.section || `#${si + 1}`}" step #${ti + 1} flag "${f}" must be boolean.`)
      })
    })
  })
  return { ok: problems.length === 0, problems }
}