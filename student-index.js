// student-index.js

// === STUDENT MODULE BARREL EXPORTS ===
export { renderStudentDashboard } from './student-dashboard.js';
export { renderProfile } from './profile.js';
export { renderAICoach } from './ai-coach.js';
export { renderWalkthrough } from './walkthrough.js';
export { renderChecklists } from './checklists.js';
export { renderPracticeTests } from './practice-tests.js';
export { renderTestReview } from './test-review.js';
export { renderFlashcards } from './flashcards.js';
export { renderTestResults } from './test-results.js';
export { renderTestEngine } from './test-engine.js';
export { askCDLAI } from './ai-api.js';

// Alias for navigation compatibility
export { renderStudentDashboard as renderDashboard };

// === STUDENT NAVIGATION HANDLER ===
export function handleStudentNav(page, ...args) {
  const container = args[1] || document.getElementById("app");
  window.currentUserRole = "student";

  switch (page) {
    case "dashboard":
      renderStudentDashboard(container);
      break;
    case "profile":
      renderProfile(container);
      break;
    case "coach":
      renderAICoach(container);
      break;
    case "walkthrough":
      renderWalkthrough(container);
      break;
    case "checklists":
      renderChecklists(container);
      break;
    case "practice-tests":
      renderPracticeTests(container);
      break;
    case "test-review":
      renderTestReview(container);
      break;
    case "flashcards":
      renderFlashcards(container);
      break;
    case "results":
      renderTestResults(container);
      break;
    case "test-engine":
      renderTestEngine(container);
      break;
    default:
      renderStudentDashboard(container);
  }
}

// --- (Optional) Standalone student entry for direct page loads ---
window.addEventListener("DOMContentLoaded", () => {
  if (location.hash.startsWith("#student")) {
    const match = location.hash.match(/^#student-([a-zA-Z-]+)/);
    const page = match ? match[1] : "dashboard";
    handleStudentNav(page);
  }
});

// --- (Optional) Student-specific popstate handling ---
window.addEventListener("popstate", () => {
  if (!location.hash.startsWith("#student")) return;
  const match = location.hash.match(/^#student-([a-zA-Z-]+)/);
  const page = match ? match[1] : "dashboard";
  handleStudentNav(page);
});
