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

// === INSTRUCTOR NAVIGATION HANDLER ===
export function handleInstructorNav(page, ...args) {
  const container = args[1] || document.getElementById('app');
  window.currentUserRole = 'instructor';

  // Extract param if hash includes a colon, e.g., #instructor-checklist-review:student@email.com
  let param = null;
  if (typeof page === 'string' && page.includes(':')) {
    [page, param] = page.split(':');
  }

  switch (page) {
    case 'instructor-dashboard':
      return renderInstructorDashboard(container);
    case 'instructor-profile':
      return renderInstructorProfile(container);
    case 'instructor-checklist-review':
      return renderChecklistReviewForInstructor(param, container);
    case 'instructor-student-profile':
      return renderStudentProfileForInstructor(param, container);
    default:
      // Fallback to dashboard
      return renderInstructorDashboard(container);
  }
}

// --- Hash-based SPA entry for direct instructor page loads ---
window.addEventListener('DOMContentLoaded', () => {
  if (location.hash.startsWith('#instructor-')) {
    // Support :param, e.g. #instructor-checklist-review:student@email.com
    const match = location.hash.match(/^#(instructor-[a-zA-Z-]+)(?::(.+))?/);
    const page =
      match && match[1]
        ? match[1] + (match[2] ? ':' + match[2] : '')
        : 'instructor-dashboard';
    handleInstructorNav(page);
  }
});

// --- Instructor-specific popstate handling ---
window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#instructor-')) return;
  const match = location.hash.match(/^#(instructor-[a-zA-Z-]+)(?::(.+))?/);
  const page =
    match && match[1]
      ? match[1] + (match[2] ? ':' + match[2] : '')
      : 'instructor-dashboard';
  handleInstructorNav(page);
});
