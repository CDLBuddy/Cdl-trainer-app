// ==== Firebase Setup ====

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain: "cdltrainerapp.firebaseapp.com",
  projectId: "cdltrainerapp",
  storageBucket: "cdltrainerapp.appspot.com",
  messagingSenderId: "977549527480",
  appId: "1:977549527480:web:e959926bb02a4cef65674d",
  measurementId: "G-MJ22BD2J1J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==== Core SPA Layout ====

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  renderPage('home');
});

// ==== Page Routing ====

function setupNavigation() {
  const navItems = document.querySelectorAll('[data-nav]');
  navItems.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = e.target.getAttribute('data-nav');
      renderPage(page);
    });
  });
}

function renderPage(page) {
  const app = document.getElementById('app');
  app.innerHTML = ''; // Clear page

  switch (page) {
    case 'walkthrough':
      renderWalkthrough(app);
      break;
    case 'tests':
      renderPracticeTests(app);
      break;
    case 'coach':
      renderAICoach(app);
      break;
    case 'checklists':
      renderChecklists(app);
      break;
    case 'results':
      renderTestResults(app);
      break;
    default:
      renderHome(app);
  }
}

// ==== Home Page ====

function renderHome(container) {
  container.innerHTML = `
    <div class="card">
      <h2>Welcome to CDL Trainer</h2>
      <p>Your complete FMCSA-compliant training platform.</p>
      <button data-nav="walkthrough">📋 Walkthrough</button>
      <button data-nav="tests">📝 Practice Tests</button>
      <button data-nav="coach">🎧 AI Coach</button>
      <button data-nav="checklists">✅ My Checklist</button>
      <button data-nav="results">📊 Test Results</button>
    </div>
  `;
  setupNavigation(); // Re-attach button listeners
}

// ==== Walkthrough Page ====

function renderWalkthrough(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🧭 ELDT Walkthrough</h2>
      <p>Step-by-step CDL training walkthroughs.</p>
      <ul id="walkthrough-list">
        <li>✅ Identify vehicle type</li>
        <li>🛠️ Check lights, tires, fluids...</li>
        <li>📄 Match to FMCSA checklist...</li>
      </ul>
      <button data-nav="home">⬅️ Back to Home</button>
    </div>
  `;
  setupNavigation();
}

// ==== Practice Tests Page ====

function renderPracticeTests(container) {
  container.innerHTML = `
    <div class="card">
      <h2>📝 Practice Tests</h2>
      <p>Get ready for the CDL with realistic test simulations.</p>
      <ul>
        <li>📘 General Knowledge (coming soon)</li>
        <li>💨 Air Brakes (coming soon)</li>
        <li>🚛 Combination Vehicles (coming soon)</li>
      </ul>
      <button data-nav="home">⬅️ Back to Home</button>
    </div>
  `;
  setupNavigation();
}

// ==== AI Coach Page ====

function renderAICoach(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🎧 AI Coach</h2>
      <p>Ask questions, get guidance, and prep smarter.</p>
      <p><em>Coming soon: AI chat assistant powered by OpenAI.</em></p>
      <button data-nav="home">⬅️ Back to Home</button>
    </div>
  `;
  setupNavigation();
}

// ==== Checklist Page ====

async function renderChecklists(container) {
  container.innerHTML = `
    <div class="card">
      <h2>📋 Your Checklist</h2>
      <div id="checklist-display">Loading...</div>
      <button data-nav="home">⬅️ Back to Home</button>
    </div>
  `;
  setupNavigation();

  const display = document.getElementById("checklist-display");
  const q = query(collection(db, "checklists"), where("studentId", "==", "student1@sample.com"));
  const snapshot = await getDocs(q);
  display.innerHTML = "";

  snapshot.forEach((doc) => {
    const data = doc.data();
    display.innerHTML += `
      <div class="checklist-card">
        <h4>${data.title || "Checklist Item"}</h4>
        <ul>
          ${Object.entries(data.items).map(([key, val]) => `<li>${key}: ${val ? "✅" : "❌"}</li>`).join("")}
        </ul>
      </div>
    `;
  });

  if (snapshot.empty) {
    display.innerHTML = `<p>No checklist data found for student1@sample.com.</p>`;
  }
}

// ==== Test Results Page ====

async function renderTestResults(container) {
  container.innerHTML = `
    <div class="card">
      <h2>📊 Test Results</h2>
      <div id="results-display">Loading...</div>
      <button data-nav="home">⬅️ Back to Home</button>
    </div>
  `;
  setupNavigation();

  const display = document.getElementById("results-display");
  const q = query(collection(db, "testResults"), where("studentId", "==", "student1@sample.com"));
  const snapshot = await getDocs(q);
  display.innerHTML = "";

  snapshot.forEach((doc) => {
    const data = doc.data();
    display.innerHTML += `
      <div class="result-card">
        <h4>${data.testType || "Test"}</h4>
        <p>Score: ${data.score}/${data.total}</p>
        <p>${data.passed ? "✅ Passed" : "❌ Not Passed"}</p>
        <p>Date: ${data.date?.toDate().toLocaleDateString() || "Unknown"}</p>
      </div>
    `;
  });

  if (snapshot.empty) {
    display.innerHTML = `<p>No test results found for student1@sample.com.</p>`;
  }
}