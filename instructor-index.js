// instructor-index.js

<<<<<<< HEAD:instructor-index.js
// — Imports —
import { renderInstructorDashboard } from ‘./dashboard-instructor.js’;
import { renderInstructorProfile }   from ‘./instructor-profile.js’;
import { renderChecklistReviewForInstructor } from ‘./instructor-checklist.js’;
import { renderStudentProfileForInstructor } from ‘./student-profile.js’; // NEW
import { setupNavigation } from “../ui-helpers.js”;
=======
// --- Imports ---
import { renderInstructorDashboard } from '../dashboard-instructor.js';
import { renderInstructorProfile } from './instructor-profile.js';
import { renderChecklistReviewForInstructor } from './instructor-checklist.js';
import { renderStudentProfileForInstructor } from './student-profile.js'; // NEW
import { setupNavigation } from '../ui-helpers.js';
>>>>>>> main:instructor/index.js

// — Exports for barrel-style import in navigation.js —
export {
  renderInstructorDashboard,
  renderInstructorProfile,
  renderChecklistReviewForInstructor,
  renderStudentProfileForInstructor, // NEW
};

// — Simple navigation handling —
export function handleInstructorNav(page, ...args) {
<<<<<<< HEAD:instructor-index.js
  const container = args[1] || document.getElementById(“app”);
  window.currentUserRole = “instructor”; // Role context for helpers

  switch (page) {
    case “dashboard”:
      renderInstructorDashboard(container);
      break;
    case “profile”:
      renderInstructorProfile(container);
      break;
    case “checklistReview”:
      // args[0] should be student email
      renderChecklistReviewForInstructor(args[0], container);
      break;
    case “viewStudentProfile”:
=======
  const container = args[1] || document.getElementById('app');
  window.currentUserRole = 'instructor'; // Role context for helpers

  switch (page) {
    case 'dashboard':
      renderInstructorDashboard(container);
      break;
    case 'profile':
      renderInstructorProfile(container);
      break;
    case 'checklistReview':
      // args[0] should be student email
      renderChecklistReviewForInstructor(args[0], container);
      break;
    case 'viewStudentProfile':
>>>>>>> main:instructor/index.js
      // args[0] should be student email
      renderStudentProfileForInstructor(args[0], container);
      break;
    default:
      renderInstructorDashboard(container);
  }

  setupNavigation(); // Set up nav for instructor pages (if using [data-nav])
}

// — Optionally, auto-load dashboard on DOMContentLoaded (only if direct nav, not from app.js) —
if (!window.appHasBooted) {
<<<<<<< HEAD:instructor-index.js
  window.addEventListener(“DOMContentLoaded”, () => {
    handleInstructorNav(“dashboard”);
  });
  window.addEventListener(“popstate”, () => {
    const page = location.hash.replace(“#”, “”) || “dashboard”;
=======
  window.addEventListener('DOMContentLoaded', () => {
    handleInstructorNav('dashboard');
  });
  window.addEventListener('popstate', () => {
    const page = location.hash.replace('#', '') || 'dashboard';
>>>>>>> main:instructor/index.js
    handleInstructorNav(page);
  });
}
