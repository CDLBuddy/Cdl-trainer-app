// src/student/walkthrough/index.js
// ======================================================================
// Student Walkthrough • Public surface
// - Main page component
// - Explicit, collision-safe re-exports for submodules
// - Tree-shake friendly, no side effects
// ======================================================================

// Page
export { default as Walkthrough } from './Walkthrough.jsx'

// Components
export { default as ScriptViewer } from './components/ScriptViewer.jsx'
export { default as DrillTabs } from './components/DrillTabs.jsx'
export { default as ProgressBar } from './components/ProgressBar.jsx'

// Hooks
export { default as useWalkthroughScript } from './hooks/useWalkthroughScript.js'
export { default as useDrillProgress } from './hooks/useDrillProgress.js'

// Services (thin wrappers over @utils/ui-helpers)
export * from './services/walkthroughApi.js'

// Utils
export { autoTokensFrom, tokensForSteps } from './utils/tokens.js'
export { getCurrentUserEmail } from './utils/session.js'

// Drills
export { default as FillClozeDrill } from './drills/FillClozeDrill.jsx'
export { default as OrderStepsDrill } from './drills/OrderStepsDrill.jsx'
export { default as TypePhraseDrill } from './drills/TypePhraseDrill.jsx'
export { default as VisualRecallDrill } from './drills/VisualRecallDrill.jsx'