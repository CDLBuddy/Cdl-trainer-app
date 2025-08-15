// src/student/components/index.js
// ======================================================
// Student Components Barrel
// - Named exports for direct imports
// - Async loader fns for lazy() without pulling React here
// ======================================================

// ----- Direct (eager) exports -----
export { default as TestEngineWrapper }  from './TestEngineWrapper.jsx'
export { default as TestReviewWrapper }  from './TestReviewWrapper.jsx'
export { default as TestResultsWrapper } from './TestResultsWrapper.jsx'

// ----- Lazy loaders (for route-level code-splitting) -----
// Usage:
//   const TestEngineWrapper = React.lazy(loadTestEngineWrapper)
export const loadTestEngineWrapper  = () => import('./TestEngineWrapper.jsx')
export const loadTestReviewWrapper  = () => import('./TestReviewWrapper.jsx')
export const loadTestResultsWrapper = () => import('./TestResultsWrapper.jsx')