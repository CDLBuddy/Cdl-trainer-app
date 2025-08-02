// student/practice-tests.js

import { db, auth } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { showToast, setupNavigation } from '../ui-helpers.js';

import { renderStudentDashboard } from './student-dashboard.js';
import { renderTestEngine } from './test-engine.js';
import { renderTestReview } from './test-review.js';

// --- Helper for user email everywhere (keeps DRY) ---
function getCurrentUserEmail() {
  return (
    (auth.currentUser && auth.currentUser.email) ||
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    null
  );
}

// Multi-school future support
let schoolId = localStorage.getItem('schoolId') || '';

// ─── PRACTICE TESTS PAGE (STUDENT) ─────────────────────────
export async function renderPracticeTests(
  container = document.getElementById('app')
) {
  // Defensive: Ensure container is a DOM element
  if (!container || typeof container.querySelectorAll !== 'function') {
    console.error('❌ container is not a DOM element:', container);
    showToast('Internal error: Container not ready.');
    return;
  }

  const currentUserEmail = getCurrentUserEmail();
  if (!currentUserEmail) {
    container.innerHTML = '<p>You must be logged in to view this page.</p>';
    setupNavigation();
    return;
  }

  // Only students can access
  let userRole = localStorage.getItem('userRole') || 'student';
  let userData = {};
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || userRole || 'student';
      schoolId = userData.schoolId || schoolId;
      localStorage.setItem('userRole', userRole);
      if (schoolId) localStorage.setItem('schoolId', schoolId);
    }
  } catch (e) {
    userData = {};
  }

  if (userRole !== 'student') {
    container.innerHTML = '<p>This page is only available for students.</p>';
    setupNavigation();
    return;
  }

  // --- TEST DATA ---
  const tests = ['General Knowledge', 'Air Brakes', 'Combination Vehicles'];
  const testScores = {};

  try {
    const snap = await getDocs(
      query(
        collection(db, 'testResults'),
        where('studentId', '==', currentUserEmail)
      )
    );
    tests.forEach((test) => {
      const testDocs = snap.docs
        .map((doc) => doc.data())
        .filter((d) => d.testName === test);
      if (testDocs.length > 0) {
        const latest = testDocs.sort(
          (a, b) =>
            (b.timestamp?.toDate?.() || new Date(b.timestamp)) -
            (a.timestamp?.toDate?.() || new Date(a.timestamp))
        )[0];
        const pct = Math.round((latest.correct / latest.total) * 100);
        testScores[test] = {
          pct,
          passed: pct >= 80,
          lastResult: latest,
        };
      }
    });
  } catch (e) {
    console.error('❌ Error loading test results:', e);
  }

  // Progress: how many tests passed?
  const passedCount = Object.values(testScores).filter((s) => s.passed).length;

  // --- RENDER PAGE ---
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="max-width:600px;margin:0 auto;padding:20px;">
      <h2 class="dash-head" style="display:flex;align-items:center;gap:10px;">
        🧪 Student Practice Tests
        <span style="margin-left:auto;font-size:1em;">
          <span class="progress-label" title="Tests Passed">${passedCount}/${tests.length} Passed</span>
        </span>
      </h2>
      <div class="progress-track" style="margin-bottom:1.3rem;">
        <div class="progress-fill" style="width:${Math.round((100 * passedCount) / tests.length)}%;"></div>
      </div>
      <p style="margin-bottom: 1.4rem;">Select a practice test to begin or review:</p>
      <div class="test-list">
        ${tests
          .map((name) => {
            const data = testScores[name];
            let mainBtn = data
              ? `<button class="btn wide retake-btn" data-test="${name}">🔁 Retake</button>`
              : `<button class="btn wide start-btn" data-test="${name}">🚦 Start</button>`;
            let reviewBtn = data
              ? `<button class="btn wide outline review-btn" data-test="${name}">🧾 Review</button>`
              : '';
            const scoreBadge = data
              ? data.passed
                ? `<span class="badge badge-success">✅ ${data.pct}%</span>`
                : `<span class="badge badge-fail">❌ ${data.pct}%</span>`
              : `<span class="badge badge-neutral">⏳ Not attempted</span>`;
            return `
            <div class="glass-card" style="margin-bottom: 1.2rem; padding:18px;">
              <h3 style="margin-bottom: 0.6rem;display:flex;align-items:center;gap:10px;">
                ${name} ${scoreBadge}
              </h3>
              <div class="btn-grid">
                ${mainBtn}
                ${reviewBtn}
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
      <div style="text-align:center; margin-top:2rem;">
        <button id="back-to-dashboard-btn" class="btn outline wide" aria-label="Back to Dashboard">⬅ Back to Dashboard</button>
      </div>
    </div>
  `;

  setupNavigation();

  // Defensive: Add listeners only if container is still valid
  setTimeout(() => {
    if (!container || typeof container.querySelectorAll !== 'function') {
      // Navigation away during async
      return;
    }
    container
      .getElementById('back-to-dashboard-btn')
      ?.addEventListener('click', () => {
        renderStudentDashboard();
      });
    container.querySelectorAll('.start-btn,.retake-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const test = btn.dataset.test;
        showToast(`Starting "${test}" test…`);
        renderTestEngine(container, test, currentUserEmail);
      });
    });
    container.querySelectorAll('.review-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const test = btn.dataset.test;
        showToast(`Loading your last "${test}" result…`);
        renderTestReview(container, test);
      });
    });
  }, 0);
}
