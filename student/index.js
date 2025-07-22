// student/index.js
// Barrel export: import all student-facing page renderers from one file

export { renderDashboard }      from './student-dashboard.js';
export { renderProfile }        from './profile.js';
export { renderChecklists }     from './checklists.js';
export { renderPracticeTests, renderTestReview } from './practice-tests.js';
export { renderFlashcards }     from './flashcards.js';
export { renderWalkthrough }    from './walkthrough.js';
export { renderAICoach }        from './ai-coach.js';
export { renderTestResults }    from './test-results.js';