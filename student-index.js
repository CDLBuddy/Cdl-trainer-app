// student-index.js

// === STUDENT MODULE BARREL IMPORTS ===
import { renderStudentDashboard } from './student/student-dashboard.js';
import { renderProfile }          from './student/profile.js';
import { renderAICoach }         from './student/ai-coach.js';
import { renderWalkthrough }     from './student/walkthrough.js';
import { renderChecklists }      from './student/checklists.js';
import { renderPracticeTests }   from './student/practice-tests.js';
import { renderTestReview }      from './student/test-review.js';
import { renderFlashcards }      from './student/flashcards.js';
import { renderTestResults }     from './student/test-results.js';
import { renderTestEngine }      from './student/test-engine.js';
import { askCDLAI }              from './student/ai-api.js';

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
    case 'dashboard':
      renderStudentDashboard(container);
      break;
    case 'profile':
      renderProfile(container);
      break;
    case 'coach':
      renderAICoach(container);
      break;
    case 'walkthrough':
      renderWalkthrough(container);
      break;
    case 'checklists':
      renderChecklists(container);
      break;
    case 'practice-tests':
      renderPracticeTests(container);
      break;
    case 'test-review':
      renderTestReview(container);
      break;
    case 'flashcards':
      renderFlashcards(container);
      break;
    case 'results':
      renderTestResults(container);
      break;
    case 'test-engine':
      renderTestEngine(container);
      break;
    default:
      renderStudentDashboard(container);
  }
}

// --- (Optional) Standalone student entry for direct page loads ---
window.addEventListener('DOMContentLoaded', () => {
  if (location.hash.startsWith('#student')) {
    const match = location.hash.match(/^#student-([a-zA-Z-]+)/);
    const page = match ? match[1] : 'dashboard';
    handleStudentNav(page);
  }
});

// --- (Optional) Student-specific popstate handling ---
window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#student')) return;
  const match = location.hash.match(/^#student-([a-zA-Z-]+)/);
  const page = match ? match[1] : 'dashboard';
  handleStudentNav(page);
});