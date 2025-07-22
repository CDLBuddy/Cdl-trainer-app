// instructor/index.js

import { renderInstructorDashboard } from './dashboard-instructor.js';
import { renderInstructorProfile } from './instructor-profile.js';
import { renderChecklistReviewForInstructor } from './instructor-checklist.js';

// Simple navigation handling -- call with a string
export function handleInstructorNav(page, ...args) {
  switch (page) {
    case "dashboard":
      renderInstructorDashboard(...args);
      break;
    case "profile":
      renderInstructorProfile(...args);
      break;
    case "checklistReview":
      // args[0] should be student email, args[1] is container (optional)
      renderChecklistReviewForInstructor(...args);
      break;
    default:
      renderInstructorDashboard(...args);
  }
}

// Optionally, auto-load dashboard on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  renderInstructorDashboard();
});

// Optionally, hash-based navigation (if you want back/forward support)
window.addEventListener("popstate", () => {
  const page = location.hash.replace("#", "") || "dashboard";
  handleInstructorNav(page);
});