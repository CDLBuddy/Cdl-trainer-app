// student/test-results.js

import { db } from '../firebase.js';
import { getDocs, query, collection, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { setupNavigation } from '../ui-helpers.js';

// Accepts container param, and always checks for logged in user email
export async function renderTestResults(container = document.getElementById("app")) {
  // Resolve current user
  const currentUserEmail =
    window.currentUserEmail ||
    localStorage.getItem("currentUserEmail") ||
    null;

  if (!container) return;

  // Guard against missing user
  if (!currentUserEmail) {
    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
        <h2>📊 Student Test Results</h2>
        <p>You must be logged in to view this page.</p>
      </div>
    `;
    setupNavigation();
    return;
  }

  // Show loading state
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>📊 Student Test Results</h2>
      <p>Loading...</p>
    </div>
  `;

  // Fetch test results for current user
  let results = [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "testResults"),
        where("studentId", "==", currentUserEmail)
      )
    );

    // Normalize timestamps and format results
    results = snap.docs.map(d => {
      const data = d.data();
      const ts = data.timestamp;
      const date = ts?.toDate
        ? ts.toDate()
        : new Date(ts);
      return { ...data, timestamp: date };
    });

    // Sort descending by date
    results.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error("❌ Error loading test results:", e);
    results = [];
  }

  // Build results HTML
  let html = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>📊 Student Test Results</h2>
      <ul style="list-style:none; padding:0;">
  `;

  if (results.length === 0) {
    html += `<li>No test results found.</li>`;
  } else {
    results.forEach(r => {
      const pct  = Math.round((r.correct / r.total) * 100);
      const date = r.timestamp.toLocaleDateString();
      html  += `
        <li style="margin:8px 0;">
          <strong>${r.testName}</strong> -- <b>${pct}%</b>
          <span style="color:#888;">(${r.correct}/${r.total}) on ${date}</span>
        </li>
      `;
    });
  }

  html += `
      </ul>
      <div style="text-align:center; margin-top:20px;">
        <button class="btn outline" id="back-to-dashboard-btn" style="margin-right:8px;">⬅ Back to Dashboard</button>
        <button class="btn" id="retake-test-btn">🔄 Retake a Test</button>
      </div>
    </div>
  `;

  // Render and bind navigation
  container.innerHTML = html;
  setupNavigation();

  // Navigation buttons
  document.getElementById('back-to-dashboard-btn')?.addEventListener("click", () => {
    import('./student-dashboard.js').then(mod => mod.renderDashboard());
  });
  document.getElementById('retake-test-btn')?.addEventListener("click", () => {
    import('./practice-tests.js').then(mod => mod.renderPracticeTests());
  });
}