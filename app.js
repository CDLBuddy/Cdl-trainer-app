// app.js

import { setupNavigation, showToast } from './ui-helpers.js';

/**
 * Very basic "Welcome" screen render.
 */
function renderWelcome() {
  const container = document.getElementById('app');
  container.innerHTML = `
    <div class="card">
      <h1>Welcome to CDL Trainer</h1>
      <p>Your companion for mastering your Commercial Driver’s License.</p>
      <button id="startBtn">Get Started</button>
    </div>
  `;

  document.getElementById('startBtn').addEventListener('click', () => {
    showToast('Next up: Login screen (coming soon!)');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  renderWelcome();
});