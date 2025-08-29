// Path: src/admin/companies/components/detail/index.js
// ============================================================================
// Admin • Companies • Detail Cards (barrel)
// - Central export hub for the Company detail page cards
// - Side-effect free and tree-shakable
// - Keeps imports tidy:
//     import { CompanyOverviewCard, CompanyDocumentsCard, CompanyNotesCard }
//       from '@admin/companies/components/detail'
// ============================================================================

export { default as CompanyDocumentsCard } from './CompanyDocumentsCard.jsx'
export { default as CompanyNotesCard } from './CompanyNotesCard.jsx'
export { default as CompanyOverviewCard } from './CompanyOverviewCard.jsx'
