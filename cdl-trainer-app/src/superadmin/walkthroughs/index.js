// src/superadmin/walkthroughs/index.js
// -----------------------------------------------------------------------------
// Superadmin Walkthroughs — Barrel exports
// -----------------------------------------------------------------------------

// Pages
export { default as SAReviewQueue } from './SAReviewQueue.jsx'
export { default as SAReviewDetail } from './SAReviewDetail.jsx'

// Firestore API (named exports)
export * from './SaWalkthroughApi.js'