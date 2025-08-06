// student/index.js

// === STUDENT MODULE BARREL IMPORTS ===
import { renderStudentDashboard } from './student-dashboard.js';
import { renderProfile } from './profile.js';
import { renderAICoach } from './ai-coach.js';
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

// === STUDENT NAVIGATION HANDLER ===
export function handleStudentNav(page, ...args) {
  const container = args[1] || document.getElementById('app');
  window.currentUserRole = 'student';

  switch (page) {
    case 'student-dashboard':
      return renderStudentDashboard(container);
    case 'student-profile':
      return renderProfile(container);
    case 'student-coach':
      return renderAICoach(container);
    case 'student-walkthrough':
      return renderWalkthrough(container);
    case 'student-checklists':
      return renderChecklists(container);
    case 'student-practice-tests':
      return renderPracticeTests(container);
    case 'student-test-review':
      return renderTestReview(container);
    case 'student-flashcards':
      return renderFlashcards(container);
    case 'student-results':
      return renderTestResults(container);
    case 'student-test-engine':
      return renderTestEngine(container);
    default:
      // Default fallback to dashboard
      return renderStudentDashboard(container);
  }
}

// --- Hash-based SPA entry for direct student page loads ---
window.addEventListener('DOMContentLoaded', () => {
  if (location.hash.startsWith('#student-')) {
    const match = location.hash.match(/^#student-([\w-]+)/);
    const page = match ? `student-${match[1]}` : 'student-dashboard';
    handleStudentNav(page);
  }
});

// --- Student-specific popstate handling (browser nav) ---
window.addEventListener('popstate', () => {
  if (!location.hash.startsWith('#student-')) return;
  const match = location.hash.match(/^#student-([\w-]+)/);
  const page = match ? `student-${match[1]}` : 'student-dashboard';
  handleStudentNav(page);
});
