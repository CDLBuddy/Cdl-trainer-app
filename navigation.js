// navigation.js

// === ROLE-BASED BARREL IMPORTS ===
import * as studentPages    from “./student-index.js”;
import * as instructorPages from “./instructor-index.js”;
import * as adminPages      from “./admin-index.js”;
import * as superadminPages from “./superadmin-index.js”;
>>>>>>>-main
MPORTS =import * as studentPages from './student/index.js';
import * as instructorPages from './instructor/index.js';
import * as adminPages from './admin/index.js';
import * as superadminPages from './superadmin/index.js';

>>>>>>>+origin/main
) || 'student'
  );
}

// === DEBUGGER (set true for route logs) ===
const NAV_DEBUG = false;

// === MAIN SMART NAVIGATION FUNCTION ===
export function handleNavigation(page, direction = 'forward', ...args) {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  // Accessibility: Remove any modal overlays
  document.querySelectorAll('.modal-overlay').forEach((el) => el.remove());

  // Role selection
  const role = getCurrentRole();
  let rolePages;
  if (role === 'superadmin') rolePages = superadminPages;
  else if (role === 'admin') rolePages = adminPages;
  else if (role === 'instructor') rolePages = instructorPages;
  else if (role === 'student') rolePages = studentPages;
  else rolePages = {};

  // Optional: log for debugging
  if (NAV_DEBUG) {
    console.log(`[NAV] Routing "${page}" as role "${role}"`, rolePages);
  }

  // --- SMART ROUTER SWITCH ---
  switch (page) {
    // --- SUPERADMIN ROUTES ---
    case 'superadmin-dashboard':
      return role === 'superadmin'
        ? rolePages.renderSuperadminDashboard?.(appEl, ...args)
        : renderWelcome(appEl);

    case 'schoolManagement':
      return role === 'superadmin'
        ? rolePages.renderSchoolManagement?.(appEl, ...args)
        : renderWelcome(appEl);

    case 'userManagement':
      return role === 'superadmin'
        ? rolePages.renderUserManagement?.(appEl, ...args)
        : renderWelcome(appEl);

    case 'complianceCenter':
      return role === 'superadmin'
        ? rolePages.renderComplianceCenter?.(appEl, ...args)
        : renderWelcome(appEl);

    case 'billing':
      return role === 'superadmin'
        ? rolePages.renderBilling?.(appEl, ...args)
        : renderWelcome(appEl);

    case 'settings':
      return role === 'superadmin'
        ? rolePages.renderSettings?.(appEl, ...args)
        : renderWelcome(appEl);

    case 'permissions':
      return role === 'superadmin'
        ? rolePages.renderPermissions?.(appEl, ...args)
        : renderWelcome(appEl);

    case 'logs':
      return role === 'superadmin'
        ? rolePages.renderLogs?.(appEl, ...args)
        : renderWelcome(appEl);

    // --- ADMIN ROUTES ---
    case 'admin-dashboard':
      return role === 'admin'
        ? rolePages.renderAdminDashboard?.(appEl, ...args)
        : renderWelcome(appEl);

    // ...add more admin routes as needed...

    // --- COMMON ROLE ROUTES ---
    case 'dashboard':
      if (NAV_DEBUG)
        console.log('[NAV] → dashboard with:', rolePages.renderDashboard);
      return (
        rolePages.renderDashboard?.(appEl, ...args) || renderWelcome(appEl)
      );

    case 'profile':
      return rolePages.renderProfile?.(appEl, ...args) || renderWelcome(appEl);

    case 'checklists':
      return (
        rolePages.renderChecklists?.(appEl, ...args) || renderWelcome(appEl)
      );

    case 'practiceTests':
      return (
        rolePages.renderPracticeTests?.(appEl, ...args) || renderWelcome(appEl)
      );

    case 'flashcards':
      return (
        rolePages.renderFlashcards?.(appEl, ...args) || renderWelcome(appEl)
      );

    case 'results':
      return (
        rolePages.renderTestResults?.(appEl, ...args) || renderWelcome(appEl)
      );

    case 'walkthrough':
      return (
        rolePages.renderWalkthrough?.(appEl, ...args) || renderWelcome(appEl)
      );

    case 'coach':
      return rolePages.renderAICoach?.(appEl, ...args) || renderWelcome(appEl);

    // --- INSTRUCTOR-SPECIFIC ---
    case 'checklistReview':
      return (
        instructorPages.renderChecklistReviewForInstructor?.(...args) ||
        renderWelcome(appEl)
      );

    // --- AUTH / PUBLIC PAGES ---
    case 'login':
      return renderLogin(appEl, ...args);

    case 'welcome':
    case 'home':
      return renderWelcome(appEl, ...args);

    default:
      // Fallback to dashboard for current role
      if (NAV_DEBUG)
        console.warn(`[NAV] Unknown route "${page}" – fallback to dashboard`);
      return (
        rolePages.renderDashboard?.(appEl, ...args) || renderWelcome(appEl)
      );
  }
}

// === HASH & POPSTATE NAVIGATION SUPPORT ===
window.addEventListener('popstate', () => {
  const page = location.hash.replace('#', '') || 'dashboard';
  handleNavigation(page, 'back');
});

// === INITIAL LOAD SUPPORT (auto-login redirect) ===
window.addEventListener('DOMContentLoaded', () => {
  if (!window.currentUserEmail) {
    handleNavigation('welcome');
  } else {
    handleNavigation('dashboard');
  }
});
