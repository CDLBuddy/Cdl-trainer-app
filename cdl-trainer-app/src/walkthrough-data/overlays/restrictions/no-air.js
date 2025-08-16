// ======================================================================
// Restriction overlay: No air brakes (L/Z restriction)
// - Remove/neutralize air-brake specific checks
// - Keep hydraulic/electric brake flow intact
// ======================================================================

/** @type {import('@walkthrough-loaders').WalkthroughOverlay} */
export default {
  id: 'restriction:LZ:no-air',
  rules: [
    // --- Neutralize dedicated “Air Brake Check” sections ----------------
    // If your dataset has a distinct section, collapse it to a single notice.
    {
      op: 'replaceSectionSteps',
      match: { section: 'Air Brake Check' },
      steps: [
        {
          label: 'No Air Brake Check (Restricted)',
          script:
            'This vehicle does not use full air brakes. Skip air-brake governor, build-up rate, and leak tests.',
          tags: ['no-air', 'info'],
        },
      ],
    },

    // Some datasets title it slightly differently:
    {
      op: 'replaceSectionSteps',
      match: { section: 'Air-Brake Check' },
      steps: [
        {
          label: 'No Air Brake Check (Restricted)',
          script:
            'Air-brake system checks do not apply. Proceed with hydraulic/electric brake checks only.',
          tags: ['no-air', 'info'],
        },
      ],
    },

    // --- Remove air-specific steps embedded inside a generic “Brake Check”
    // Uses multiple removeStep rules so missing tags/labels are safely ignored.
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'air-brake' } },
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'air-lines' } },
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'low-air-warning' } },
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'spring-brake' } },
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'air-governor' } },
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'build-up-rate' } },
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'leak-test' } },
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'applied-leak' } },
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'air-compressor' } },
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'cut-in' } },
    { op: 'removeStep', match: { section: 'Brake Check', tag: 'cut-out' } },

    // Some scripts include air-gauge or low-air alarm in-cab:
    { op: 'removeStep', match: { section: 'In-Cab Inspection', tag: 'air-gauge' } },
    { op: 'removeStep', match: { section: 'In-Cab Inspection', tag: 'low-air-warning' } },

    // --- Add a small reminder so students know what replaces those checks ----
    {
      op: 'appendSteps',
      match: { section: 'Brake Check' },
      steps: [
        {
          label: 'Hydraulic/Electric Brake Reminder',
          script:
            'Verify service brake operation, parking/emergency brake hold, and (if equipped) trailer brake function. Air-brake governor & leak tests are not applicable.',
          tags: ['no-air', 'hydraulic', 'electric'],
        },
      ],
    },
  ],
}