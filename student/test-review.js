// student/test-review.js

import { db, auth } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {
  showToast,
  setupNavigation,
  incrementStudentStudyMinutes,
  logStudySession,
  markStudentTestPassed,
  getUserProgress,
} from '../ui-helpers.js';
import { renderPracticeTests } from './practice-tests.js';

// --- Helper for user email everywhere (keeps DRY) ---
function getCurrentUserEmail() {
  return (
    (auth.currentUser && auth.currentUser.email) ||
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    null
  );
}

// ─── REVIEW A SPECIFIC TEST RESULT ───────────────────────────
export async function renderTestReview(container, testName) {
  container = container || document.getElementById('app');
  container.innerHTML = `<div class="screen-wrapper fade-in"><h2>🧾 ${testName} Review</h2><p>Loading...</p></div>`;

  const currentUserEmail = getCurrentUserEmail();
  try {
    const snap = await getDocs(
      query(
        collection(db, 'testResults'),
        where('studentId', '==', currentUserEmail)
      )
    );

    const results = snap.docs
      .map((doc) => doc.data())
      .filter((d) => d.testName === testName)
      .sort(
        (a, b) =>
          (b.timestamp?.toDate?.() || new Date(b.timestamp)) -
          (a.timestamp?.toDate?.() || new Date(a.timestamp))
      );

    if (results.length === 0) {
      container.innerHTML = `
        <div class="screen-wrapper fade-in">
          <h2>🧾 ${testName} Review</h2>
          <p>No results found for this test.</p>
          <button class="btn outline" data-nav="practiceTests">⬅ Back to Practice Tests</button>
        </div>
      `;
      setupNavigation();
      container
        .querySelector('[data-nav="practiceTests"]')
        ?.addEventListener('click', () => {
          renderPracticeTests(container);
        });
      return;
    }

    const latest = results[0];
    const pct = Math.round((latest.correct / latest.total) * 100);

    // Milestone: Mark test as passed if pct >= 80
    if (pct >= 80) {
      // Only show toast the first time they pass
      const progress = await getUserProgress(currentUserEmail);
      if (!progress.practiceTestPassed) {
        await markStudentTestPassed(currentUserEmail);
        showToast('🎉 Practice Test milestone complete! Progress updated.');
      }
    }

    // Always log study minutes and session
    const minutes = latest?.durationMinutes || 5;
    await incrementStudentStudyMinutes(currentUserEmail, minutes);
    await logStudySession(
      currentUserEmail,
      minutes,
      `Practice Test: ${testName}`
    );

    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="max-width:600px;margin:0 auto;padding:20px;">
        <h2>🧾 ${testName} Review</h2>
        <p>You scored <strong>${latest.correct}/${latest.total}</strong> (${pct}%)</p>
        <p><em>Question-level review coming soon!</em></p>
        <div style="margin-top:20px;">
          <button class="btn outline" data-nav="practiceTests">⬅ Back to Practice Tests</button>
        </div>
      </div>
    `;

    setupNavigation();

    container
      .querySelector('[data-nav="practiceTests"]')
      ?.addEventListener('click', () => {
        renderPracticeTests(container);
      });
  } catch (e) {
    console.error('❌ Review fetch error:', e);
    container.innerHTML = `<p>Failed to load review data.</p>`;
  }
}
