// src/walkthrough-data/utils/validateWalkthroughs.js
// ============================================================================
// Walkthrough validator (dev utility, no deps)
// - Validates the structure used by your loaders and student UI.
// - Can validate a single walkthrough object or a map of many.
// ============================================================================

/**
 * Validate a single walkthrough array.
 * @param {string} name - human label for logs (e.g., "class-a")
 * @param {any} data - the walkthrough content (array of sections)
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateWalkthrough(name, data) {
  const problems = [];

  if (!Array.isArray(data)) {
    problems.push(`"${name}" must export an array. Got ${typeof data}.`);
    return { ok: false, problems };
  }

  data.forEach((section, sIdx) => {
    if (!section || typeof section !== 'object') {
      problems.push(`${name}[${sIdx}] must be an object.`);
      return;
    }
    if (!section.section || typeof section.section !== 'string') {
      problems.push(`${name}[${sIdx}].section must be a non-empty string.`);
    }
    if (!Array.isArray(section.steps)) {
      problems.push(`${name}[${sIdx}].steps must be an array.`);
      return;
    }

    section.steps.forEach((step, stIdx) => {
      if (!step || typeof step !== 'object') {
        problems.push(`${name}[${sIdx}].steps[${stIdx}] must be an object.`);
        return;
      }
      // Required fields
      if (!step.script || typeof step.script !== 'string') {
        problems.push(`${name}[${sIdx}].steps[${stIdx}].script is required (string).`);
      }
      // Optional but recommended
      if (step.label != null && typeof step.label !== 'string') {
        problems.push(`${name}[${sIdx}].steps[${stIdx}].label must be a string when provided.`);
      }
      // Flags
      for (const flag of ['mustSay', 'required', 'skip', 'passFail']) {
        if (flag in step && typeof step[flag] !== 'boolean') {
          problems.push(`${name}[${sIdx}].steps[${stIdx}].${flag} must be boolean when present.`);
        }
      }
      // Nudge: passFail steps should usually be required
      if (step.passFail && step.required !== true) {
        problems.push(`${name}[${sIdx}].steps[${stIdx}] is passFail but not marked required: consider required:true.`);
      }
    });
  });

  return { ok: problems.length === 0, problems };
}

/**
 * Validate a map of walkthroughs: { "class-a": [...], "class-b": [...] }
 * @param {Record<string, any>} map
 * @returns {{ ok: boolean, results: Record<string, {ok:boolean, problems:string[]}> }}
 */
export function validateAllWalkthroughs(map) {
  const results = {};
  let allOk = true;

  Object.entries(map || {}).forEach(([key, value]) => {
    const res = validateWalkthrough(key, value);
    results[key] = res;
    if (!res.ok) allOk = false;
  });

  return { ok: allOk, results };
}