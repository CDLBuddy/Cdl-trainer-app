// Path: src/admin/billing/components/StatusPill/index.js
// ======================================================================
// Billing • StatusPill (barrel)
// - Default + named export for the component
// - Re-export status helpers for convenience
// ======================================================================

export { default } from './StatusPill.jsx'
export { default as StatusPill } from './StatusPill.jsx'

export {
  EMPLOYER_STATUSES,
  INDIVIDUAL_STATUSES,
  getAllowedStatuses,
} from './statusMap.js'

// Optional: if you want to import the styles via the barrel, uncomment:
// export { default as styles } from './StatusPill.module.css';
