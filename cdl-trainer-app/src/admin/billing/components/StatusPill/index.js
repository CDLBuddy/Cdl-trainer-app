// Path: src/admin/billing/components/StatusPill/index.js
// ======================================================================
// Billing • StatusPill (barrel)
// - Default + named export for the component
// - Re-export status helpers for convenience
// ======================================================================

export {
  EMPLOYER_STATUSES,
  getAllowedStatuses,
  INDIVIDUAL_STATUSES,
} from './statusMap.js'
export { default } from './StatusPill.jsx'
export { default as StatusPill } from './StatusPill.jsx'

// Optional: if you want to import the styles via the barrel, uncomment:
// export { default as styles } from './StatusPill.module.css';
