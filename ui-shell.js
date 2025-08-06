// ui-shell.js

import { getCurrentSchoolBranding } from './school-branding.js';
import { handleNavigation } from './navigation.js';

// Utility: Capitalize first letter for role badge label
function roleLabel(role) {
  if (!role) return '';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// Helper: Render a single nav button (role-aware, disables if current page)
function navBtn({ label, emoji, page, currentPage }) {
  const isActive = page === currentPage;
  return `
    <button 
      class="rail-btn${isActive ? ' active' : ''}" 
      data-nav="${page}"
      aria-current="${isActive ? 'page' : 'false'}"
      ${isActive ? 'disabled tabindex="0"' : ''}
    >${emoji}<span class="label">${label}</span></button>
  `;
}

// --- ROLE-BASED NAVIGATION (pass currentPage for highlighting) ---
function getNavForRole(role, currentPage = '') {
  const btns = {
    student: [
      { label: 'Profile', emoji: '👤', page: 'student-profile' },
      { label: 'Checklist', emoji: '✅', page: 'student-checklists' },
      { label: 'Testing', emoji: '📝', page: 'student-practice-tests' },
      { label: 'Flashcards', emoji: '🗂️', page: 'student-flashcards' },
    ],
    instructor: [
      { label: 'Dashboard', emoji: '🏠', page: 'instructor-dashboard' },
      { label: 'Profile', emoji: '👤', page: 'instructor-profile' },
      { label: 'Students', emoji: '🧑‍🎓', page: 'instructor-student-list' },
      { label: 'Checklist', emoji: '📋', page: 'instructor-checklist-review' },
    ],
    admin: [
      { label: 'Dashboard', emoji: '🏠', page: 'admin-dashboard' },
      { label: 'Users', emoji: '👥', page: 'admin-users' },
      { label: 'Companies', emoji: '🏢', page: 'admin-companies' },
      { label: 'Reports', emoji: '📄', page: 'admin-reports' },
    ],
    superadmin: [
      { label: 'Dashboard', emoji: '🏆', page: 'superadmin-dashboard' },
      { label: 'Schools', emoji: '🏫', page: 'superadmin-schools' },
      { label: 'Users', emoji: '👤', page: 'superadmin-users' },
      { label: 'Compliance', emoji: '🛡️', page: 'superadmin-compliance' },
      { label: 'Billing', emoji: '💳', page: 'superadmin-billing' },
      { label: 'Settings', emoji: '⚙️', page: 'superadmin-settings' },
      { label: 'Logs', emoji: '🪵', page: 'superadmin-logs' },
    ],
  };
  return `
    <nav class="dash-rail glass-card" aria-label="Main Navigation">
      ${btns[role]?.map((btn) => navBtn({ ...btn, currentPage })).join('') || ''}
    </nav>
  `;
}

// --- MAIN SHELL RENDER ---
export async function renderAppShell({
  role = 'student',
  user = {},
  mainContent = '',
  showFooter = true,
  notifications = [],
  currentPage = '', // pass the current route/page for nav highlighting
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
    ? `<a href="${brand.website}" target="_blank" rel="noopener">${brand.website.replace(/^https?:\/\//, '')}</a>`
    : '';
  const notificationsCount = notifications.length;

  // === HEADER ===
  const header = `
    <header class="app-header glass-card" role="banner">
      <div style="display:flex;align-items:center;gap:14px;">
        <img src="${brand.logoUrl || '/default-logo.svg'}" alt="Logo" style="height:40px;width:auto;border-radius:9px;box-shadow:0 1px 6px #22115515;">
        <div>
          <div class="school-name">${brand.schoolName || 'CDL Trainer'}</div>
          <div class="school-headline">${brand.subHeadline || ''}</div>
        </div>
      </div>
      <div class="header-actions" style="display:flex;align-items:center;gap:12px;">
        <button class="icon-btn" aria-label="Help" title="Help"><span>❓</span></button>
        <button class="icon-btn" aria-label="Theme" title="Toggle dark/light mode"><span>🌓</span></button>
        <button class="icon-btn notif-btn" aria-label="Notifications" title="Notifications">
          <span>🔔</span>
          ${notificationsCount ? `<span class="notify-bubble">${notificationsCount}</span>` : ''}
        </button>
        <span class="user-info" style="display:flex;align-items:center;gap:7px;">
          <img src="${avatarUrl}" alt="Avatar" style="height:32px;width:32px;border-radius:50%;box-shadow:0 1px 6px #112;">
          <span>Hi, <strong>${name}</strong></span>
          <span class="role-badge ${role}">${roleName}</span>
        </span>
      </div>
    </header>
  `;

  // === MAIN + RAIL + DASHBOARD ===
  const main = `
    <main class="main-content screen-wrapper" role="main">
      <div class="dash-layout">
        ${getNavForRole(role, currentPage)}
        <div class="dash-metrics">${mainContent}</div>
      </div>
      <button id="ai-coach-fab" aria-label="Ask AI Coach" class="fab">
        <span style="font-size:2em;">💬</span>
      </button>
      <button id="logout-bottom-btn" class="wide-logout glass-card">
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
    <footer class="app-footer glass-card" role="contentinfo">
      <div>Contact: ${contact || '-'} &bull; Website: ${website || '-'}</div>
      <div>&copy; ${new Date().getFullYear()} CDL Trainer. Powered by CDL Buddy.</div>
      <div style="font-size:0.89em;opacity:0.69;">
        App Version 1.0.0 &bull; <a href="https://cdltrainerapp.com/help" target="_blank" class="footer-link" rel="noopener">Help Center</a>
        <a href="https://cdltrainerapp.com/docs" target="_blank" class="footer-link" rel="noopener">Docs</a>
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
      if (page && !btn.disabled) handleNavigation(page);
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

  // Notifications (placeholder)
  container.querySelector('.notif-btn')?.addEventListener('click', () => {
    alert('Notifications coming soon!');
  });

  // Robust logout (bottom button only!)
  container
    .querySelector('#logout-bottom-btn')
    ?.addEventListener('click', async () => {
      if (window.handleLogout) return window.handleLogout();
      localStorage.clear();
      location.reload();
    });
}
