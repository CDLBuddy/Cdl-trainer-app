// ==== Firebase Setup ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain: "cdltrainerapp.firebaseapp.com",
  projectId: "cdltrainerapp",
  storageBucket: "cdltrainerapp.appspot.com",
  messagingSenderId: "977549527480",
  appId: "1:977549527480:web:e959926bb02a4cef65674d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserEmail = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserEmail = user.email;
    setupNavigation();
    renderPage('home');
  } else {
    currentUserEmail = null;
    renderLogin(document.getElementById('app'));
  }
});

// ==== SPA Routing ====
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
  app.innerHTML = '';

  switch (page) {
    case 'walkthrough': renderWalkthrough(app); break;
    case 'tests': renderPracticeTests(app); break;
    case 'coach': renderAICoach(app); break;
    case 'checklists': renderChecklists(app); break;
    case 'results': renderTestResults(app); break;
    case 'login': renderLogin(app); break;
    default:
      currentUserEmail?.includes("admin@sample.com") || currentUserEmail?.includes("instructor@sample.com")
        ? renderInstructorDashboard(app)
        : renderHome(app);
  }
}

// ==== Pages ====

function renderHome(container) {
  container.innerHTML = `
    <div class="card">
      <h2>Welcome, ${currentUserEmail}</h2>
      <p>CDL Training Portal</p>
      <button data-nav="walkthrough">📋 Walkthrough</button>
      <button data-nav="tests">📝 Practice Tests</button>
      <button data-nav="coach">🎧 AI Coach</button>
      <button data-nav="checklists">✅ My Checklist</button>
      <button data-nav="results">📊 Test Results</button>
    </div>
  `;
  setupNavigation();
}

function renderInstructorDashboard(container) {
  container.innerHTML = `
    <div class="card">
      <h2>👨‍🏫 Instructor Dashboard</h2>
      <p>View student checklists and results</p>
      <button data-nav="checklists">📋 View All Checklists</button>
      <button data-nav="results">📊 View All Results</button>
    </div>
  `;
  setupNavigation();
}

function renderWalkthrough(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🧭 ELDT Walkthrough</h2>
      <ul>
        <li>✅ Identify vehicle type</li>
        <li>🛠️ Inspect lights, tires, fluids</li>
        <li>📄 Match FMCSA standards</li>
      </ul>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
}

function renderPracticeTests(container) {
  container.innerHTML = `
    <div class="card">
      <h2>📝 Practice Tests</h2>
      <ul>
        <li>📘 General Knowledge (Coming soon)</li>
        <li>💨 Air Brakes (Coming soon)</li>
        <li>🚛 Combination Vehicles (Coming soon)</li>
      </ul>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
}

function renderAICoach(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🎧 AI Coach</h2>
      <p>Ask questions and get CDL prep help.</p>
      <em>Coming soon</em>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
}

// ==== Checklists ====

async function renderChecklists(container) {
  container.innerHTML = `
    <div class="card">
      <h2>✅ Your Checklist</h2>
      <div id="checklist-display">Loading...</div>
      <button onclick="saveChecklistSample()">💾 Save Sample Checklist</button>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();

  const display = document.getElementById('checklist-display');
  const q = query(collection(db, "checklists"), where("studentId", "==", currentUserEmail));
  const snapshot = await getDocs(q);

  display.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    display.innerHTML += `
      <div class="checklist-card">
        <h4>${data.title || "Checklist"}</h4>
        <ul>
          ${Object.entries(data.items).map(([k, v]) => `<li>${k}: ${v ? "✅" : "❌"}</li>`).join('')}
        </ul>
      </div>
    `;
  });

  if (snapshot.empty) {
    display.innerHTML = `<p>No checklists found.</p>`;
  }
}

async function saveChecklistSample() {
  if (!currentUserEmail) return alert("Not logged in.");
  await addDoc(collection(db, "checklists"), {
    studentId: currentUserEmail,
    title: "Sample Pre-Trip",
    items: {
      Lights: true,
      Brakes: false,
      Tires: true,
      Mirrors: true
    }
  });
  alert("Checklist saved!");
  renderPage('checklists');
}

// ==== Test Results ====

async function renderTestResults(container) {
  container.innerHTML = `
    <div class="card">
      <h2>📊 Test Results</h2>
      <div id="results-display">Loading...</div>
      <button onclick="saveSampleTest()">💾 Save Sample Test</button>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();

  const display = document.getElementById("results-display");
  const q = query(collection(db, "testResults"), where("studentId", "==", currentUserEmail));
  const snapshot = await getDocs(q);
  display.innerHTML = "";

  snapshot.forEach(doc => {
    const data = doc.data();
    display.innerHTML += `
      <div class="result-card">
        <h4>${data.testType}</h4>
        <p>Score: ${data.score}/${data.total}</p>
        <p>${data.passed ? "✅ Passed" : "❌ Not Passed"}</p>
        <p>Date: ${data.date?.toDate().toLocaleDateString()}</p>
      </div>
    `;
  });

  if (snapshot.empty) {
    display.innerHTML = `<p>No test results found.</p>`;
  }
}

async function saveSampleTest() {
  if (!currentUserEmail) return alert("Not logged in.");
  await addDoc(collection(db, "testResults"), {
    studentId: currentUserEmail,
    testType: "General Knowledge",
    score: 22,
    total: 25,
    passed: true,
    date: new Date()
  });
  alert("Test result saved!");
  renderPage('results');
}

// ==== Login Page (only fallback) ====

function renderLogin(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🔐 Login Required</h2>
      <p>Please log in to access CDL Trainer.</p>
    </div>
  `;
}