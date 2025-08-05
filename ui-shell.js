// ui-shell.js

import { getCurrentSchoolBranding } from './school-branding.js';
import { handleNavigation } from './navigation.js';

// Helper: Format role for badge/tag
function roleLabel(role) {
  if (!role) return 'Student';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// === ROLE-BASED NAV GENERATOR ===
function getNavForRole(role) {
  switch (role) {
    case 'student':
      return `
        <nav class="dash-rail glass-card">
          <button class="rail-btn profile" data-nav="student-profile" aria-label="Profile">
            <span class="icon">👤</span><span class="label">Profile</span>
          </button>
          <button class="rail-btn checklist" data-nav="student-checklists" aria-label="Checklist">
            <span class="icon">✅</span><span class="label">Checklist</span>
          </button>
          <button class="rail-btn testing" data-nav="student-practice-tests" aria-label="Testing">
            <span class="icon">📝</span><span class="label">Testing</span>
          </button>
          <button class="rail-btn flashcards" data-nav="student-flashcards" aria-label="Flashcards">
            <span class="icon">🗂️</span><span class="label">Flashcards</span>
          </button>
          <button class="rail-btn logout" data-nav="logout" aria-label="Logout">
            <span class="icon">🚪</span><span class="label">Logout</span>
          </button>
        </nav>
      `;
    case 'instructor':
      return `
        <nav class="dash-rail glass-card">
          <button class="rail-btn dashboard" data-nav="instructor-dashboard" aria-label="Dashboard">
            <span class="icon">🏠</span><span class="label">Dashboard</span>
          </button>
          <button class="rail-btn profile" data-nav="instructor-profile" aria-label="Profile">
            <span class="icon">👤</span><span class="label">Profile</span>
          </button>
          <button class="rail-btn students" data-nav="instructor-student-list" aria-label="Students">
            <span class="icon">🧑‍🎓</span><span class="label">Students</span>
          </button>
          <button class="rail-btn checklist-review" data-nav="instructor-checklist-review" aria-label="Checklist Review">
            <span class="icon">📋</span><span class="label">Checklist</span>
          </button>
          <button class="rail-btn logout" data-nav="logout" aria-label="Logout">
            <span class="icon">🚪</span><span class="label">Logout</span>
          </button>
        </nav>
      `;
    // TODO: Expand for admin/superadmin when ready
    default:
      return '';
  }
}

// === MAIN APP SHELL RENDERER ===
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
        <button class="btn btn-sm" aria-label="Logout" data-nav="logout">Logout</button>
      </div>
    </header>
  `;

  // === MAIN: NAV + METRICS/CONTENT ===
  const main = `
    <main class="main-content screen-wrapper" style="padding:3vw 0.9em 5vw 0.9em;max-width:1200px;margin:0 auto;">
      <div class="dash-layout" style="display:flex;gap:2rem;">
        <div style="flex-shrink:0;">${getNavForRole(role)}</div>
        <div class="dash-metrics" style="flex:1;min-width:0;">${mainContent}</div>
      </div>
      <button id="ai-coach-fab" aria-label="Ask AI Coach" class="fab" style="position:fixed;bottom:70px;right:18px;z-index:999;">
        <span style="font-size:2em;">💬</span>
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
          App Version 1.0.0 &bull;
          <a href="https://cdltrainerapp.com/help" target="_blank" class="footer-link">Help Center</a>
          &bull;
          <a href="https://cdltrainerapp.com/docs" target="_blank" class="footer-link">Docs</a>
        </div>
      </footer>
    `
    : '';

  // === RENDER TO DOM ===
  container.innerHTML = `${header}${main}${footer}`;

  // === EVENT HANDLERS ===
  // Nav/rail buttons
  container.querySelectorAll('[data-nav]').forEach((btn) =>
    btn.addEventListener('click', async (e) => {
      const page = btn.getAttribute('data-nav');
      if (page === 'logout') {
        if (window.handleLogout) return window.handleLogout();
        localStorage.removeItem('fullName');
        localStorage.removeItem('userRole');
        location.reload();
      } else if (page) {
        handleNavigation(page);
      }
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
  // Help button
  container
    .querySelector('.icon-btn[aria-label="Help"]')
    ?.addEventListener('click', () =>
      window.open('https://cdltrainerapp.com/help', '_blank')
    );
  // Notifications (demo)
  container
    .querySelector('.notif-btn')
    ?.addEventListener('click', () => {
      alert('Notifications coming soon!');
    });
}