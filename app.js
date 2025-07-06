// ==== Core SPA Layout ====

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  renderPage('home');
});

// ==== Page Routing ====

function setupNavigation() {
  const navItems = document.querySelectorAll('[data-nav]');
  navItems.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = e.target.getAttribute('data-nav');
      renderPage(page);
    });
  });
}

function renderPage(page) {
  const app = document.getElementById('app');
  app.innerHTML = ''; // Clear page

  switch (page) {
    case 'walkthrough':
      renderWalkthrough(app);
      break;
    case 'tests':
      renderPracticeTests(app);
      break;
    case 'coach':
      renderAICoach(app);
      break;
    default:
      renderHome(app);
  }
}

// ==== Home Page ====

function renderHome(container) {
  container.innerHTML = `
    <div class="card">
      <h2>Welcome to CDL Trainer</h2>
      <p>Your complete FMCSA-compliant training platform.</p>
      <button data-nav="walkthrough">📋 Walkthrough</button>
      <button data-nav="tests">📝 Practice Tests</button>
      <button data-nav="coach">🎧 AI Coach</button>
      <h3>Pre-Trip Walkthrough</h3>
      <p>Coming soon: full interactive vehicle walkthroughs based on ELDT.</p>
    </div>
  `;
  setupNavigation(); // Re-attach button listeners
}

// ==== Walkthrough Page ====

function renderWalkthrough(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🧭 ELDT Walkthrough</h2>
      <p>Step-by-step CDL training walkthroughs.</p>
      <ul id="walkthrough-list">
        <li>✅ Identify vehicle type</li>
        <li>🛠️ Check lights, tires, fluids...</li>
        <li>📄 Match to FMCSA checklist...</li>
      </ul>
      <button data-nav="home">⬅️ Back to Home</button>
    </div>
  `;
  setupNavigation();
}

// ==== Practice Tests Page ====

function renderPracticeTests(container) {
  container.innerHTML = `
    <div class="card">
      <h2>📝 Practice Tests</h2>
      <p>Get ready for the CDL with realistic test simulations.</p>
      <ul>
        <li>📘 General Knowledge (coming soon)</li>
        <li>💨 Air Brakes (coming soon)</li>
        <li>🚛 Combination Vehicles (coming soon)</li>
      </ul>
      <button data-nav="home">⬅️ Back to Home</button>
    </div>
  `;
  setupNavigation();
}

// ==== AI Coach Page ====

function renderAICoach(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🎧 AI Coach</h2>
      <p>Ask questions, get guidance, and prep smarter.</p>
      <p><em>Coming soon: AI chat assistant powered by OpenAI.</em></p>
      <button data-nav="home">⬅️ Back to Home</button>
    </div>
  `;
  setupNavigation();
}