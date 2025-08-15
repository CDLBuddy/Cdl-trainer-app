// ======================================================================
// Common overlay helper: merge similar steps
// ======================================================================

/** @type {import('@walkthrough-loaders').WalkthroughOverlay} */
export default {
  id: 'common:merge-steps',
  rules: [
    // Example: combine two brake checks into one step
    // { op: 'replaceStepText', match: { stepLabel: 'Brake Check' }, to: 'Full brake system check' },
  ],
}