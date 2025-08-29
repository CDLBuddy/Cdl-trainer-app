// Path: src/walkthrough-data/overlays/restrictions/no-fifth-wheel.js
// ======================================================================
// Restriction overlay: No fifth-wheel (O restriction)
// - Removes fifth-wheel–specific coupling/uncoupling checks
// - Leaves straight-truck / pintle / ball / drawbar notes intact
// - Pure data; unknown sections are skipped without error
// ======================================================================

/** @type {import('../../schema').WalkthroughOverlay} */
export default {
  id: 'restriction:O:no-fifth-wheel',
  rules: [
    // ------------------------------------------------------------------
    // Replace dedicated coupling sections with a concise notice.
    // Include a couple of common title variants.
    // ------------------------------------------------------------------
    {
      op: 'replaceSectionSteps',
      match: { section: 'Coupling System' },
      steps: [
        {
          label: 'Fifth-Wheel Not Applicable',
          script:
            'This vehicle is operated under an “O” restriction. Fifth-wheel components (platform, skid plate, apron, kingpin, locking jaws) do not apply. Perform only straight-truck or non-fifth-wheel trailer checks as equipped.',
          tags: ['no-fifth-wheel', 'info'],
        },
      ],
    },
    {
      op: 'replaceSectionSteps',
      match: { section: 'Coupling/Uncoupling' },
      steps: [
        {
          label: 'Skip Fifth-Wheel Coupling/Uncoupling',
          script:
            'Skip tractor–semi fifth-wheel coupling/uncoupling procedures. If operating a drawbar/pintle/ball setup, follow the appropriate safety-chain, hitch, and breakaway checks instead.',
          tags: ['no-fifth-wheel', 'info'],
        },
      ],
    },
    {
      op: 'replaceSectionSteps',
      match: { section: 'Coupling & Uncoupling' }, // alt punctuation
      steps: [
        {
          label: 'Skip Fifth-Wheel Coupling/Uncoupling',
          script:
            'Fifth-wheel procedures are not applicable. Use pintle/ball/drawbar checks as appropriate.',
          tags: ['no-fifth-wheel', 'info'],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Remove fifth-wheel specific steps embedded in broader sections.
    // Tags are matched; missing tags/sections are safely ignored.
    // ------------------------------------------------------------------
    {
      op: 'removeStep',
      match: { section: 'Trailer Inspection', tag: 'fifth-wheel' },
    },
    {
      op: 'removeStep',
      match: { section: 'Trailer Inspection', tag: 'fifthwheel' },
    }, // alt tag
    {
      op: 'removeStep',
      match: { section: 'Trailer Inspection', tag: 'kingpin' },
    },
    {
      op: 'removeStep',
      match: { section: 'Trailer Inspection', tag: 'king-pin' },
    },
    {
      op: 'removeStep',
      match: { section: 'Trailer Inspection', tag: 'locking-jaws' },
    },
    {
      op: 'removeStep',
      match: { section: 'Trailer Inspection', tag: 'apron' },
    },
    {
      op: 'removeStep',
      match: { section: 'Trailer Inspection', tag: 'skid-plate' },
    },
    {
      op: 'removeStep',
      match: { section: 'Trailer Inspection', tag: 'release-arm' },
    },
    {
      op: 'removeStep',
      match: { section: 'Trailer Inspection', tag: 'platform' },
    },
    {
      op: 'removeStep',
      match: { section: 'Trailer Inspection', tag: 'gap-check' },
    },

    {
      op: 'removeStep',
      match: { section: 'Pre-Trip Inspection', tag: 'fifth-wheel' },
    },
    {
      op: 'removeStep',
      match: { section: 'Pre-Trip Inspection', tag: 'fifthwheel' },
    },
    {
      op: 'removeStep',
      match: { section: 'Pre-Trip Inspection', tag: 'kingpin' },
    },
    {
      op: 'removeStep',
      match: { section: 'Pre-Trip Inspection', tag: 'locking-jaws' },
    },
    {
      op: 'removeStep',
      match: { section: 'Pre-Trip Inspection', tag: 'apron' },
    },
    {
      op: 'removeStep',
      match: { section: 'Pre-Trip Inspection', tag: 'skid-plate' },
    },
    {
      op: 'removeStep',
      match: { section: 'Pre-Trip Inspection', tag: 'release-arm' },
    },
    {
      op: 'removeStep',
      match: { section: 'Pre-Trip Inspection', tag: 'platform' },
    },
    {
      op: 'removeStep',
      match: { section: 'Pre-Trip Inspection', tag: 'gap-check' },
    },

    // Some scripts tuck coupling notes under “In-Cab / Vehicle Overview”
    {
      op: 'removeStep',
      match: { section: 'Vehicle Overview', tag: 'fifth-wheel' },
    },
    {
      op: 'removeStep',
      match: { section: 'In-Cab Inspection', tag: 'fifth-wheel' },
    },
    {
      op: 'removeStep',
      match: { section: 'In Cab Inspection', tag: 'fifth-wheel' },
    }, // alt spelling

    // ------------------------------------------------------------------
    // Add a small reminder where a generic trailer section exists.
    // (No-op if the target section title isn’t present.)
    // ------------------------------------------------------------------
    {
      op: 'appendSteps',
      match: { section: 'Trailer Inspection' },
      steps: [
        {
          label: 'Non-Fifth-Wheel Reminder',
          script:
            'If towing with a pintle/ball/drawbar, inspect hitch hardware, safety chains/cables, breakaway device, electrical connector, and safety latch per manufacturer instructions.',
          tags: ['no-fifth-wheel', 'trailer', 'safety'],
        },
      ],
    },
    {
      op: 'appendSteps',
      match: { section: 'Pre-Trip Inspection' },
      steps: [
        {
          label: 'Non-Fifth-Wheel Reminder',
          script:
            'Confirm correct hitch type and perform pintle/ball/drawbar checks (hitch secure, safety chains/cables crossed and attached, breakaway device connected, electrical working).',
          tags: ['no-fifth-wheel', 'trailer', 'safety'],
        },
      ],
    },
  ],
}
