// instructor/index.js

import { renderInstructorDashboard } from './dashboard-instructor.js';
import { renderInstructorProfile } from './instructor-profile.js';
import { renderChecklistReviewForInstructor } from './instructor-checklist.js';
import { setupNavigation } from '../ui-helpers.js';

// Exports for barrel-style import in navigation.js
export {
  renderInstructorDashboard,
  renderInstructorProfile,
  renderChecklistReviewForInstructor,
};
// Simple navigation handling -- call with a string
export function handleInstructorNav(page, ...args) {
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
    default:
      renderInstructorDashboard(container);
  }

  setupNavigation(); // Set up nav for instructor pages (if using [data-nav])
}

// Optionally, auto-load dashboard on DOMContentLoaded (only if direct nav, not from app.js)
if (!window.appHasBooted) {
  window.addEventListener('DOMContentLoaded', () => {
    handleInstructorNav('dashboard');
  });
  window.addEventListener('popstate', () => {
    const page = location.hash.replace('#', '') || 'dashboard';
    handleInstructorNav(page);
  });
}
