// ui-shell.js

import { getCurrentSchoolBranding } from './school-branding.js';
import { handleNavigation } from './navigation.js';

// Utility: Capitalize first letter for role label
function roleLabel(role) {
  if (!role) return '';
  return role[0].toUpperCase() + role.slice(1);
}

// --- ROLE-BASED NAVIGATION (no nav logout; only at bottom) ---
function getNavForRole(role) {
  switch (role) {
    case 'student':
      return `
        <nav class="dash-rail glass-card">
          <button class="rail-btn profile" data-nav="student-profile" aria-label="Profile">👤<span class="label">Profile</span></button>
          <button class="rail-btn checklist" data-nav="student-checklists" aria-label="Checklist">✅<span class="label">Checklist</span></button>
          <button class="rail-btn testing" data-nav="student-practice-tests" aria-label="Testing">📝<span class="label">Testing</span></button>
          <button class="rail-btn flashcards" data-nav="student-flashcards" aria-label="Flashcards">🗂️<span class="label">Flashcards</span></button>
        </nav>
      `;
    case 'instructor':
      return `
        <nav class="dash-rail glass-card">
          <button class="rail-btn dashboard" data-nav="instructor-dashboard" aria-label="Dashboard">🏠<span class="label">Dashboard</span></button>
          <button class="rail-btn profile" data-nav="instructor-profile" aria-label="Profile">👤<span class="label">Profile</span></button>
          <button class="rail-btn students" data-nav="instructor-student-list" aria-label="Students">🧑‍🎓<span class="label">Students</span></button>
          <button class="rail-btn checklist-review" data-nav="instructor-checklist-review" aria-label="Checklist Review">📋<span class="label">Checklist</span></button>
        </nav>
      `;
    case 'admin':
      return `
        <nav class="dash-rail glass-card">
          <button class="rail-btn dashboard" data-nav="admin-dashboard" aria-label="Dashboard">🏠<span class="label">Dashboard</span></button>
          <button class="rail-btn users" data-nav="admin-users" aria-label="Users">👥<span class="label">Users</span></button>
          <button class="rail-btn companies" data-nav="admin-companies" aria-label="Companies">🏢<span class="label">Companies</span></button>
          <button class="rail-btn reports" data-nav="admin-reports" aria-label="Reports">📄<span class="label">Reports</span></button>
        </nav>
      `;
    case 'superadmin':
      return `
        <nav class="dash-rail glass-card">
          <button class="rail-btn dashboard" data-nav="superadmin-dashboard" aria-label="Dashboard">🏆<span class="label">Dashboard</span></button>
          <button class="rail-btn schools" data-nav="superadmin-schools" aria-label="Manage Schools">🏫<span class="label">Schools</span></button>
          <button class="rail-btn users" data-nav="superadmin-users" aria-label="Manage Users">👤<span class="label">Users</span></button>
          <button class="rail-btn compliance" data-nav="superadmin-compliance" aria-label="Compliance">🛡️<span class="label">Compliance</span></button>
          <button class="rail-btn billing" data-nav="superadmin-billing" aria-label="Billing">💳<span class="label">Billing</span></button>
          <button class="rail-btn settings" data-nav="superadmin-settings" aria-label="Settings">⚙️<span class="label">Settings</span></button>
          <button class="rail-btn logs" data-nav="superadmin-logs" aria-label="Logs">🪵<span class="label">Logs</span></button>
        </nav>
      `;
    default:
      return '';
  }
}

