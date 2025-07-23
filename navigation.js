// navigation.js

// === BARREL IMPORTS FOR EACH ROLE ===
import * as studentPages    from "./student/index.js";
import * as instructorPages from "./instructor/index.js";
import * as adminPages      from "./admin/index.js";
import * as superadminPages from "./superadmin/index.js";

// === COMMON PAGES ===
import { renderLogin }   from "./login.js";
import { renderWelcome } from "./welcome.js";

// === SMART DETECTOR: Universal role detection ===
function getCurrentRole() {
  return (
    window.currentUserRole ||
    localStorage.getItem("userRole") ||
    "student"
  );
}

// === SMART NAVIGATION FUNCTION ===
export function handleNavigation(page, direction = "forward", ...args) {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  // Clean up previous modals, overlays, etc.
  document.querySelectorAll(".modal-overlay").forEach(el => el.remove());

  // Role detection (window, localStorage, fallback)
  const role = getCurrentRole();

  // Barrel assignment
  let rolePages;
  if (role === "superadmin")      rolePages = superadminPages;
  else if (role === "admin")      rolePages = adminPages;
  else if (role === "instructor") rolePages = instructorPages;
  else if (role === "student")    rolePages = studentPages;
  else                            rolePages = {};

  // --- SMART ROUTER SWITCH ---
  switch (page) {
    // --- SUPERADMIN ROUTES ---
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

    // --- ADMIN ROUTES (futureproof) ---
    case "admin-dashboard":
      if (role === "admin") rolePages.renderAdminDashboard?.(appEl, ...args);
      else renderWelcome(appEl);
      break;
    // Add more admin routes here as you expand.

    // --- COMMON ROLE ROUTES ---
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

    // --- INSTRUCTOR-SPECIFIC (may add more in future) ---
    case "checklistReview":
      instructorPages.renderChecklistReviewForInstructor?.(...args) || renderWelcome(appEl);
      break;

    // --- AUTH / PUBLIC PAGES ---
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

// === INITIAL LOAD SUPPORT (auto-login redirect) ===
window.addEventListener("DOMContentLoaded", () => {
  if (!window.currentUserEmail) {
    handleNavigation("welcome");
  } else {
    handleNavigation("dashboard");
  }
});