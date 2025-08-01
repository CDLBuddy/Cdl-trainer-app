// welcome.js

import {
  initFadeInOnScroll,
  startTypewriter,
} from './ui-helpers.js';
import { handleNavigation } from './navigation.js';
import {
  getCurrentSchoolBranding,
  setCurrentSchool,
  getAllSchools,
} from './school-branding.js';

// === Renders school selector modal/dialog ===
function renderSchoolSelector(container, onSelect) {
document.querySelectorAll('.modal-overlay.school-modal').forEach(m => m.remove());

  const schools = getAllSchools();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay fade-in school-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="modal-card school-select-modal" style="max-width:410px;">
      <h2>Select Your School</h2>
      <div style="margin-bottom:1.2rem;">
        <select id="school-select-dropdown" class="school-select-dropdown" style="width:90%;padding:8px 10px;font-size:1em;">
          ${schools
            .map((s) => `<option value="${s.id}">${s.schoolName}</option>`)
            .join('')}
        </select>
      </div>
      <button class="btn primary" id="select-school-btn" style="width:100%;">Continue</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Set up selector event
  modal.querySelector('#select-school-btn').onclick = () => {
    const schoolId = modal.querySelector('#school-select-dropdown').value;
    setCurrentSchool(schoolId);
    modal.remove();
    if (onSelect) onSelect();
  };

  // Optional: close on outside click/esc
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  function escClose(e) {
    if (e.key === 'Escape') {
      modal.remove();
      window.removeEventListener('keydown', escClose);
    }
  }
  window.addEventListener('keydown', escClose);
}

// === MAIN WELCOME RENDER (ASYNC for Firestore support) ===
export async function renderWelcome(
  container = document.getElementById('app'),
  opts = {}
) {
  if (!container) return;

  // Show loading while fetching branding
  container.innerHTML = `
    <div style="text-align:center;padding:2em;">
      <span class="spinner"></span>
      <span style="display:block;margin-top:0.7em;">Loading school branding...</span>
    </div>
  `;

  // Get school branding config (await for Firestore)
  const brand = await getCurrentSchoolBranding();

  // Set CSS variable for theme color (for all CSS, e.g., buttons)
  if (brand.primaryColor)
    document.documentElement.style.setProperty(
      '--brand-primary',
      brand.primaryColor
    );

// Main Welcome Screen HTML
container.innerHTML = `
  <div class="welcome-screen" tabindex="0" aria-label="Welcome screen">
    <!-- Floating Switch School button above card -->
    <div class="switch-school-wrapper">
      <button id="switch-school-btn" class="btn outline">Switch School</button>
    </div>
    <div class="bokeh-layer" aria-hidden="true">
      <div class="bokeh-dot parallax-float" style="top:10%; left:15%; animation-delay:0s;"></div>
      <div class="bokeh-dot parallax-float" style="top:30%; left:70%; animation-delay:2s;"></div>
      <div class="bokeh-dot parallax-float" style="top:60%; left:25%; animation-delay:4s;"></div>
      <div class="bokeh-dot parallax-float" style="top:80%; left:80%; animation-delay:6s;"></div>
    </div>
    <div class="welcome-content shimmer-glow fade-in" role="main">
      <img src="${brand.logoUrl || '/default-logo.svg'}" class="welcome-logo" alt="School Logo"/>
      <h1 class="typewriter" aria-live="polite" aria-atomic="true">
        <span id="headline">${brand.schoolName || 'Your School'}</span><span class="cursor" aria-hidden="true">|</span>
      </h1>
      <p>${brand.subHeadline || ''}</p>
      <div style="display:flex; gap:1rem; flex-wrap:wrap; justify-content:center;">
        <button id="login-btn" class="btn pulse" data-nav="login" aria-label="Login">
          <span class="icon">🚀</span> Login
        </button>
        <button id="demo-btn" class="btn outline" data-nav="demo" aria-label="Request a Demo">
          <span class="icon">📞</span> Request Demo
        </button>
        <button id="contact-btn" class="btn outline" data-nav="contact" aria-label="Contact Support">
          <span class="icon">✉️</span> Contact
        </button>
      </div>
      <div class="features" tabindex="0" aria-label="Feature highlights">
        <div class="features-list" role="list">
          <div class="feat" role="listitem"><i>🧪</i><p>Practice Tests</p></div>
          <div class="feat" role="listitem"><i>✅</i><p>Checklists</p></div>
          <div class="feat" role="listitem"><i>📊</i><p>Results</p></div>
          <div class="feat" role="listitem"><i>🎧</i><p>AI Coach</p></div>
          <div class="feat" role="listitem"><i>🏫</i><p>Multi-School Support</p></div>
          <div class="feat" role="listitem"><i>🗺️</i><p>State-Specific Compliance</p></div>
          <div class="feat" role="listitem"><i>🕒</i><p>Progress Tracking</p></div>
          <div class="feat" role="listitem"><i>🔒</i><p>Secure Records</p></div>
          <div class="feat" role="listitem"><i>📈</i><p>Performance Analytics</p></div>
        </div>
      </div>
      <div class="welcome-footer">
        <small>
          Need help? <a href="mailto:${brand.contactEmail || 'support@cdltrainerapp.com'}">Email Support</a>
          &bull; <a href="${brand.website || '#'}" target="_blank" rel="noopener">Visit Our Site</a>
          &bull; <a href="https://fmcsa.dot.gov" target="_blank" rel="noopener">FMCSA ELDT Info</a>
        </small>
      </div>
    </div>
  </div>
`;

  // Only show school selector modal if no school is set
  if (!localStorage.getItem('schoolId')) {
    renderSchoolSelector(container, () => renderWelcome(container));
    return; // Don't continue rendering until school is picked
  }

  // Effects and Animation (only once per load)
  if (!container._welcomeInit) {
    initFadeInOnScroll?.();
    startTypewriter();
    container._welcomeInit = true;
  }

  // Navigation handlers
  document
    .getElementById('login-btn')
    ?.addEventListener('click', () => handleNavigation('login'));
  document
    .getElementById('demo-btn')
    ?.addEventListener('click', () => handleNavigation('demo'));
  document
    .getElementById('contact-btn')
    ?.addEventListener('click', () => handleNavigation('contact'));

  // Keyboard accessibility
  ['login-btn', 'demo-btn', 'contact-btn'].forEach((id) => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ')
        handleNavigation(e.target.getAttribute('data-nav'));
    });
  });

  // "Switch School" handler
  document
    .getElementById('switch-school-btn')
    ?.addEventListener('click', () => {
      renderSchoolSelector(container, () => renderWelcome(container));
    });

}