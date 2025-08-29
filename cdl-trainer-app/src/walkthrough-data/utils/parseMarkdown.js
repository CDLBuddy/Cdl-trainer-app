// Path: src/walkthrough-data/utils/parseMarkdown.js
// ============================================================================
// Markdown → Walkthrough parser (no deps).
//
// Friendly syntax (for authors):
//  - Section:  ## Engine Compartment [critical] [pf]
//  - Steps:    - **Label:** Script text [must] [required] [pf] [skip] [tags: air, brake]
//              1. Script is fine with no label
//              (indent continuation lines under a bullet to extend its script)
//  - Tag forms: [tags: a,b|c]  or  [tag: a]
//
// Notes:
//  - Case-insensitive flags
//  - Numbered lists (1. …) or bullets (-,*,+) are accepted
//  - Continuation lines are appended to the current bullet until the next bullet
//    (of the same or lesser indent) or a heading appears
//  - Normalizes to canonical walkthrough shape and deep-freezes the result
// ============================================================================

/** @typedef {import('../schema').WalkthroughScript} WalkthroughScript */

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

// Capture [anything] tokens (greedy-safe per bracket)
const FLAG_RE = /\[([^\]\n]+)\]/g

// Bullet detector: -, *, +, or numbered "1."
const BULLET_RE = /^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/
const HEADING_RE = /^(#{2,6})\s+(.+)$/

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------
export function parseMarkdownToWalkthrough(md, meta = {}) {
  const lines = normalizeLines(md)

  /** @type {Array<{section:string,critical:boolean,passFail:boolean,steps:any[]}>} */
  const sections = []
  let curSection = null
  /** @type {null | {label?:string, script:string, mustSay?:boolean, required?:boolean, passFail?:boolean, skip?:boolean, tags?:string[]}} */
  let curStep = null
  let curIndent = 0

  const flushStep = () => {
    if (curSection && curStep && curStep.script.trim()) {
      // Collapse internal whitespace a bit, preserve user newlines sensibly
      curStep.script = curStep.script.replace(/[ \t]+\n/g, '\n').trim()
      curSection.steps.push(curStep)
    }
    curStep = null
  }

  const openDefaultSectionIfNeeded = () => {
    if (!curSection) {
      curSection = {
        section: 'General',
        critical: false,
        passFail: false,
        steps: [],
      }
      sections.push(curSection)
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()

    if (!line) {
      // blank → treat as soft separator inside a multi-line step
      if (curStep) curStep.script += '\n'
      continue
    }

    // --- Heading?
    const h = HEADING_RE.exec(raw)
    if (h) {
      flushStep()
      const full = h[2].trim()
      const { text, flags } = stripFlags(full)
      const lower = flags.map(f => f.toLowerCase())

      curSection = {
        section: text || 'Untitled',
        critical: lower.includes('critical'),
        passFail: lower.includes('passfail') || lower.includes('pf'),
        steps: [],
      }
      sections.push(curSection)
      continue
    }

    // --- Bullet?
    const b = BULLET_RE.exec(raw)
    if (b) {
      // new bullet starts → flush previous step
      flushStep()
      openDefaultSectionIfNeeded()

      curIndent = b[1].length
      const bulletText = b[2]

      // Extract a **Label:** if present
      let work = bulletText
      let label = null
      const boldLabel = /^\*\*(.+?)\*\*\s*:\s*/.exec(work)
      if (boldLabel) {
        label = boldLabel[1].trim()
        work = work.slice(boldLabel[0].length)
      }

      const { text: scriptMaybe, flags } = stripFlags(work)
      const lower = flags.map(f => f.toLowerCase())
      const tags = collectTags(flags)

      /** @type {any} */
      curStep = { script: scriptMaybe.trim() }
      if (label) curStep.label = label
      if (hasFlag(lower, 'must')) curStep.mustSay = true
      if (hasFlag(lower, 'required') || hasFlag(lower, 'req'))
        curStep.required = true
      if (hasFlag(lower, 'passfail') || hasFlag(lower, 'pf'))
        curStep.passFail = true
      if (hasFlag(lower, 'skip')) curStep.skip = true
      if (tags.length) curStep.tags = tags

      // If script started empty but flags existed, keep step open for continuation text
      if (!curStep.script) curStep.script = ''
      continue
    }

    // --- Continuation line?
    if (curStep) {
      // If this physical line looks like a deeper sub-bullet (indented more),
      // treat it as part of the same step’s script.
      curStep.script +=
        (curStep.script ? '\n' : '') +
        raw.slice(Math.min(raw.length, curIndent)).trim()
      continue
    }

    // --- Text without a section/bullet: start default section and add as a step
    openDefaultSectionIfNeeded()
    const { text, flags } = stripFlags(raw)
    if (text) {
      const lower = flags.map(f => f.toLowerCase())
      const tags = collectTags(flags)
      /** @type {any} */
      curStep = { script: text }
      if (hasFlag(lower, 'must')) curStep.mustSay = true
      if (hasFlag(lower, 'required') || hasFlag(lower, 'req'))
        curStep.required = true
      if (hasFlag(lower, 'passfail') || hasFlag(lower, 'pf'))
        curStep.passFail = true
      if (hasFlag(lower, 'skip')) curStep.skip = true
      if (tags.length) curStep.tags = tags
      flushStep()
    }
  }

  // End of document
  flushStep()

  const result = normalizeWalkthrough({ sections }, meta)

  if (IS_DEV) {
    try {
      if (!Array.isArray(result.sections) || result.sections.length === 0) {
        console.warn('[parseMarkdown] Produced walkthrough has no sections')
      }
    } catch {}
  }

  return result
}

// ----------------------------------------------------------------------------
// Parsers / helpers
// ----------------------------------------------------------------------------

function normalizeLines(md) {
  return String(md || '')
    .replace(/^\uFEFF/, '') // BOM
    .replace(/\r\n?/g, '\n')
    .split('\n')
}

/** Remove `[flag]` tokens; return { text, flags[] } */
function stripFlags(s) {
  /** @type {string[]} */
  const flags = []
  const text = String(s || '').replace(FLAG_RE, (_, f) => {
    const inside = String(f || '').trim()
    if (inside) flags.push(inside)
    return ''
  })
  return { text: text.trim(), flags }
}

function hasFlag(flags, name) {
  const n = String(name).toLowerCase()
  return flags.some(f => f.toLowerCase() === n)
}

/** Accepts `[tags: a,b|c]` or `[tag: a]` (case-insensitive). */
function collectTags(flagsRaw) {
  /** @type {string[]} */
  const tags = []
  for (const f of flagsRaw) {
    const m = /^tags?\s*:\s*(.+)$/i.exec(String(f))
    if (!m || !m[1]) continue
    const parts = String(m[1])
      .split(/[|,]/g)
      .map(s => s.trim())
      .filter(Boolean)
    if (parts.length) tags.push(...parts)
  }
  return Array.from(new Set(tags))
}

// ----------------------------------------------------------------------------
// Normalizer (shared shape with CSV util)
// ----------------------------------------------------------------------------
export function normalizeWalkthrough(w = {}, meta = {}) {
  const id = strOrU(meta.id ?? w.id)
  const label = strOrU(meta.label ?? w.label)
  const classCode = strOrU(meta.classCode ?? w.classCode)
  const version = Number(meta.version ?? w.version ?? 1) || 1

  const sections = Array.isArray(w.sections) ? w.sections : []
  const cleaned = sections
    .map(s => {
      const sectionName = String(s.section ?? '').trim() || 'Untitled'
      const critical = !!s.critical
      const passFail = !!s.passFail

      const steps = Array.isArray(s.steps)
        ? s.steps
            .map(st => {
              const script = String(st.script ?? '').trim()
              if (!script) return null
              /** @type {any} */
              const out = { script }
              const lbl = String(st.label ?? st.stepLabel ?? '').trim()
              if (lbl) out.label = lbl
              if (st.mustSay != null) out.mustSay = !!st.mustSay
              if (st.required != null) out.required = !!st.required
              if (st.passFail != null) out.passFail = !!st.passFail
              if (st.skip != null) out.skip = !!st.skip
              const tags = Array.isArray(st.tags)
                ? st.tags.map(t => String(t).trim()).filter(Boolean)
                : []
              if (tags.length) out.tags = tags
              return out
            })
            .filter(Boolean)
        : []

      return { section: sectionName, critical, passFail, steps }
    })
    .filter(s => s.steps.length > 0)

  return deepFreeze({ id, label, classCode, version, sections: cleaned })
}

function strOrU(v) {
  const s = String(v ?? '').trim()
  return s ? s : undefined
}

function deepFreeze(o) {
  if (!o || typeof o !== 'object') return o
  Object.freeze(o)
  for (const k of Object.keys(o)) {
    const v = o[k]
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v)
  }
  return o
}

// Compatibility alias for legacy imports
export const parseMarkdown = parseMarkdownToWalkthrough
export default parseMarkdownToWalkthrough
