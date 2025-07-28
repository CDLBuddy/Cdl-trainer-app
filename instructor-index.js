// instructor-index.js

// === INSTRUCTOR MODULE BARREL EXPORTS ===
export { renderInstructorDashboard } from './instructor/dashboard-instructor.js';
export { renderInstructorProfile } from './instructor/instructor-profile.js';
export { renderChecklistReviewForInstructor } from './instructor/instructor-checklist.js';
export { renderStudentProfileForInstructor } from './instructor/student-profile.js';

// === INSTRUCTOR NAVIGATION HANDLER ===
export function handleInstructorNav(page, ...args) {
  const container = args[1] || document.getElementById('app');
  window.currentUserRole = 'instructor';

  switch (page?.toLowerCase()) {
    case 'dashboard':
      renderInstructorDashboard(container);
      break;
    case 'profile':
      renderInstructorProfile(container);
      break;
    case 'checklistreview':
      renderChecklistReviewForInstructor(args[0], container);
      break;
    case 'studentprofile':
      renderStudentProfileForInstructor(args[0], container);
      break;
    default:
      renderInstructorDashboard(container);
      break;
  }
}

// --- Standalone hash route support ---
window.addEventListener('DOMContentLoaded', () => {
  if (location.hash.startsWith('#instructor')) {
    const match = location.hash.match(/^#instructor-([a-zA-Z]+)/);
    const page = match ? match[1] : 'dashboard';
    handleInstructorNav(page);
  }
});

window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#instructor')) return;
  const match = location.hash.match(/^#instructor-([a-zA-Z]+)/);
  const page = match ? match[1] : 'dashboard';
  handleInstructorNav(page);
});
