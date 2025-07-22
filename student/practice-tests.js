// student/practice-tests.js

import { db, auth } from '../firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  showToast,
  setupNavigation,
  incrementStudentStudyMinutes,
  logStudySession,
  markStudentTestPassed,
  getUserProgress
} from '../ui-helpers.js';

// ★★ CENTRALIZED INDEX IMPORTS ★★
import {
  renderDashboard as renderStudentDashboard,
  renderTestEngine,
  renderTestReview // Import review here so setTimeout handler works!
} from './index.js';

export async function renderPracticeTests(container = document.getElementById("app")) {
  if (!container) return;

  if (!window.currentUserEmail || !auth.currentUser) {
    container.innerHTML = "<p>You must be logged in to view this page.</p>";
    return;
  }

  // Only students can access
  let userRole = localStorage.getItem("userRole") || "student";
  let userData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", window.currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || userRole || "student";
      localStorage.setItem("userRole", userRole);
    }
  } catch (e) { userData = {}; }

  if (userRole !== "student") {
    container.innerHTML = "<p>This page is only available for students.</p>";
    return;
  }

  // --- TEST DATA ---
  const tests = ["General Knowledge", "Air Brakes", "Combination Vehicles"];
  const testScores = {};

  try {
    const snap = await getDocs(
      query(collection(db, "testResults"), where("studentId", "==", window.currentUserEmail))
    );
    tests.forEach(test => {
      const testDocs = snap.docs
        .map(doc => doc.data())
        .filter(d => d.testName === test);
      if (testDocs.length > 0) {
        const latest = testDocs.sort((a, b) =>
          (b.timestamp?.toDate?.() || new Date(b.timestamp)) -
          (a.timestamp?.toDate?.() || new Date(a.timestamp))
        )[0];
        const pct = Math.round((latest.correct / latest.total) * 100);
        testScores[test] = {
          pct,
          passed: pct >= 80,
          lastResult: latest
        };
      }
    });
  } catch (e) {
    console.error("❌ Error loading test results:", e);
  }

  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="max-width:600px;margin:0 auto;padding:20px;">
      <h2 class="dash-head">🧪 CDL Practice Tests</h2>
      <p style="margin-bottom: 1.4rem;">Select a practice test to begin:</p>
      <div class="test-list">
        ${tests.map(name => {
          const data = testScores[name];
          const scoreBadge = data
            ? data.passed
              ? `<span class="badge badge-success">✅ ${data.pct}%</span>`
              : `<span class="badge badge-fail">❌ ${data.pct}%</span>`
            : `<span class="badge badge-neutral">⏳ Not attempted</span>`;
          return `
            <div class="glass-card" style="margin-bottom: 1.2rem; padding:18px;">
              <h3 style="margin-bottom: 0.6rem;">${name} ${scoreBadge}</h3>
              <div class="btn-grid">
                <button class="btn wide retake-btn" data-test="${name}">🔁 Retake</button>
                ${data ? `<button class="btn wide outline review-btn" data-test="${name}">🧾 Review</button>` : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>
      <div style="text-align:center; margin-top:2rem;">
        <button id="back-to-dashboard-btn" class="btn outline wide">⬅ Back to Dashboard</button>
      </div>
    </div>
  `;

  setupNavigation();

  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderStudentDashboard();
  });

  // DOM event listeners after DOM render
  setTimeout(() => {
    container.querySelectorAll(".retake-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const test = btn.dataset.test;
        showToast(`Restarting "${test}" test…`);
        // Always pass currentUserEmail for testEngine!
        renderTestEngine(container, test, window.currentUserEmail);
      });
    });
    container.querySelectorAll(".review-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const test = btn.dataset.test;
        showToast(`Loading your last "${test}" result…`);
        renderTestReview(container, test);
      });
    });
  }, 0);
}

// ─── REVIEW A SPECIFIC TEST RESULT ────────────────────────────────────────────
export async function renderTestReview(container, testName) {
  container = container || document.getElementById("app");
  container.innerHTML = `<div class="screen-wrapper fade-in"><h2>🧾 ${testName} Review</h2><p>Loading...</p></div>`;

  try {
    const snap = await getDocs(
      query(collection(db, "testResults"), where("studentId", "==", window.currentUserEmail))
    );

    const results = snap.docs
      .map(doc => doc.data())
      .filter(d => d.testName === testName)
      .sort((a, b) =>
        (b.timestamp?.toDate?.() || new Date(b.timestamp)) -
        (a.timestamp?.toDate?.() || new Date(a.timestamp))
      );

    if (results.length === 0) {
      container.innerHTML = `<p>No results found for this test.</p>`;
      return;
    }

    const latest = results[0];
    const pct = Math.round((latest.correct / latest.total) * 100);

    // Milestone: Mark test as passed if pct >= 80
    if (pct >= 80) {
      // Only show toast the first time they pass
      const progress = await getUserProgress(window.currentUserEmail);
      if (!progress.practiceTestPassed) {
        await markStudentTestPassed(window.currentUserEmail);
        showToast("🎉 Practice Test milestone complete! Progress updated.");
      }
    }

    // Always log study minutes and session
    const minutes = latest?.durationMinutes || 5;
    await incrementStudentStudyMinutes(window.currentUserEmail, minutes);
    await logStudySession(window.currentUserEmail, minutes, `Practice Test: ${testName}`);

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

    container.querySelector('[data-nav="practiceTests"]')?.addEventListener("click", () => {
      renderPracticeTests(container);
    });

  } catch (e) {
    console.error("❌ Review fetch error:", e);
    container.innerHTML = `<p>Failed to load review data.</p>`;
  }
}