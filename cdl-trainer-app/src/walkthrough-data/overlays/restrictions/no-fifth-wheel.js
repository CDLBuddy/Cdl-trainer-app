// ======================================================================
// Restriction overlay: No fifth-wheel (O restriction)
// - Removes fifth-wheel specific coupling/uncoupling checks
// - Leaves straight-truck / pintle / ball / drawbar notes in place
// - All rules are tolerant: if a section/step/tag doesn't exist, it's ignored
// ======================================================================

/** @type {import('@walkthrough-loaders').WalkthroughOverlay} */
export default {
  id: 'restriction:O:no-fifth-wheel',
  rules: [
    // ---- Replace dedicated sections with a short notice ----------------
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

    // ---- Remove fifth-wheel specific steps baked into broader sections ----
    // Common places where fifth-wheel checks are embedded
    { op: 'removeStep', match: { section: 'Trailer Inspection', tag: 'fifth-wheel' } },
    { op: 'removeStep', match: { section: 'Trailer Inspection', tag: 'kingpin' } },
    { op: 'removeStep', match: { section: 'Trailer Inspection', tag: 'locking-jaws' } },
    { op: 'removeStep', match: { section: 'Trailer Inspection', tag: 'apron' } },
    { op: 'removeStep', match: { section: 'Trailer Inspection', tag: 'skid-plate' } },
    { op: 'removeStep', match: { section: 'Trailer Inspection', tag: 'release-arm' } },
    { op: 'removeStep', match: { section: 'Trailer Inspection', tag: 'platform' } },
    { op: 'removeStep', match: { section: 'Trailer Inspection', tag: 'gap-check' } },

    { op: 'removeStep', match: { section: 'Pre-Trip Inspection', tag: 'fifth-wheel' } },
    { op: 'removeStep', match: { section: 'Pre-Trip Inspection',  tag: 'fifth-wheel' } }, // alt punctuation
    { op: 'removeStep', match: { section: 'Pre-Trip Inspection', tag: 'kingpin' } },
    { op: 'removeStep', match: { section: 'Pre-Trip Inspection', tag: 'locking-jaws' } },
    { op: 'removeStep', match: { section: 'Pre-Trip Inspection', tag: 'apron' } },
    { op: 'removeStep', match: { section: 'Pre-Trip Inspection', tag: 'skid-plate' } },
    { op: 'removeStep', match: { section: 'Pre-Trip Inspection', tag: 'release-arm' } },
    { op: 'removeStep', match: { section: 'Pre-Trip Inspection', tag: 'platform' } },
    { op: 'removeStep', match: { section: 'Pre-Trip Inspection', tag: 'gap-check' } },

    // Some scripts include coupling notes in “In-Cab” or “Vehicle Overview”
    { op: 'removeStep', match: { section: 'Vehicle Overview', tag: 'fifth-wheel' } },
    { op: 'removeStep', match: { section: 'In-Cab Inspection', tag: 'fifth-wheel' } },
    { op: 'removeStep', match: { section: 'In-Cab Inspection', tag: 'fifth-wheel' } },

    // ---- Add a small reminder where a generic trailer section still exists --
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
  ],
}