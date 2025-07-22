// navigation.js

// === BARREL IMPORTS FOR EACH ROLE ===
import * as studentPages    from "./student/index.js";
import * as instructorPages from "./instructor/index.js";
import * as adminPages      from "./admin/index.js";
import * as superadminPages from "./superadmin/index.js";

// === COMMON PAGES ===
import { renderLogin }   from "./login.js";
import { renderWelcome } from "./welcome.js";

// === HELPER: Determine user role ===
function getCurrentRole() {
  return (
    localStorage.getItem("userRole") ||
    window.currentUserRole ||
    "student"
  );
}

// === MAIN SMART NAVIGATION FUNCTION ===
export function handleNavigation(page, direction = "forward", ...args) {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  // Clean up previous modals, etc.
  document.querySelectorAll(".modal-overlay").forEach(el => el.remove());

  // Find role
  const role = getCurrentRole();

  // Determine which barrel to use
  let rolePages;
  if (role === "superadmin") rolePages = superadminPages;
  else if (role === "admin") rolePages = adminPages;
  else if (role === "instructor") rolePages = instructorPages;
  else if (role === "student") rolePages = studentPages;
  else rolePages = {};

  // --- SMART ROUTER SWITCH ---
  switch (page) {
    // === SUPERADMIN ROUTES ===
    case "superadmin-dashboard":
      if (role === "superadmin") rolePages.renderSuperadminDashboard?.(appEl, ...args);
      else renderWelcome(appEl);
      break;
    case "schoolManagement":
      if (role === "superadmin") rolePages.renderSchoolManagement?.(appEl, ...args);
      else renderWelcome(appEl);
      break;
    case "userManagement":
      if (role === "superadmin") rolePages.renderUserManagement?.(appEl, ...args);
      else renderWelcome(appEl);
      break;
    case "complianceCenter":
      if (role === "superadmin") rolePages.renderComplianceCenter?.(appEl, ...args);
      else renderWelcome(appEl);
      break;
    case "billing":
      if (role === "superadmin") rolePages.renderBilling?.(appEl, ...args);
      else renderWelcome(appEl);
      break;
    case "settings":
      if (role === "superadmin") rolePages.renderSettings?.(appEl, ...args);
      else renderWelcome(appEl);
      break;
    case "permissions":
      if (role === "superadmin") rolePages.renderPermissions?.(appEl, ...args);
      else renderWelcome(appEl);
      break;
    case "logs":
      if (role === "superadmin") rolePages.renderLogs?.(appEl, ...args);
      else renderWelcome(appEl);
      break;

    // === STUDENT/INSTRUCTOR/ADMIN ROUTES (UNCHANGED) ===
    case "dashboard":
      rolePages.renderDashboard?.(appEl, ...args) || renderWelcome(appEl);
      break;
    case "profile":
      rolePages.renderProfile?.(appEl, ...args) || renderWelcome(appEl);
      break;
    case "checklists":
      rolePages.renderChecklists?.(appEl, ...args) || renderWelcome(appEl);
      break;
    case "practiceTests":
      rolePages.renderPracticeTests?.(appEl, ...args) || renderWelcome(appEl);
      break;
    case "flashcards":
      rolePages.renderFlashcards?.(appEl, ...args) || renderWelcome(appEl);
      break;
    case "results":
      rolePages.renderTestResults?.(appEl, ...args) || renderWelcome(appEl);
      break;
    case "walkthrough":
      rolePages.renderWalkthrough?.(appEl, ...args) || renderWelcome(appEl);
      break;
    case "coach":
      rolePages.renderAICoach?.(appEl, ...args) || renderWelcome(appEl);
      break;

    // Instructor-specific
    case "checklistReview":
      instructorPages.renderChecklistReviewForInstructor?.(...args) || renderWelcome(appEl);
      break;

    // Auth / public pages
    case "login":
      renderLogin(appEl, ...args);
      break;
    case "welcome":
    case "home":
      renderWelcome(appEl, ...args);
      break;
    default:
      // Fallback to dashboard of their role
      rolePages.renderDashboard?.(appEl, ...args) || renderWelcome(appEl);
  }
}

// === HASH & POPSTATE NAVIGATION SUPPORT ===
window.addEventListener("popstate", () => {
  const page = location.hash.replace("#", "") || "dashboard";
  handleNavigation(page, "back");
});

// === INITIAL LOAD SUPPORT (optional) ===
window.addEventListener("DOMContentLoaded", () => {
  if (!window.currentUserEmail) {
    handleNavigation("welcome");
  }
});