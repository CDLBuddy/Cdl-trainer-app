// ======================================================================
// Restriction overlay: No air brakes (LZ restriction)
// ======================================================================

/** @type {import('@walkthrough-loaders').WalkthroughOverlay} */
export default {
  id: 'restriction:LZ:no-air',
  rules: [
    // Example: remove air brake inspection steps
    // { op: 'removeStep', match: { tag: 'air-brake' } },
  ],
}