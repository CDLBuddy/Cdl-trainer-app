// src/admin/settings/sections/index.js
// ======================================================================
// Admin Settings — Sections Barrel
// - Sync + Lazy exports for each settings section
// - Data registry for driving nav and routing from config
// - Tree-shake friendly; no side effects
// ======================================================================

// ---------- Sync components (use when you don't care about code-splitting)
export { default as Branding }      from './Branding.jsx';
export { default as Billing }       from './Billing.jsx';
export { default as Compliance }    from './Compliance.jsx';
export { default as Courses }       from './Courses.jsx';
export { default as Notifications } from './Notifications.jsx';
export { default as Users }         from './Users.jsx';

// ---------- Lazy versions (use these if you want route-level splitting)
import { lazy } from 'react';

export const BrandingLazy      = lazy(() => import('./Branding.jsx'));
export const BillingLazy       = lazy(() => import('./Billing.jsx'));
export const ComplianceLazy    = lazy(() => import('./Compliance.jsx'));
export const CoursesLazy       = lazy(() => import('./Courses.jsx'));
export const NotificationsLazy = lazy(() => import('./Notifications.jsx'));
export const UsersLazy         = lazy(() => import('./Users.jsx'));

// ---------- Section registry (UI can be 100% data-driven)
/** @typedef {{key:string,title:string,icon?:string,component:React.ComponentType}} SectionDef */

/** @type {Record<string, SectionDef>} */
export const SECTIONS = {
  branding:      { key: 'branding',      title: 'Branding',        icon: '🎨', component: BrandingLazy },
  billing:       { key: 'billing',       title: 'Billing',         icon: '💳', component: BillingLazy },
  compliance:    { key: 'compliance',    title: 'Compliance',      icon: '✅', component: ComplianceLazy },
  courses:       { key: 'courses',       title: 'Courses',         icon: '📚', component: CoursesLazy },
  notifications: { key: 'notifications', title: 'Notifications',   icon: '🔔', component: NotificationsLazy },
  users:         { key: 'users',         title: 'Users & Roles',   icon: '🧑‍🤝‍🧑', component: UsersLazy },
};

/** Order used by side-nav/tab UI */
export const SECTION_ORDER = [
  'branding',
  'billing',
  'users',
  'courses',
  'compliance',
  'notifications',
];

/** Returns an array of SectionDef in display order */
export function getSections() {
  return SECTION_ORDER.map((k) => SECTIONS[k]).filter(Boolean);
}