// instructor/index.js

// === INSTRUCTOR MODULE BARREL IMPORTS ===
import { renderInstructorDashboard } from './instructor-dashboard.js';
import { renderInstructorProfile } from './instructor-profile.js';
import { renderChecklistReviewForInstructor } from './checklist-review-for-instructor.js';
import { renderStudentProfileForInstructor } from './student-profile-for-instructor.js';

// === BARREL EXPORTS ===
export {
  renderInstructorDashboard,
  renderInstructorProfile,
  renderChecklistReviewForInstructor,
  renderStudentProfileForInstructor,
};

// Alias for navigation compatibility
export { renderInstructorDashboard as renderDashboard };

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
    case 'instructor-checklist-review':
      renderChecklistReviewForInstructor(container);
      break;
    case 'instructor-student-profile':
      renderStudentProfileForInstructor(container);
      break;
    default:
      renderInstructorDashboard(container);
  }
}

// --- Standalone instructor entry for direct page loads ---
window.addEventListener('DOMContentLoaded', () => {
  if (location.hash.startsWith('#instructor-')) {
    const match = location.hash.match(/^#instructor-([a-zA-Z-]+)/);
    const page = match ? `instructor-${match[1]}` : 'instructor-dashboard';
    handleInstructorNav(page);
  }
});

// --- Instructor-specific popstate handling ---
window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#instructor-')) return;
  const match = location.hash.match(/^#instructor-([a-zA-Z-]+)/);
  const page = match ? `instructor-${match[1]}` : 'instructor-dashboard';
  handleInstructorNav(page);
});
