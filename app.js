// Starter CDL Trainer App Script

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  app.innerHTML = `
    <section class="hero">
      <h2>Welcome to CDL Trainer</h2>
      <p>Your complete FMCSA-compliant training platform.</p>
      <div class="menu">
        <button onclick="loadSection('walkthrough')">📋 Walkthrough</button>
        <button onclick="loadSection('quizzes')">📝 Practice Tests</button>
        <button onclick="loadSection('coach')">🎧 AI Coach</button>
      </div>
      <div id="content-area" class="content-area"></div>
    </section>
  `;
});

function loadSection(section) {
  const content = document.getElementById("content-area");

  switch (section) {
    case "walkthrough":
      content.innerHTML = `<h3>Pre-Trip Walkthrough</h3><p>Coming soon: full interactive vehicle walkthroughs based on ELDT.</p>`;
      break;
    case "quizzes":
      content.innerHTML = `<h3>Practice Quizzes</h3><p>Coming soon: General Knowledge, Air Brakes, and Combination quizzes.</p>`;
      break;
    case "coach":
      content.innerHTML = `<h3>AI CDL Coach</h3><p>Coming soon: your personal FMCSA-trained voice assistant.</p>`;
      break;
    default:
      content.innerHTML = `<p>Select a module above to begin.</p>`;
  }
}