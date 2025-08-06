// student/student-dashboard.js

import { db, auth } from '../firebase.js';
import {
  showToast,
  showLatestUpdate,
  getRandomAITip,
  getNextChecklistAlert,
} from '../ui-helpers.js';
import {
  collection,
  query,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { renderAppShell } from '../ui-shell.js';
import { handleNavigation } from '../navigation.js';

// ========== STUDENT DASHBOARD MAIN FUNCTION ==========
export async function renderStudentDashboard() {
  // --- Robust user/email detection
  const currentUserEmail =
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    (auth.currentUser && auth.currentUser.email) ||
    null;
  if (!currentUserEmail) {
    showToast('No user found. Please log in again.');
    handleNavigation('welcome');
    return;
  }

  // --- Get user profile & role
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
    handleNavigation('welcome');
    return;
  }

  // --- Checklist Progress
  const checklistPct = userData.profileProgress || 0;

  // --- Last Test Score
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
      const tTime =
        t.timestamp?.toDate?.() || new Date(t.timestamp) || new Date(0);
      const lTime =
        latest?.timestamp?.toDate?.() ||
        new Date(latest?.timestamp) ||
        new Date(0);
      if (!latest || tTime > lTime) latest = t;
    });
    if (latest) {
      const pct = Math.round((latest.correct / latest.total) * 100);
      const dateStr = latest.timestamp?.toDate
        ? latest.timestamp.toDate().toLocaleDateString()
        : new Date(latest.timestamp).toLocaleDateString();
      lastTestStr = `${latest.testName} – ${pct}% on ${dateStr}`;
    }
  } catch (e) {
    // If fails, still render dashboard
    console.error('TestResults fetch error', e);
  }

  // --- Study Streak (7-day)
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
    streak = 0;
  }

  // --- DASHBOARD CONTENT ---
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

  // --- Render App Shell (header, nav, content, footer, AI coach) ---
  await renderAppShell({
    role: 'student',
    user: { name: userData.name },
    mainContent,
    showFooter: true,
    notifications: [], // pass notifications if needed
  });

  // --- Post-render dashboard events
  showLatestUpdate();
  // (If you want to wire up anything *dashboard specific* here, do so.)
  // All nav, logout, theme, etc, are now handled by shell/app.js.
}
