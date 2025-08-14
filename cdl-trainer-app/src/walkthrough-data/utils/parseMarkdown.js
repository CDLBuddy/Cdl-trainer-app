// src/walkthrough-data/utils/parseMarkdown.js
// =============================================================================
// Markdown → Walkthrough parser (no deps).
//
// Syntax (friendly & forgiving):
// - Section headings:      ## Engine Compartment
// - Optional section tag:  ## Brakes [critical]   or   ## Brakes [passfail]
// - Steps as bullets:      - **Label:** Script text here [must] [required] [pf] [skip]
//                          - Script with no label is fine too
//
// Recognized inline flags (case-insensitive):
//   [must], [required], [pf] / [passfail], [skip]
// Section-level flags with heading: [critical], [passfail]
//
// Example:
//
// ## Engine Compartment
// - **Oil Level:** Check dipstick is within safe range. [must] [required]
// - Look for puddles or leaks under engine. [must]
//
// ## In-Cab [passfail]
// - **Parking Brake Check:** With parking brake applied... [must] [required] [pf]
//
// Pass meta = { id, label, classCode, version } to normalize result.
// =============================================================================

/** Public API */
export function parseMarkdownToWalkthrough(md, meta = {}) {
  const lines = (md || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const sections = [];
  let cur = null;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Heading → section
    const h = parseHeading(line);
    if (h) {
      cur = {
        section: h.title || 'Untitled',
        critical: !!h.critical,
        passFail: !!h.passFail,
        steps: [],
      };
      sections.push(cur);
      continue;
    }

    // Step bullet under a section
    if (!cur) {
      // create a default section if author forgot a heading
      cur = { section: 'General', critical: false, passFail: false, steps: [] };
      sections.push(cur);
    }

    const step = parseBullet(line);
    if (step) {
      cur.steps.push(step);
    }
  }

  return normalizeWalkthrough({ sections }, meta);
}

/* -------------------------------------------------------------------------- */
/* Parsers                                                                    */
/* -------------------------------------------------------------------------- */

const FLAG_RE = /\[([a-z\/\-]+)\]/gi;

function parseHeading(line) {
  // ## Title [critical] [passfail]
  const m = /^(#{2,6})\s+(.+)$/.exec(line);
  if (!m) return null;
  const titleWithFlags = m[2].trim();

  const { text, flags } = stripFlags(titleWithFlags);
  return {
    title: text.trim(),
    critical: hasFlag(flags, 'critical'),
    passFail: hasFlag(flags, 'passfail') || hasFlag(flags, 'pf'),
  };
}

function parseBullet(line) {
  // - **Label:** Script [must] [required] ...
  if (!/^\-|\*/.test(line[0])) return null;

  let text = line.replace(/^[-*]\s+/, '');

  // Try to extract "**Label:**"
  let label = null;
  const boldLabel = /^\*\*(.+?)\*\*\s*:\s*/.exec(text);
  if (boldLabel) {
    label = boldLabel[1].trim();
    text = text.slice(boldLabel[0].length);
  }

  const { text: script, flags } = stripFlags(text);

  if (!script.trim()) return null;

  return {
    label: label || undefined,
    script: script.trim(),
    mustSay: toBoolFlag(flags, 'must'),
    required: toBoolFlag(flags, 'required') || toBoolFlag(flags, 'req'),
    passFail: toBoolFlag(flags, 'passfail') || toBoolFlag(flags, 'pf'),
    skip: toBoolFlag(flags, 'skip'),
  };
}

function stripFlags(s) {
  const flags = [];
  const text = s.replace(FLAG_RE, (_, f) => {
    flags.push(String(f || '').toLowerCase());
    return '';
  });
  return { text: text.trim(), flags };
}

function hasFlag(flags, name) {
  const n = String(name).toLowerCase();
  return flags.some(f => f === n);
}
function toBoolFlag(flags, name) {
  return hasFlag(flags, name);
}

/* -------------------------------------------------------------------------- */
/* Normalizer (shared with CSV util shape)                                    */
/* -------------------------------------------------------------------------- */

export function normalizeWalkthrough(w = {}, meta = {}) {
  const id = String(meta.id ?? w.id ?? '').trim() || undefined;
  const label = String(meta.label ?? w.label ?? '').trim() || undefined;
  const classCode = String(meta.classCode ?? w.classCode ?? '').trim() || undefined;
  const version = Number(meta.version ?? w.version ?? 1) || 1;

  const sections = Array.isArray(w.sections) ? w.sections : [];
  const cleaned = sections
    .map(s => ({
      section: String(s.section ?? '').trim() || 'Untitled',
      critical: !!s.critical,
      passFail: !!s.passFail,
      steps: Array.isArray(s.steps)
        ? s.steps
            .map(st => {
              const script = String(st.script ?? '').trim();
              if (!script) return null;
              const out = { script };
              if (st.label) out.label = String(st.label).trim();
              if (st.mustSay != null) out.mustSay = !!st.mustSay;
              if (st.required != null) out.required = !!st.required;
              if (st.passFail != null) out.passFail = !!st.passFail;
              if (st.skip != null) out.skip = !!st.skip;
              return out;
            })
            .filter(Boolean)
        : [],
    }))
    .filter(s => s.steps.length > 0);

  return deepFreeze({
    id,
    label,
    classCode,
    version,
    sections: cleaned,
  });
}

function deepFreeze(o) {
  if (!o || typeof o !== 'object') return o;
  Object.freeze(o);
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  }
  return o;
}