// ui-shell.js

import { getCurrentSchoolBranding } from './school-branding.js';
import { handleNavigation } from './navigation.js';

// Utility for role label
function roleLabel(role) {
  return (role || 'student').replace(/^\w/, (l) => l.toUpperCase());
}

// Role-based nav (expand as needed for all roles)
function getNavForRole(role) {
  if (role === 'student') {
    return `
      <nav class="dash-rail glass-card" style="padding:1.2em 0 1em 0;">
        <button class="rail-btn profile" data-nav="student-profile" aria-label="Profile">👤<span class="label">Profile</span></button>
        <button class="rail-btn checklist" data-nav="student-checklists" aria-label="Checklist">✅<span class="label">Checklist</span></button>
        <button class="rail-btn testing" data-nav="student-practice-tests" aria-label="Testing">📝<span class="label">Testing</span></button>
        <button class="rail-btn flashcards" data-nav="student-flashcards" aria-label="Flashcards">🗂️<span class="label">Flashcards</span></button>
        <button class="rail-btn logout" data-nav="logout" aria-label="Logout">🚪<span class="label">Logout</span></button>
      </nav>
    `;
  }
  if (role === 'instructor') {
    return `
      <nav class="dash-rail glass-card" style="padding:1.2em 0 1em 0;">
        <button class="rail-btn dashboard" data-nav="instructor-dashboard" aria-label="Dashboard">🏠<span class="label">Dashboard</span></button>
        <button class="rail-btn profile" data-nav="instructor-profile" aria-label="Profile">👤<span class="label">Profile</span></button>
        <button class="rail-btn students" data-nav="instructor-student-list" aria-label="Students">🧑‍🎓<span class="label">Students</span></button>
        <button class="rail-btn checklist-review" data-nav="instructor-checklist-review" aria-label="Checklist Review">📋<span class="label">Checklist</span></button>
        <button class="rail-btn logout" data-nav="logout" aria-label="Logout">🚪<span class="label">Logout</span></button>
      </nav>
    `;
  }
  // TODO: Add admin, superadmin navs as needed
  return '';
}

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

  // Header
  const header = `
    <header class="app-header glass-card" style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 1.2rem 0.5rem 0.9rem;min-height:68px;">
      <div style="display:flex;align-items:center;gap:14px;">
        <img src="${brand.logoUrl || '/default-logo.svg'}" alt="Logo" style="height:40px;width:auto;border-radius:9px;box-shadow:0 1px 6px #22115515;">
        <div>
          <div class="school-name" style="font-weight:700;font-size:1.11em;letter-spacing:.03em;">${brand.schoolName || 'CDL Trainer'}</div>
          <div class="school-headline" style="font-size:.93em;color:#97b4c4;">${brand.subHeadline || ''}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:16px;">
        <button class="icon-btn" aria-label="Help" title="Help">
          <span style="font-size:1.22em;">❓</span>
        </button>
        <button class="icon-btn" aria-label="Theme" title="Toggle dark/light mode">
          <span style="font-size:1.18em;">🌓</span>
        </button>
        <button class="icon-btn notif-btn" aria-label="Notifications" title="Notifications">
          <span style="font-size:1.18em;">🔔</span>
          ${
            notificationsCount
              ? `<span class="notify-bubble">${notificationsCount}</span>`
              : ''
          }
        </button>
        <span class="user-info" style="display:flex;align-items:center;gap:9px;">
          <img src="${avatarUrl}" alt="Avatar" style="height:36px;width:36px;border-radius:50%;box-shadow:0 1.5px 8px #112;">
          <span>Hi, <strong>${name}</strong></span>
          <span class="role-badge ${role}" style="margin-left:6px;">${roleName}</span>
        </span>
        <button class="btn btn-sm" aria-label="Logout" data-nav="logout">Logout</button>
      </div>
    </header>
  `;

  // Main/rail/content
  const main = `
    <main class="main-content screen-wrapper" style="padding:2.5vw 0.8em 4.5vw 0.8em;max-width:1200px;margin:0 auto;">
      <div class="dash-layout">
        ${getNavForRole(role)}
        <div class="dash-metrics">${mainContent}</div>
      </div>
      <button id="ai-coach-fab" aria-label="Ask AI Coach" class="fab" style="position:fixed;bottom:70px;right:22px;z-index:999;">
        <span style="font-size:2em;">💬</span>
      </button>
    </main>
  `;

  // Footer
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

  // --- Event Handlers ---
  // Nav/rail
  container.querySelectorAll('[data-nav]').forEach((btn) =>
    btn.addEventListener('click', async (e) => {
      const page = btn.getAttribute('data-nav');
      if (page === 'logout') {
        // Call global logout if present
        if (window.handleLogout) return window.handleLogout();
        // Fallback: remove storage, reload
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
  // Help
  container
    .querySelector('.icon-btn[aria-label="Help"]')
    ?.addEventListener('click', () =>
      window.open('https://cdltrainerapp.com/help', '_blank')
    );
  // Notifications (placeholder, real logic TBD)
  container
    .querySelector('.notif-btn')
    ?.addEventListener('click', () => {
      alert('Notifications coming soon!');
    });
}