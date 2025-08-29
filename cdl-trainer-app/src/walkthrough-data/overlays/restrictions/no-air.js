// Path: src/walkthrough-data/overlays/restrictions/no-air.js
// ======================================================================
// Restriction overlay: No air brakes (L/Z)
// - Remove/neutralize air-brake–specific checks
// - Preserve hydraulic/electric brake flow
// - Pure data; unknown sections are skipped safely
// ======================================================================

/** @type {import('../../schema').WalkthroughOverlay} */
export default {
  id: 'restriction:LZ:no-air',
  rules: [
    // ------------------------------------------------------------------
    // Neutralize dedicated “Air Brake Check” sections by collapsing them
    // to a single informational step. Use a few common title variants.
    // ------------------------------------------------------------------
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
    {
      op: 'replaceSectionSteps',
      match: { section: 'Air System Check' },
      steps: [
        {
          label: 'No Air Brake Check (Restricted)',
          script:
            'Air-system tests (governor/leak/build-up) are not applicable on this vehicle.',
          tags: ['no-air', 'info'],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Remove air-specific steps when they’re embedded inside a generic
    // Brake Check section. Missing tags/labels are ignored safely.
    // ------------------------------------------------------------------
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

    // A couple of common alternate headings
    { op: 'removeStep', match: { section: 'Brake Checks', tag: 'air-brake' } },
    { op: 'removeStep', match: { section: 'Service Brake Check', tag: 'air-brake' } },

    // In-cab air gauge / low-air warning often appears under in-cab
    { op: 'removeStep', match: { section: 'In-Cab Inspection', tag: 'air-gauge' } },
    { op: 'removeStep', match: { section: 'In-Cab Inspection', tag: 'low-air-warning' } },
    { op: 'removeStep', match: { section: 'In Cab Inspection',  tag: 'air-gauge' } }, // alt spelling
    { op: 'removeStep', match: { section: 'In Cab Inspection',  tag: 'low-air-warning' } },

    // ------------------------------------------------------------------
    // Append a concise reminder about what *does* apply for these vehicles.
    // (No-op if the target section title doesn’t exist.)
    // ------------------------------------------------------------------
    {
      op: 'appendSteps',
      match: { section: 'Brake Check' },
      steps: [
        {
          label: 'Hydraulic/Electric Brake Reminder',
          script:
            'Verify service-brake operation, parking/emergency brake hold, and (if equipped) trailer brake function. Air-brake governor & leak tests are not applicable.',
          tags: ['no-air', 'hydraulic', 'electric'],
        },
      ],
    },
    {
      op: 'appendSteps',
      match: { section: 'Brake Checks' }, // alt heading
      steps: [
        {
          label: 'Hydraulic/Electric Brake Reminder',
          script:
            'Verify service-brake operation, parking/emergency brake hold, and (if equipped) trailer brake function. Air-brake governor & leak tests are not applicable.',
          tags: ['no-air', 'hydraulic', 'electric'],
        },
      ],
    },
  ],
}