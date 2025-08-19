// src/utils/index.js
// ======================================================================
// Utils Barrel
// - Centralized, side-effect-free re-exports
// - Grouped by concern for readability
// - Tree-shake friendly (named exports)
// - Keep this file light: no imports that *run* code on import
// ======================================================================

// ----------------------------------------------------------------------
// Auth / Firebase
// ----------------------------------------------------------------------
export * from './auth.js';          // e.g., signInWithEmail, signOutIfStale, etc.
export * from './firebase.js';      // e.g., auth, db, storage, app

// ----------------------------------------------------------------------
// App Data / Admin Data
// ----------------------------------------------------------------------
export * from './admin-data.js';    // helpers to query admin-leaning collections
export * from './userProfile.js';   // e.g., getBlankUserProfile, profile helpers

// ----------------------------------------------------------------------
// Invites / Onboarding
// ----------------------------------------------------------------------
export * from './invites.js';       // getInvite, consumeInvite, isValidInvite

// ----------------------------------------------------------------------
// School / Branding / Context
// ----------------------------------------------------------------------
export * from './school-branding.js';   // getCurrentSchoolBranding, setCurrentSchool, etc.
export * from './schoolSwitching.js';   // utilities for switching school context

// ----------------------------------------------------------------------
// Navigation / Performance
// ----------------------------------------------------------------------
export * from './route-preload.js';     // preloading helpers for routes/views

// ----------------------------------------------------------------------
// Layout / Hooks (pure hooks only)
// ----------------------------------------------------------------------
export * from './layout-hooks.js';      // responsive / layout convenience hooks

// ----------------------------------------------------------------------
// UI Helpers (non-React utilities only)
// NOTE: we blocked `showToast` via ESLint in favor of ToastContext.
// Keep only pure helpers that are safe to import anywhere.
// ----------------------------------------------------------------------
export * from './ui-helpers.js';

// ----------------------------------------------------------------------
// AI client (if used across app; keep it side-effect free)
// ----------------------------------------------------------------------
export * from './aiApi.js';

// ----------------------------------------------------------------------
// Service Worker registration (pure function; call from app entry)
// ----------------------------------------------------------------------
export * from './registerServiceWorker.js'; // registerServiceWorker()

// ----------------------------------------------------------------------
// Components that live in utils (avoid this pattern when possible)
// If this file *does not* default-export, remove the line below.
// ----------------------------------------------------------------------
export { default as RequireRole } from './RequireRole.jsx';