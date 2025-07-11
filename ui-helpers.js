// ui-helpers.js

/**
 * Wire up any [data-nav] buttons for hash‐based routing.
 * Listens on the body and captures clicks on elements with a data-nav attribute.
 * Updates window.location.hash and calls handleRoute() if defined.
 */
 alert('✨ ui-helpers.js is running');
export function setupNavigation() {
  console.log('🔧 setupNavigation() initialized');
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-nav]');
    if (!btn) return;
    e.preventDefault();

    const dest = btn.getAttribute('data-nav');
    console.log(`🔀 Navigating to hash: "${dest}"`);
    window.location.hash = dest;

    // If your router exposes a global handleRoute function, invoke it immediately:
    if (typeof window.handleRoute === 'function') {
      window.handleRoute();
    }
  });
}

/**
 * Simple non‐blocking toast.
 * Creates a transient message at the bottom of the screen.
 */
export function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 2500);
}

/**
 * Return a colored badge based on role (inferred from email).
 */
export function getRoleBadge(email) {
  let role = 'student';
  if (email.includes('instructor')) role = 'instructor';
  if (email.includes('admin'))      role = 'admin';

  const label = role.charAt(0).toUpperCase() + role.slice(1);
  return `<span class="role-badge role-${role}">${label}</span>`;
}

/**
 * Pick an "AI tip" based on today’s date index.
 */
const aiTips = [
  "Break down study sessions into 25-minute sprints (Pomodoro Technique).",
  "Review one checklist section each day to build steady progress.",
  "Practice test questions in short bursts to improve recall.",
  "Teach someone else what you’ve just learned--it cements knowledge.",
  "Set a recurring reminder to take practice tests weekly."
];

export async function getAITipOfTheDay() {
  const day = new Date().getDate();
  return aiTips[day % aiTips.length];
}

/**
 * Stub for opening your AI-Coach form / modal.
 */
export function openStudentHelpForm() {
  showToast("🎧 AI Coach is coming soon--stay tuned!");
}