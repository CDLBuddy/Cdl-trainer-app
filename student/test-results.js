// test-results.js

// IMPORTS
import { db } from './firebase.js';
import { getDocs, query, collection, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { setupNavigation } from './ui-helpers.js';
import { currentUserEmail } from './app.js'; // Make sure this is exported from app.js, or pass as argument

// Main function
export async function renderTestResults(container = document.getElementById("app")) {
  if (!container) return;

  // 1. Show loading state
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>📊 Test Results</h2>
      <p>Loading...</p>
    </div>
  `;

  // 2. Fetch test results for current user
  let results = [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "testResults"),
        where("studentId", "==", currentUserEmail)
      )
    );

    // 3. Normalize timestamps (Firestore Timestamp or ISO string)
    results = snap.docs.map(d => {
      const data = d.data();
      const ts = data.timestamp;
      const date = ts?.toDate
        ? ts.toDate()        // Firestore Timestamp
        : new Date(ts);      // ISO string fallback
      return { ...data, timestamp: date };
    });

    // 4. Sort descending by date
    results.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error("❌ Error loading test results:", e);
    results = [];
  }

  // 5. Build results HTML
  let html = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>📊 Test Results</h2>
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
          <strong>${r.testName}</strong> -- <b>${pct}%</b> <span style="color:#888;">(${r.correct}/${r.total}) on ${date}</span>
        </li>
      `;
    });
  }

  html += `
      </ul>
      <div style="text-align:center; margin-top:20px;">
        <button class="btn outline" data-nav="dashboard" style="margin-right:8px;">⬅ Back to Dashboard</button>
        <button class="btn" data-nav="practiceTests">🔄 Retake a Test</button>
      </div>
    </div>
  `;

  // 6. Render and re-bind navigation
  container.innerHTML = html;
  setupNavigation();

  // Navigation buttons
  container.querySelector('[data-nav="dashboard"]')?.addEventListener("click", () => {
    // Import and call your dashboard function here
    import('./dashboard-student.js').then(mod => mod.renderDashboard());
  });
  container.querySelector('[data-nav="practiceTests"]')?.addEventListener("click", () => {
    import('./practice-tests.js').then(mod => mod.renderPracticeTests());
  });
}