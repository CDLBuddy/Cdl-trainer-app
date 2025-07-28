// student/student-dashboard.js

import { db, auth } from '../firebase.js';
import {
  showToast,
  setupNavigation,
  showLatestUpdate,
  getRandomAITip,
  getNextChecklistAlert,
} from '../ui-helpers.js';

import { signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  collection,
  query,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

import { renderProfile } from './profile.js';
import { renderAICoach } from './ai-coach.js';
import { renderWalkthrough } from './walkthrough.js';
import { renderChecklists } from './checklists.js';
import { renderPracticeTests } from './practice-tests.js';
import { renderFlashcards } from './flashcards.js';

// ========== MAIN DASHBOARD RENDERER ==========
export async function renderStudentDashboard(container = document.getElementById('app')) {
  if (!container) return;

  // --- Always resolve user (never cache old) ---
  const currentUserEmail =
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    (auth.currentUser && auth.currentUser.email) ||
    null;

  if (!currentUserEmail) {
    showToast('No user found. Please log in again.');
    window.location.reload();
    return;
  }

  // --- Fetch User Data ---
  let userData = {};
  let userRole = localStorage.getItem('userRole') || 'student';
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || userRole || 'student';
      localStorage.setItem('userRole', userRole);
    }
  } catch (e) {
    userData = {};
  }
  if (userRole !== 'student') {
    showToast('Access denied: Student dashboard only.');
    window.location.reload();
    return;
  }

  // --- Checklist Progress ---
  let checklistPct = userData.profileProgress || 0;

  // --- Last Test Summary ---
  let lastTestStr = 'No tests taken yet.';
  try {
    const snap = await getDocs(
      query(
        collection(db, 'testResults'),
        where('studentId', '==', currentUserEmail)
      )
    );
    let latest = null;
    snap.forEach((d) => {
      const t = d.data();
      if (
        !latest ||
        (t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp)) >
          (latest?.timestamp?.toDate
            ? latest.timestamp.toDate()
            : new Date(latest?.timestamp))
      ) {
        latest = t;
      }
    });
    if (latest) {
      const pct = Math.round((latest.correct / latest.total) * 100);
      const dateStr = latest.timestamp?.toDate
        ? latest.timestamp.toDate().toLocaleDateString()
        : new Date(latest.timestamp).toLocaleDateString();
      lastTestStr = `${latest.testName} – ${pct}% on ${dateStr}`;
    }
  } catch (e) {
    console.error('TestResults fetch error', e);
  }

  // --- License & Experience ---
  let license = userData.cdlClass || 'Not selected';
  let experience = userData.experience || 'Unknown';

  // --- 7-day Study Streak ---
  let streak = 0;
  try {
    const today = new Date().toDateString();
    let log = JSON.parse(localStorage.getItem('studyLog') || '[]');
    if (!log.includes(today)) {
      log.push(today);
      localStorage.setItem('studyLog', JSON.stringify(log));
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    streak = log.filter((d) => new Date(d) >= cutoff).length;
  } catch (e) {
    console.error('Streak calc error', e);
  }

  const name = localStorage.getItem('fullName') || 'CDL User';
  const roleBadge = `<span class="role-badge student">Student</span>`;

  // ========== DASHBOARD LAYOUT ==========
  container.innerHTML = `
    <h2 class="dash-head">Welcome back, ${name}! ${roleBadge}</h2>
    <button class="btn" id="edit-student-profile-btn" style="margin-bottom:1.2rem;max-width:260px;">👤 View/Edit My Profile</button>
    <div class="dash-layout">
      <section class="dash-metrics">
        <div id="latest-update-card" class="dashboard-card update-area"></div>
        <div class="dashboard-card">
          <h3>✅ Checklist Progress</h3>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${checklistPct}%;"></div>
          </div>
          <div class="progress-percent">
            <strong id="checklist-pct">${checklistPct}</strong>% complete
          </div>
          <div class="checklist-alert warning">
            <span>${getNextChecklistAlert(userData)}</span>
          </div>
        </div>
        <div class="dashboard-card">
          <h3>🧭 Walkthrough</h3>
          <p>Practice the CDL inspection walkthrough and memorize critical phrases.</p>
          <button class="btn" data-nav="walkthrough">Open Walkthrough</button>
        </div>
        <div class="glass-card metric">
          <h3>🔥 Study Streak</h3>
          <p><span class="big-num" id="streak-days">${streak}</span> day${streak !== 1 ? 's' : ''} active this week</p>
        </div>
        <div class="dashboard-card ai-tip-card">
          <div class="ai-tip-title" style="font-weight:600; font-size:1.12em; color:var(--accent); margin-bottom:0.5em;">
            🤖 AI Tip of the Day
          </div>
          <div class="ai-tip-content" style="margin-bottom:0.8em; font-size:1.03em;">
            ${getRandomAITip()}
          </div>
          <button class="btn ai-tip" id="ai-tip-btn" aria-label="Open AI Coach">
            <span style="font-size:1.1em;">💬</span> Ask AI Coach
          </button>
        </div>
        <div class="dashboard-card last-test-card">
          <h3>🧪 Last Test Score</h3>
          <p>${lastTestStr}</p>
          <button class="btn" data-nav="practiceTests">Take a Test</button>
        </div>
      </section>
      <div class="dash-rail-wrapper">
        <aside class="dash-rail">
          <button class="rail-btn profile" data-nav="profile" aria-label="My Profile">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#b48aff" stroke-width="2"/>
              <path d="M4 20c0-2.8 3.6-4.2 8-4.2s8 1.4 8 4.2" stroke="#b48aff" stroke-width="2"/>
            </svg>
            <span class="label">My Profile</span>
          </button>
          <button class="rail-btn checklist" data-nav="checklists" aria-label="My Checklist">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4" width="16" height="16" rx="3" stroke="#a8e063" stroke-width="2"/>
              <path d="M8 13l3 3 5-5" stroke="#a8e063" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="label">My<br>Checklist</span>
          </button>
          <button class="rail-btn testing" data-nav="practiceTests" aria-label="Testing">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4" width="16" height="16" rx="3" stroke="#61aeee" stroke-width="2"/>
              <path d="M8 8h8M8 12h8M8 16h8" stroke="#61aeee" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="label">Testing<br>&nbsp;</span>
          </button>
          <button class="rail-btn flashcards" data-nav="flashcards" aria-label="Flashcards">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="7" width="14" height="10" rx="2" stroke="#ffdb70" stroke-width="2"/>
              <rect x="7" y="9" width="10" height="6" rx="1" stroke="#ffdb70" stroke-width="2"/>
            </svg>
            <span class="label">Flash<br>cards</span>
          </button>
        </aside>
      </div>
      <button class="rail-btn logout wide-logout" id="logout-btn" aria-label="Logout">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="12" height="16" rx="2" stroke="#ff8080" stroke-width="2"/>
          <path d="M17 15l4-3-4-3m4 3H10" stroke="#ff8080" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="label">Logout</span>
      </button>
    </div>
    <button id="ai-coach-fab" aria-label="Ask AI Coach">
      <span class="ai-coach-mascot-wrapper"></span>
    </button>
  `;

  // --- Show latest update card (news/alerts) ---
  showLatestUpdate();
  setupNavigation();

  // ========== EVENT HANDLERS ==========
  document.getElementById('edit-student-profile-btn')?.addEventListener('click', renderProfile);
  container.querySelector('.rail-btn.profile')?.addEventListener('click', renderProfile);
  container.querySelector('.rail-btn.checklist')?.addEventListener('click', renderChecklists);
  container.querySelector('.rail-btn.testing')?.addEventListener('click', renderPracticeTests);
  container.querySelector('.rail-btn.flashcards')?.addEventListener('click', renderFlashcards);

  // Walkthrough button
  container.querySelector('button[data-nav="walkthrough"]')?.addEventListener('click', renderWalkthrough);

  // AI Tip of the Day
  document.getElementById('ai-tip-btn')?.addEventListener('click', renderAICoach);

  // Last Test Card
  container.querySelector('.last-test-card button[data-nav="practiceTests"]')?.addEventListener('click', renderPracticeTests);

  // AI Coach Floating Button
  document.getElementById('ai-coach-fab')?.addEventListener('click', renderAICoach);

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('fullName');
    localStorage.removeItem('userRole');
    window.location.reload();
  });
}