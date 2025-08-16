// =============================================================================
// Markdown → Walkthrough parser (no deps).
//
// Syntax (friendly & forgiving):
// - Section headings:      ## Engine Compartment
// - Optional section flags:## Brakes [critical]   or   ## In-Cab [passfail]
// - Steps as bullets:      - **Label:** Script text here [must] [required] [pf] [skip]
//                          - Script with no label is fine too
// - Optional step tags:    - … [tags: air, brake]   or   - … [tag: safety]
//
// Recognized inline flags (case-insensitive):
//   Step flags:    [must], [required]/[req], [pf]/[passfail], [skip], [tags: a,b], [tag: a]
//   Section flags: [critical], [passfail]/[pf]
//
// Pass meta = { id, label, classCode, version } to normalize result.
// =============================================================================

/** @typedef {import('../schema').WalkthroughScript} WalkthroughScript */

const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV === true

/** Public API */
export function parseMarkdownToWalkthrough(md, meta = {}) {
  const lines = (md || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')

  /** @type {Array<{section:string,critical:boolean,passFail:boolean,steps:any[]}>} */
  const sections = []
  let cur = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // Heading → section
    const h = parseHeading(line)
    if (h) {
      cur = {
        section: h.title || 'Untitled',
        critical: !!h.critical,
        passFail: !!h.passFail,
        steps: [],
      }
      sections.push(cur)
      continue
    }

    // Step bullet under a section
    if (!cur) {
      // create a default section if author forgot a heading
      cur = { section: 'General', critical: false, passFail: false, steps: [] }
      sections.push(cur)
    }

    const step = parseBullet(line)
    if (step) cur.steps.push(step)
  }

  const result = normalizeWalkthrough({ sections }, meta)

  // DEV sanity checks (non-fatal)
  if (IS_DEV) {
    try {
      if (!Array.isArray(result.sections) || result.sections.length === 0) {
        // eslint-disable-next-line no-console
        console.warn('[parseMarkdown] Produced walkthrough has no sections')
      }
    } catch {}
  }

  return result
}

/* -------------------------------------------------------------------------- */
/* Parsers                                                                    */
/* -------------------------------------------------------------------------- */

// Matches [something] tokens; capture inner text.
const FLAG_RE = /\[([^\]]+)\]/gi

function parseHeading(line) {
  // ## Title [critical] [passfail]
  const m = /^(#{2,6})\s+(.+)$/.exec(line)
  if (!m) return null
  const titleWithFlags = m[2].trim()

  const { text, flags } = stripFlags(titleWithFlags)
  const lower = flags.map(f => f.toLowerCase())
  return {
    title: text.trim(),
    critical: lower.includes('critical'),
    passFail: lower.includes('passfail') || lower.includes('pf'),
  }
}

function parseBullet(line) {
  // - **Label:** Script [must] [required] ...
  if (!/^[-*]\s/.test(line)) return null

  let text = line.replace(/^[-*]\s+/, '')

  // Try to extract "**Label:**"
  let label = null
  const boldLabel = /^\*\*(.+?)\*\*\s*:\s*/.exec(text)
  if (boldLabel) {
    label = boldLabel[1].trim()
    text = text.slice(boldLabel[0].length)
  }

  const { text: scriptMaybe, flags } = stripFlags(text)
  const script = scriptMaybe.trim()
  if (!script) return null

  const lower = flags.map(f => f.toLowerCase())

  const step = {
    script,
  }
  if (label) step.label = label
  if (hasFlag(lower, 'must')) step.mustSay = true
  if (hasFlag(lower, 'required') || hasFlag(lower, 'req')) step.required = true
  if (hasFlag(lower, 'passfail') || hasFlag(lower, 'pf')) step.passFail = true
  if (hasFlag(lower, 'skip')) step.skip = true

  // Tags: [tags: a,b] or [tag: a]
  const tags = collectTags(flags)
  if (tags.length) step.tags = tags

  return step
}

function stripFlags(s) {
  /** @type {string[]} */
  const flags = []
  const text = s.replace(FLAG_RE, (_, f) => {
    const inside = String(f || '').trim()
    if (inside) flags.push(inside)
    return ''
  })
  return { text: text.trim(), flags }
}

function hasFlag(flags, name) {
  const n = String(name).toLowerCase()
  return flags.some(f => f === n)
}

function collectTags(flagsRaw) {
  /** @type {string[]} */
  const tags = []
  for (const f of flagsRaw) {
    // Accept "tags: a,b|c" or "tag: a"
    const m = /^tags?\s*:\s*(.+)$/i.exec(f)
    if (m && m[1]) {
      const items = String(m[1])
        .split(/[|,]/g)
        .map(s => s.trim())
        .filter(Boolean)
      tags.push(...items)
    }
  }
  // de-dupe
  return Array.from(new Set(tags))
}

/* -------------------------------------------------------------------------- */
/* Normalizer (shared with CSV util shape)                                    */
/* -------------------------------------------------------------------------- */

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
              const label = String(st.label ?? st.stepLabel ?? '').trim()
              if (label) out.label = label
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

  return deepFreeze({
    id,
    label,
    classCode,
    version,
    sections: cleaned,
  })
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

// Maintain compatibility with callers that import { parseMarkdown } from utils.
export const parseMarkdown = parseMarkdownToWalkthrough

export default parseMarkdownToWalkthrough