// --- MAIN SHELL RENDER ---
export async function renderAppShell({
  role = 'student',
  user = {},
  mainContent = '',
  showFooter = true,
  notifications = [],
}) {
  const container = document.getElementById('app');
  if (!container) return;

  const brand = await getCurrentSchoolBranding();
  const name = user.name || localStorage.getItem('fullName') || 'CDL User';
  const avatarUrl = user.avatarUrl || '/default-avatar.svg';
  const roleName = roleLabel(role);
  const contact = brand.contactEmail
    ? `<a href="mailto:${brand.contactEmail}">${brand.contactEmail}</a>`
    : '';
  const website = brand.website
    ? `<a href="${brand.website}" target="_blank">${brand.website.replace(/^https?:\/\//, '')}</a>`
    : '';
  const notificationsCount = notifications.length;

  // === HEADER ===
  const header = `
    <header class="app-header glass-card" style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 1.2rem;min-height:64px;">
      <div style="display:flex;align-items:center;gap:14px;">
        <img src="${brand.logoUrl || '/default-logo.svg'}" alt="Logo" style="height:40px;width:auto;border-radius:9px;box-shadow:0 1px 6px #22115515;">
        <div>
          <div class="school-name" style="font-weight:700;font-size:1.07em;letter-spacing:.03em;">${brand.schoolName || 'CDL Trainer'}</div>
          <div class="school-headline" style="font-size:.93em;color:#97b4c4;">${brand.subHeadline || ''}</div>
        </div>
      </div>
      <div class="header-actions" style="display:flex;align-items:center;gap:12px;">
        <button class="icon-btn" aria-label="Help" title="Help"><span>❓</span></button>
        <button class="icon-btn" aria-label="Theme" title="Toggle dark/light mode"><span>🌓</span></button>
        <button class="icon-btn notif-btn" aria-label="Notifications" title="Notifications">
          <span>🔔</span>
          ${
            notificationsCount
              ? `<span class="notify-bubble">${notificationsCount}</span>`
              : ''
          }
        </button>
        <span class="user-info" style="display:flex;align-items:center;gap:7px;">
          <img src="${avatarUrl}" alt="Avatar" style="height:32px;width:32px;border-radius:50%;box-shadow:0 1px 6px #112;">
          <span>Hi, <strong>${name}</strong></span>
          <span class="role-badge ${role}" style="margin-left:4px;">${roleName}</span>
        </span>
      </div>
    </header>
  `;

  // === MAIN + RAIL + DASHBOARD ===
  const main = `
    <main class="main-content screen-wrapper" style="padding:2.5vw 0.8em 4.5vw 0.8em;max-width:1200px;margin:0 auto;">
      <div class="dash-layout">
        ${getNavForRole(role)}
        <div class="dash-metrics">${mainContent}</div>
      </div>
      <button id="ai-coach-fab" aria-label="Ask AI Coach" class="fab" style="position:fixed;bottom:70px;right:22px;z-index:999;">
        <span style="font-size:2em;">💬</span>
      </button>
      <button id="logout-bottom-btn" class="wide-logout glass-card" style="display:block;margin:48px auto 0 auto;max-width:440px;width:75%;min-width:180px;padding:0.8em 0.5em 0.7em 0.5em;font-size:1.09em;box-shadow:0 2px 14px #112;letter-spacing:.01em;position:relative;">
        <span style="display:flex;align-items:center;justify-content:center;gap:10px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="12" height="16" rx="2" stroke="#ff8080" stroke-width="2"/>
            <path d="M17 15l4-3-4-3m4 3H10" stroke="#ff8080" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="label" style="font-weight:600;">Logout</span>
        </span>
      </button>
    </main>
  `;

  // === FOOTER ===
  const footer = showFooter
    ? `
    <footer class="app-footer glass-card" style="margin:40px auto 16px auto;padding:0.7em 1.2em;font-size:1.03em;max-width:600px;display:flex;flex-direction:column;align-items:center;gap:4px;box-shadow:0 4px 24px #1113;">
      <div style="margin-bottom:3px;">
        Contact: ${contact || '-'} &bull; Website: ${website || '-'}
      </div>
      <div style="font-size:0.97em;">
        &copy; ${new Date().getFullYear()} CDL Trainer. Powered by CDL Buddy.
      </div>
      <div style="font-size:0.89em;opacity:0.69;">
        App Version 1.0.0 &bull; <a href="https://cdltrainerapp.com/help" target="_blank" class="footer-link">Help Center</a>
        <a href="https://cdltrainerapp.com/docs" target="_blank" class="footer-link">Docs</a>
      </div>
    </footer>
  `
    : '';

  container.innerHTML = `${header}${main}${footer}`;

  // --- EVENT HANDLERS ---
  // SPA navigation for nav/rail
  container.querySelectorAll('[data-nav]').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      const page = btn.getAttribute('data-nav');
      if (page) handleNavigation(page);
    })
  );
  // AI Coach FAB
  container
    .querySelector('#ai-coach-fab')
    ?.addEventListener('click', () => handleNavigation(`${role}-coach`));
  // Theme toggle
  container
    .querySelector('.icon-btn[aria-label="Theme"]')
    ?.addEventListener('click', () =>
      document.body.classList.toggle('dark-mode')
    );
  // Help
  container
    .querySelector('.icon-btn[aria-label="Help"]')
    ?.addEventListener('click', () =>
      window.open('https://cdltrainerapp.com/help', '_blank')
    );
  // Notifications (placeholder, real logic TBD)
  container.querySelector('.notif-btn')?.addEventListener('click', () => {
    alert('Notifications coming soon!');
  });

  // Robust logout (bottom button only!)
  container
    .querySelector('#logout-bottom-btn')
    ?.addEventListener('click', async () => {
      if (window.handleLogout) return window.handleLogout();
      // fallback:
      localStorage.clear();
      location.reload();
    });
}
