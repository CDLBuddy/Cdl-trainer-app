// student/index.js

// === STUDENT MODULE BARREL IMPORTS ===
import { renderStudentDashboard } from './student-dashboard.js';
import { renderProfile } from './profile.js';
import { renderAICoach } from './a-i-coach.js';
import { renderWalkthrough } from './walkthrough.js';
import { renderChecklists } from './checklists.js';
import { renderPracticeTests } from './practice-tests.js';
import { renderTestReview } from './test-review.js';
import { renderFlashcards } from './flashcards.js';
import { renderTestResults } from './test-results.js';
import { renderTestEngine } from './test-engine.js';
import { askCDLAI } from './ai-api.js';

// === BARREL EXPORTS ===
export {
  renderStudentDashboard,
  renderProfile,
  renderAICoach,
  renderWalkthrough,
  renderChecklists,
  renderPracticeTests,
  renderTestReview,
  renderFlashcards,
  renderTestResults,
  renderTestEngine,
  askCDLAI,
};

// Alias for navigation compatibility
export { renderStudentDashboard as renderDashboard };

// === STUDENT NAVIGATION HANDLER ===
export function handleStudentNav(page, ...args) {
  const container = args[1] || document.getElementById('app');
  window.currentUserRole = 'student';

  switch (page) {
    case 'student-dashboard':
      renderStudentDashboard(container);
      break;
    case 'student-profile':
      renderProfile(container);
      break;
    case 'student-coach':
      renderAICoach(container);
      break;
    case 'student-walkthrough':
      renderWalkthrough(container);
      break;
    case 'student-checklists':
      renderChecklists(container);
      break;
    case 'student-practice-tests':
      renderPracticeTests(container);
      break;
    case 'student-test-review':
      renderTestReview(container);
      break;
    case 'student-flashcards':
      renderFlashcards(container);
      break;
    case 'student-results':
      renderTestResults(container);
      break;
    case 'student-test-engine':
      renderTestEngine(container);
      break;
    default:
      renderStudentDashboard(container);
  }
}

// --- Standalone student entry for direct page loads ---
window.addEventListener('DOMContentLoaded', () => {
  if (location.hash.startsWith('#student-')) {
    const match = location.hash.match(/^#student-([a-zA-Z-]+)/);
    const page = match ? `student-${match[1]}` : 'student-dashboard';
    handleStudentNav(page);
  }
});

// --- Student-specific popstate handling ---
window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#student-')) return;
  const match = location.hash.match(/^#student-([a-zA-Z-]+)/);
  const page = match ? `student-${match[1]}` : 'student-dashboard';
  handleStudentNav(page);
});
