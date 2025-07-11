// ui-helpers.js

/**
 * Wire up any [data-nav] buttons to call setupNavigation()
 * (you already have this stubbed out for route-based rendering).
 */
export function setupNavigation() {
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-nav]');
    if (!btn) return;
    e.preventDefault();
    const dest = btn.getAttribute('data-nav');
    window.location.hash = dest;
    // you’ll hook in your actual router elsewhere
  });
}

/**
 * Simple toast using native alert for now.
 */
export function showToast(msg) {
  alert(msg);
}

/**
 * Return a little colored badge based on role.
 * Here we infer role from email prefix, but you can
 * swap in your real role-lookup later.
 */
export function getRoleBadge(email) {
  let role = 'student';
  if (email.includes('instructor')) role = 'instructor';
  if (email.includes('admin'))      role = 'admin';

  const label = role.charAt(0).toUpperCase() + role.slice(1);
  return `<span class="role-badge role-${role}">${label}</span>`;
}

/**
 * Pick an "AI tip" based on today’s date.
 * Replace the array or logic with a dynamic source if you like.
 */
const aiTips = [
  "Break down your study sessions into 25-minute sprints (Pomodoro Technique).",
  "Review one checklist section each day to build steady progress.",
  "Practice test questions in short bursts to improve recall.",
  "Teach someone else what you’ve just learned--it cements your knowledge.",
  "Set a recurring reminder to take practice tests weekly."
];

export async function getAITipOfTheDay() {
  const day = new Date().getDate();
  return aiTips[ day % aiTips.length ];
}

/**
 * Stub for opening your AI-Coach modal/form.
 * Replace with your actual modal-showing logic.
 */
export function openStudentHelpForm() {
  showToast("🎧 AI Coach is coming soon--stay tuned!");
}