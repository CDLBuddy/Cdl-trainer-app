// student/index.js

import { renderStudentDashboard } from './student-dashboard.js';
import { renderProfile }         from './profile.js';
import { renderAICoach }         from './ai-coach.js';
import { renderWalkthrough }     from './walkthrough.js';
import { renderChecklists }      from './checklists.js';
import { renderPracticeTests, renderTestReview } from './practice-tests.js';
import { renderFlashcards }      from './flashcards.js';
import { renderTestResults }     from './test-results.js';
import { renderTestEngine }      from './test-engine.js';

// Consistent exports for navigation.js
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

  // Alias for navigation compatibility:
  renderStudentDashboard as renderDashboard,
};