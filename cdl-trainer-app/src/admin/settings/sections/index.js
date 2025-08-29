// Path: src/admin/settings/sections/index.js
// ======================================================================
// Admin Settings — Sections (LAZY-ONLY BARREL)
// - Exports only React.lazy() components to enable route-level splitting
// - Provides a data registry to drive nav/routing from config
// - No static imports of the section files here (prevents Vite warning)
// ======================================================================

// @ts-check
import { lazy } from 'react'

/** Lazy sections (each becomes its own chunk) */
export const Branding = lazy(() => import('./Branding.jsx'))
export const Billing = lazy(() => import('./Billing.jsx'))
export const Compliance = lazy(() => import('./Compliance.jsx'))
export const Courses = lazy(() => import('./Courses.jsx'))
export const Notifications = lazy(() => import('./Notifications.jsx'))
export const Users = lazy(() => import('./Users.jsx'))

/** @typedef {{key:string,title:string,icon?:string,component:import('react').ComponentType}} SectionDef */

/** Registry used by navigation / router */
export const SECTIONS = /** @type {Record<string, SectionDef>} */ ({
  branding: {
    key: 'branding',
    title: 'Branding',
    icon: '🎨',
    component: Branding,
  },
  billing: { key: 'billing', title: 'Billing', icon: '💳', component: Billing },
  users: { key: 'users', title: 'Users & Roles', icon: '🧑‍🤝‍🧑', component: Users },
  courses: { key: 'courses', title: 'Courses', icon: '📚', component: Courses },
  compliance: {
    key: 'compliance',
    title: 'Compliance',
    icon: '✅',
    component: Compliance,
  },
  notifications: {
    key: 'notifications',
    title: 'Notifications',
    icon: '🔔',
    component: Notifications,
  },
})

/** Order used by side-nav/tab UI */
export const SECTION_ORDER = [
  'branding',
  'billing',
  'users',
  'courses',
  'compliance',
  'notifications',
]

/** Returns an array of SectionDef in display order */
export function getSections() {
  return SECTION_ORDER.map(k => SECTIONS[k]).filter(Boolean)
}

/** Optional helper */
export function getSection(key) {
  return SECTIONS[key] || null
}
