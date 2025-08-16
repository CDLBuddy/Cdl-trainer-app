// ======================================================================
// Restriction overlay: Automatic transmission (E restriction)
// - Remove any clutch/manual-only steps
// - Add a small note for automatics in the in-cab section
// ======================================================================

/** @type {import('@walkthrough-loaders').WalkthroughOverlay} */
export default {
  id: 'restriction:E:automatic',
  rules: [
    // --- Remove manual/clutch checks in common sections ----------------
    // If the section title isn’t present in a dataset, this rule is skipped safely.

    // In-Cab Inspection – drop clutch/manual gear checks
    { op: 'removeStep', match: { section: 'In-Cab Inspection', tag: 'clutch' } },
    { op: 'removeStep', match: { section: 'In-Cab Inspection', tag: 'manual-transmission' } },
    { op: 'removeStep', match: { section: 'In-Cab Inspection', tag: 'gear-check' } },

    // Engine Start / In-Cab variations seen in some scripts
    { op: 'removeStep', match: { section: 'Engine Start', tag: 'clutch' } },
    { op: 'removeStep', match: { section: 'Cab Check/Start Engine', tag: 'clutch' } },
    { op: 'removeStep', match: { section: 'Cab Check/Start Engine', tag: 'manual-transmission' } },

    // Brake Check sections sometimes include a “clutch hold” or similar
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'clutch' } },

    // --- Add a small automatic-specific reminder -----------------------
    // Creates the section if it doesn't exist; otherwise appends at end.
    {
      op: 'appendSteps',
      match: { section: 'In-Cab Inspection' },
      steps: [
        {
          label: 'Transmission (automatic)',
          script: 'Verify selector in PARK/NEUTRAL, apply service brake, and confirm ready to start.',
          tags: ['automatic-transmission'],
        },
      ],
    },
  ],
}