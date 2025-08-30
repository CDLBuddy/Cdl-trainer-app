// Path: src/student/walkthrough/components/index.js
// ======================================================================
// Student Walkthrough • Components (barrel)
// - Side-effect free & tree-shakable
// - Stable default-exports for clean imports
// - Ready for future named-export rollups if needed
// ======================================================================

export { default as ScriptViewer } from './ScriptViewer.jsx'
export { default as DrillTabs } from './DrillTabs.jsx'
export { default as ProgressBar } from './ProgressBar.jsx'

// If you later add named exports in any component files, you can roll them up:
// export * from './ScriptViewer.jsx'
// export * from './DrillTabs.jsx'
// export * from './ProgressBar.jsx'