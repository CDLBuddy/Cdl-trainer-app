// src/walkthrough-data/utils/parseCsv.js
// =============================================================================
// CSV → Walkthrough parser (no deps).
// Accepts flexible headers, normalizes into the standard walkthrough shape.
//
// Expected columns (case-insensitive, flexible naming):
// - section | part | area
// - stepLabel | label | item
// - script | text
// - mustSay | must | say
// - required | req
// - passFail | pass | pf
// - critical | pass/fail (section-level)
// - skip
//
// Notes
// - Boolean-like values: "true/false", "yes/no", "y/n", "1/0"
// - Rows with empty script are ignored
// - You can repeat the same section name across rows; steps aggregate
// - Section-level flags (critical) can be repeated per row for that section
// - Optional meta passed into normalizeWalkthrough({ id, label, classCode, version })
// =============================================================================

/** Public API */
export function parseCsvToWalkthrough(csvText, meta = {}) {
  const rows = parseCsv(csvText);
  if (!rows.length) return normalizeWalkthrough({ sections: [] }, meta);

  const map = buildHeaderMap(rows[0]);
  const sectionsByName = new Map();

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];

    const sectionName = getStr(cells, map.section);
    const script = getStr(cells, map.script);
    if (!sectionName && !script) continue; // ignore empty line
    if (!script) continue; // must have a script for a step

    const label = getStr(cells, map.stepLabel);
    const mustSay = getBool(cells, map.mustSay);
    const required = getBool(cells, map.required);
    const passFail = getBool(cells, map.passFail);
    const skip = getBool(cells, map.skip);

    const sectionCritical = getBool(cells, map.critical);

    const key = sectionName || 'Untitled';
    let section = sectionsByName.get(key);
    if (!section) {
      section = {
        section: key,
        critical: false,
        passFail: false,
        steps: [],
      };
      sectionsByName.set(key, section);
    }

    // Section flags can be specified on any row for this section
    if (sectionCritical) section.critical = true;
    if (passFail && !section.passFail) section.passFail = true; // allow elevate

    section.steps.push({
      label: label || undefined,
      script,
      mustSay: mustSay || undefined,
      required: required || undefined,
      passFail: passFail || undefined,
      skip: skip || undefined,
    });
  }

  const sections = Array.from(sectionsByName.values());
  return normalizeWalkthrough({ sections }, meta);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Tiny CSV parser that handles quoted fields and commas inside quotes. */
function parseCsv(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim().length > 0);

  const rows = [];
  for (const line of lines) {
    const cells = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // escaped quote
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}

function buildHeaderMap(headerRow = []) {
  const idx = name => findIndex(headerRow, name);
  return {
    section: anyIndex(headerRow, ['section', 'part', 'area']),
    stepLabel: anyIndex(headerRow, ['steplabel', 'label', 'item', 'title']),
    script: anyIndex(headerRow, ['script', 'text', 'line']),
    mustSay: anyIndex(headerRow, ['mustsay', 'must', 'say']),
    required: anyIndex(headerRow, ['required', 'req']),
    passFail: anyIndex(headerRow, ['passfail', 'pass', 'pf']),
    critical: anyIndex(headerRow, ['critical', 'pass/fail', 'sectioncritical']),
    skip: anyIndex(headerRow, ['skip', 'omit']),
  };

  function anyIndex(row, keys) {
    for (const k of keys) {
      const i = findIndex(row, k);
      if (i !== -1) return i;
    }
    return -1;
  }
  function findIndex(row, key) {
    if (!row) return -1;
    const target = String(key).trim().toLowerCase();
    for (let i = 0; i < row.length; i++) {
      const v = String(row[i] ?? '').trim().toLowerCase();
      if (v === target) return i;
    }
    return -1;
  }
}

function getStr(cells, i) {
  if (i == null || i < 0 || i >= cells.length) return '';
  return String(cells[i] ?? '').trim();
}

function getBool(cells, i) {
  const v = getStr(cells, i).toLowerCase();
  if (!v) return false;
  return v === 'true' || v === 'yes' || v === 'y' || v === '1';
}

/** Normalize to canonical walkthrough shape; adds meta if provided. */
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
              const out = {
                script,
              };
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