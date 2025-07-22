// navigation.js

// === BARREL IMPORTS FOR EACH ROLE ===
import * as studentPages    from "./student/index.js";
import * as instructorPages from "./instructor/index.js";
import * as adminPages      from "./admin/index.js"; // If you have admin folder

// === COMMON PAGES ===
import { renderLogin }   from "./login.js";
import { renderWelcome } from "./welcome.js";
// ...add any other global pages you want

// === HELPER: Determine user role ===
function getCurrentRole() {
  // Try localStorage, then window, fallback to "student"
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

  // Clean up previous modals, etc. (optional)
  document.querySelectorAll(".modal-overlay").forEach(el => el.remove());

  // Find role
  const role = getCurrentRole();

  // Determine which barrel to use
  let rolePages;
  if (role === "student") rolePages = studentPages;
  else if (role === "instructor") rolePages = instructorPages;
  else if (role === "admin") rolePages = adminPages;
  else rolePages = {}; // fallback

  // --- SMART ROUTER SWITCH ---
  // You can make this smarter as you add more shared or role-specific pages
  switch (page) {
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
    // Add admin-specific pages as needed...
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

  // Optional: Add transitions/animations here if needed
  // (your old code for fade/slide can go here)
}

// === HASH & POPSTATE NAVIGATION SUPPORT ===
window.addEventListener("popstate", () => {
  const page = location.hash.replace("#", "") || "dashboard";
  handleNavigation(page, "back");
});

// === INITIAL LOAD SUPPORT (optional) ===
window.addEventListener("DOMContentLoaded", () => {
  // Let auth listener trigger the correct page, or go to welcome
  if (!window.currentUserEmail) {
    handleNavigation("welcome");
  }
});