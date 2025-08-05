// student/student-dashboard.js

import { db, auth } from '../firebase.js';
import {
  showToast,
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
import { renderAppShell } from '../ui-shell.js';

export async function renderStudentDashboard() {
  // --- Always resolve user ---
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

  // --- Get user profile ---
  let userData = {};
  let userRole = 'student';
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || 'student';
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

  // --- MAIN DASHBOARD CONTENT (HTML Only, No Wrapper) ---
  const mainContent = `
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
      <button class="btn" data-nav="student-walkthrough">Open Walkthrough</button>
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
      <button class="btn ai-tip" data-nav="student-coach" aria-label="Open AI Coach">
        <span style="font-size:1.1em;">💬</span> Ask AI Coach
      </button>
    </div>
    <div class="dashboard-card last-test-card">
      <h3>🧪 Last Test Score</h3>
      <p>${lastTestStr}</p>
      <button class="btn" data-nav="student-practice-tests">Take a Test</button>
    </div>
  `;

  // --- Render universal shell ---
  await renderAppShell({
    role: 'student',
    user: { name: userData.name },
    mainContent,
    showFooter: true,
    notifications: [], // TODO: pass real notifications if you have them
  });

  // --- Dashboard-specific event handlers (after render) ---
  showLatestUpdate();

  // Example: Add any custom logic for AI Tip button
  document
    .querySelector('.ai-tip-card .ai-tip')
    ?.addEventListener('click', () => handleNavigation('student-coach'));
}