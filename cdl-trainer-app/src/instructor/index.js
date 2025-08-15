//src/instructor/index.js======================================================================
// INSTRUCTOR BARREL (pure)
// - Re-export instructor pages & utilities (no side effects)
// - Keep this file JSX/CSS free so Fast Refresh stays happy
// ======================================================================

// ---- Pages -------------------------------------------------------------
export { default as InstructorDashboard }          from './InstructorDashboard.jsx'
export { default as InstructorProfile }            from './InstructorProfile.jsx'
export { default as StudentProfileForInstructor }  from './StudentProfileForInstructor.jsx'
export { default as ChecklistReviewForInstructor } from './ChecklistReviewForInstructor.jsx'

// ---- Optional: expose preload helpers (tree-shakable) -----------------
export {
  default as preloadInstructorCore,
  preloadInstructorCore as preload,         // alias if you like shorter name
  warmInstructorOnIdle,
  warmInstructorSoon,
  preloadInstructorOnHover,
} from './preload.js'

// ---- (Future) sub-barrels / hooks / utils (keep side-effect free) -----
// export * from './components'
// export * from './hooks'
// export * from './utils'