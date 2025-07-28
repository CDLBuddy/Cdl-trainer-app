// instructor-index.js

// === INSTRUCTOR MODULE BARREL IMPORTS ===
import { renderInstructorDashboard } from './instructor/instructor-dashboard.js';
import { renderInstructorProfile } from './instructor/instructor-profile.js';
import { renderChecklistReviewForInstructor } from './instructor/instructor-checklist.js';
import { renderStudentProfileForInstructor } from './instructor/student-profile.js';

// === BARREL EXPORTS ===
export {
  renderInstructorDashboard,
  renderInstructorProfile,
  renderChecklistReviewForInstructor,
  renderStudentProfileForInstructor,
};

// === INSTRUCTOR NAVIGATION HANDLER ===
export function handleInstructorNav(page, ...args) {
  const container = args[1] || document.getElementById('app');
  window.currentUserRole = 'instructor';

  switch (page) {
    case 'instructor-dashboard':
      renderInstructorDashboard(container);
      break;
    case 'instructor-profile':
      renderInstructorProfile(container);
      break;
    case 'instructor-checklistreview':
      renderChecklistReviewForInstructor(args[0], container);
      break;
    case 'instructor-studentprofile':
      renderStudentProfileForInstructor(args[0], container);
      break;
    default:
      renderInstructorDashboard(container);
      break;
  }
}

// --- Standalone instructor entry for direct page loads ---
window.addEventListener('DOMContentLoaded', () => {
  if (location.hash.startsWith('#instructor-')) {
    const match = location.hash.match(/^#instructor-([a-zA-Z]+)/);
    const page = match ? `instructor-${match[1]}` : 'instructor-dashboard';
    handleInstructorNav(page);
  }
});

// --- Instructor-specific popstate handling ---
window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#instructor-')) return;
  const match = location.hash.match(/^#instructor-([a-zA-Z]+)/);
  const page = match ? `instructor-${match[1]}` : 'instructor-dashboard';
  handleInstructorNav(page);
});
