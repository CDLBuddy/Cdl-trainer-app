// Path: src/walkthrough-data/overlays/restrictions/automatic.js
// ======================================================================
// Restriction overlay: Automatic transmission (E restriction)
// - Safely remove clutch/manual-only checks
// - Optionally append a small automatic-specific note in In-Cab
// - Pure data (no side effects). Unknown sections are skipped safely.
// ======================================================================

/** @type {import('../../schema').WalkthroughOverlay} */
export default {
  id: 'restriction:E:automatic',
  rules: [
    // ------------------------------------------------------------------
    // Remove manual/clutch checks across common headings.
    // If a section title does not exist in a dataset, the rule is ignored.
    // ------------------------------------------------------------------

    // In-Cab Inspection – drop clutch/manual gear checks
    {
      op: 'removeStep',
      match: { section: 'In-Cab Inspection', tag: 'clutch' },
    },
    {
      op: 'removeStep',
      match: { section: 'In-Cab Inspection', tag: 'manual-transmission' },
    },
    {
      op: 'removeStep',
      match: { section: 'In-Cab Inspection', tag: 'gear-check' },
    },

    // Alternate spellings occasionally used by some scripts
    {
      op: 'removeStep',
      match: { section: 'In Cab Inspection', tag: 'clutch' },
    },
    {
      op: 'removeStep',
      match: { section: 'In Cab Inspection', tag: 'manual-transmission' },
    },

    // Engine start / cab check variants
    { op: 'removeStep', match: { section: 'Engine Start', tag: 'clutch' } },
    {
      op: 'removeStep',
      match: { section: 'Cab Check/Start Engine', tag: 'clutch' },
    },
    {
      op: 'removeStep',
      match: { section: 'Cab Check/Start Engine', tag: 'manual-transmission' },
    },

    // Brake check sections sometimes include a “clutch hold” step
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'clutch' } },

    // ------------------------------------------------------------------
    // Append a concise automatic-specific reminder (non-destructive).
    // This is a no-op if the target section title is not present.
    // ------------------------------------------------------------------
    {
      op: 'appendSteps',
      match: { section: 'In-Cab Inspection' },
      steps: [
        {
          label: 'Transmission (automatic)',
          script:
            'Verify selector in PARK/NEUTRAL, apply service brake, and confirm ready to start.',
          tags: ['automatic-transmission'],
        },
      ],
    },
    {
      op: 'appendSteps',
      match: { section: 'In Cab Inspection' }, // alt spelling
      steps: [
        {
          label: 'Transmission (automatic)',
          script:
            'Verify selector in PARK/NEUTRAL, apply service brake, and confirm ready to start.',
          tags: ['automatic-transmission'],
        },
      ],
    },
  ],
}
