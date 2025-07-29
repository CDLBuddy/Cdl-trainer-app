// navigation.js

// === ROLE-BASED BARREL IMPORTS ===
import * as studentPages from './student/index.js';
import * as instructorPages from './instructor/index.js';
import * as adminPages from './admin/index.js';
import * as superadminPages from './superadmin/index.js';

// === COMMON PAGE IMPORTS ===
import { renderLogin } from './login.js';
import { renderWelcome } from './welcome.js';

// === ROLE DETECTOR (universal, robust) ===
function getCurrentRole() {
  return (
    window.currentUserRole || localStorage.getItem('userRole') || 'student'
  );
}

// === DEBUGGER (set true for route logs) ===
const NAV_DEBUG = false;

// === MAIN SMART NAVIGATION FUNCTION ===
export function handleNavigation(page, direction = 'forward', ...args) {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  // Accessibility: Remove any open modals
  document.querySelectorAll('.modal-overlay').forEach((el) => el.remove());

  // --- Role detection and page map ---
  const role = getCurrentRole();
  let rolePages;
  switch (role) {
    case 'superadmin':
      rolePages = superadminPages;
      break;
    case 'admin':
      rolePages = adminPages;
      break;
    case 'instructor':
      rolePages = instructorPages;
      break;
    case 'student':
      rolePages = studentPages;
      break;
    default:
      rolePages = {};
      break;
  }

  if (NAV_DEBUG) {
    console.log(`[NAV] Routing to "${page}" as "${role}"`, { args });
  }

  // === FULLY ROLE-SPLIT ROUTES ===
  switch (page) {
    // --- SUPERADMIN ROUTES ---
    case 'superadmin-dashboard':
      return role === 'superadmin'
        ? rolePages.renderSuperadminDashboard?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'superadmin-schools':
      return role === 'superadmin'
        ? rolePages.renderSchoolManagement?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'superadmin-users':
      return role === 'superadmin'
        ? rolePages.renderUserManagement?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'superadmin-compliance':
      return role === 'superadmin'
        ? rolePages.renderComplianceCenter?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'superadmin-billing':
      return role === 'superadmin'
        ? rolePages.renderBilling?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'superadmin-settings':
      return role === 'superadmin'
        ? rolePages.renderSettings?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'superadmin-permissions':
      return role === 'superadmin'
        ? rolePages.renderPermissions?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'superadmin-logs':
      return role === 'superadmin'
        ? rolePages.renderLogs?.(appEl, ...args)
        : renderWelcome(appEl);

    // --- ADMIN ROUTES ---
    case 'admin-dashboard':
      return role === 'admin'
        ? rolePages.renderAdminDashboard?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'admin-profile':
      return role === 'admin'
        ? rolePages.renderAdminProfile?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'admin-users':
      return role === 'admin'
        ? rolePages.renderAdminUsers?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'admin-companies':
      return role === 'admin'
        ? rolePages.renderAdminCompanies?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'admin-reports':
      return role === 'admin'
        ? rolePages.renderAdminReports?.(appEl, ...args)
        : renderWelcome(appEl);

    // --- INSTRUCTOR ROUTES ---
    case 'instructor-dashboard':
      return role === 'instructor'
        ? rolePages.renderInstructorDashboard?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'instructor-profile':
      return role === 'instructor'
        ? rolePages.renderInstructorProfile?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'instructor-checklist-review':
      return role === 'instructor'
        ? rolePages.renderChecklistReviewForInstructor?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'instructor-student-profile':
      return role === 'instructor'
        ? rolePages.renderStudentProfileForInstructor?.(appEl, ...args)
        : renderWelcome(appEl);

    // --- STUDENT ROUTES ---
    case 'student-dashboard':
      return role === 'student'
        ? rolePages.renderStudentDashboard?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'student-profile':
      return role === 'student'
        ? rolePages.renderProfile?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'student-checklists':
      return role === 'student'
        ? rolePages.renderChecklists?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'student-practice-tests':
      return role === 'student'
        ? rolePages.renderPracticeTests?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'student-test-review':
      return role === 'student'
        ? rolePages.renderTestReview?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'student-flashcards':
      return role === 'student'
        ? rolePages.renderFlashcards?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'student-results':
      return role === 'student'
        ? rolePages.renderTestResults?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'student-walkthrough':
      return role === 'student'
        ? rolePages.renderWalkthrough?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'student-coach':
      return role === 'student'
        ? rolePages.renderAICoach?.(appEl, ...args)
        : renderWelcome(appEl);
    case 'student-test-engine':
      return role === 'student'
        ? rolePages.renderTestEngine?.(appEl, ...args)
        : renderWelcome(appEl);

    // --- AUTH / PUBLIC PAGES ---
    case 'login':
      return renderLogin(appEl, ...args);
    case 'welcome':
    case 'home':
      return renderWelcome(appEl, ...args);

    // --- DEFAULT FALLBACK: Role-based dashboard ---
    default:
      if (NAV_DEBUG)
        console.warn(`[NAV] Unknown route "${page}" - fallback to dashboard`);
      switch (role) {
        case 'superadmin':
          return (
            rolePages.renderSuperadminDashboard?.(appEl, ...args) ||
            renderWelcome(appEl)
          );
        case 'admin':
          return (
            rolePages.renderAdminDashboard?.(appEl, ...args) ||
            renderWelcome(appEl)
          );
        case 'instructor':
          return (
            rolePages.renderInstructorDashboard?.(appEl, ...args) ||
            renderWelcome(appEl)
          );
        case 'student':
        default:
          return (
            rolePages.renderStudentDashboard?.(appEl, ...args) ||
            renderWelcome(appEl)
          );
      }
  }
}

// === HASH & POPSTATE NAVIGATION SUPPORT ===
window.addEventListener('popstate', () => {
  let page = location.hash.replace('#', '') || null;
  if (!page) {
    // Fallback to role-specific dashboard
    const role = getCurrentRole();
    switch (role) {
      case 'superadmin':
        page = 'superadmin-dashboard';
        break;
      case 'admin':
        page = 'admin-dashboard';
        break;
      case 'instructor':
        page = 'instructor-dashboard';
        break;
      case 'student':
      default:
        page = 'student-dashboard';
        break;
    }
  }
  handleNavigation(page, 'back');
});

// === INITIAL LOAD SUPPORT ===
window.addEventListener('DOMContentLoaded', () => {
  if (!window.currentUserEmail) {
    handleNavigation('welcome');
  } else {
    // Go to role-specific dashboard
    const role = getCurrentRole();
    let dash =
      role === 'superadmin'
        ? 'superadmin-dashboard'
        : role === 'admin'
          ? 'admin-dashboard'
          : role === 'instructor'
            ? 'instructor-dashboard'
            : 'student-dashboard';
    handleNavigation(dash);
  }
});
