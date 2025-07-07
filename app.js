// ==== Firebase Setup ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

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
  const logoutBtn = document.getElementById("logout-btn");
  if (user) {
    currentUserEmail = user.email;
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    setupNavigation();
    renderPage('home');
  } else {
    currentUserEmail = null;
    if (logoutBtn) logoutBtn.style.display = "none";
    renderLogin(document.getElementById('app'));
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      alert("Logged out.");
      window.location.reload();
    });
  }
});

// ==== ELDT Checklist Structure ====
const eldtChecklist = {
  "Pre-trip Inspection": [
    "Check lights",
    "Check tires",
    "Fluid levels",
    "Leaks under vehicle",
    "Cab safety equipment"
  ],
  "Basic Vehicle Control": [
    "Straight line backing",
    "Offset backing (left/right)",
    "Parallel parking",
    "Alley dock"
  ],
  "On-Road Driving": [
    "Lane changes",
    "Turns (left/right)",
    "Intersections",
    "Expressway entry/exit",
    "Railroad crossing"
  ],
  "Hazard Perception": [
    "Scan for pedestrians",
    "React to road hazards",
    "Mirror checks"
  ],
  "Emergency Maneuvers": [
    "Skid recovery",
    "Controlled braking",
    "Steering control"
  ]
};

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
  // 🔐 Check if user is instructor or admin
  if (currentUserEmail?.includes("instructor@") || currentUserEmail?.includes("admin@")) {
    await renderInstructorChecklists(container);
    return;
  }

  // 👤 Regular student view continues below
  container.innerHTML = `
    <div class="card">
      <h2>✅ ELDT Checklist</h2>
      <form id="eldt-form"></form>
      <button id="save-eldt-btn">💾 Save Progress</button>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  
async function renderChecklists(container) {
  container.innerHTML = `
    <div class="card">
      <h2>✅ ELDT Checklist</h2>
      <form id="eldt-form"></form>
      <button id="save-eldt-btn">💾 Save Progress</button>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();

  const form = document.getElementById('eldt-form');

  // === STEP 1: Define checklist structure ===
  const eldtChecklist = {
    "Vehicle Inspection": ["Lights", "Brakes", "Tires", "Mirrors"],
    "Cab Check": ["Seatbelt", "Horn", "Windshield", "Wipers"],
    "Engine Compartment": ["Oil Level", "Coolant Level", "Leaks"]
  };

  // === STEP 2: Load saved progress from Firestore ===
  let savedData = {};
  if (currentUserEmail) {
    const snapshot = await getDocs(query(
      collection(db, "eldtProgress"),
      where("studentId", "==", currentUserEmail)
    ));
    snapshot.forEach(doc => {
      savedData = doc.data().progress || {};
    });
  }

  // === STEP 3: Build checklist UI with saved values ===
  Object.entries(eldtChecklist).forEach(([section, items]) => {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = section;
    legend.style.marginTop = "1rem";
    fieldset.appendChild(legend);

    items.forEach(item => {
      const checkbox = document.createElement('input');
      checkbox.type = "checkbox";
      checkbox.name = `${section}::${item}`;
      checkbox.checked = savedData?.[section]?.[item] || false;

      const label = document.createElement('label');
      label.style.display = 'block';
      label.appendChild(checkbox);
      label.append(` ${item}`);

      fieldset.appendChild(label);
    });

    form.appendChild(fieldset);
  });

  // === STEP 4: Hook up save button to Firestore ===
  document.getElementById("save-eldt-btn").addEventListener("click", async (e) => {
    e.preventDefault();

    const inputs = form.querySelectorAll("input[type='checkbox']");
    const progress = {};

    inputs.forEach(input => {
      const [section, item] = input.name.split("::");
      if (!progress[section]) progress[section] = {};
      progress[section][item] = input.checked;
    });

    await addDoc(collection(db, "eldtProgress"), {
      studentId: currentUserEmail,
      timestamp: new Date(),
      progress
    });

    alert("✅ Checklist progress saved!");
    renderPage("checklists");
  });

  // === STEP 5: Show saved progress summary below form ===
  if (Object.keys(savedData).length > 0) {
    const summary = document.createElement('div');
    summary.style.marginTop = "2rem";
    summary.innerHTML = `<h3>📋 Saved Progress Summary</h3>`;

    for (const [section, items] of Object.entries(savedData)) {
      const sectionSummary = document.createElement('div');
      sectionSummary.innerHTML = `<strong>${section}</strong><ul style="padding-left: 1.2rem;">`;

      for (const [item, completed] of Object.entries(items)) {
        sectionSummary.innerHTML += `
          <li>${completed ? "✅" : "❌"} ${item}</li>
        `;
      }

      sectionSummary.innerHTML += `</ul>`;
      summary.appendChild(sectionSummary);
    }

    container.querySelector(".card").appendChild(summary);
  }
}
// ==== Instructor Checklist Overview ====
async function renderInstructorChecklists(container) {
  container.innerHTML = `
    <div class="card">
      <h2>📊 Instructor Checklist Overview</h2>
      <p>Viewing all student ELDT checklist progress:</p>
      <div id="instructor-checklist-results"></div>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();

  const resultsContainer = document.getElementById('instructor-checklist-results');
  const snapshot = await getDocs(collection(db, "eldtProgress"));

  const grouped = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    const email = data.studentId;
    const progress = data.progress;

    if (!grouped[email]) grouped[email] = {};
    Object.entries(progress).forEach(([section, items]) => {
      if (!grouped[email][section]) grouped[email][section] = {};
      Object.entries(items).forEach(([item, checked]) => {
        grouped[email][section][item] = checked;
      });
    });
  });

  for (const [email, sections] of Object.entries(grouped)) {
    const card = document.createElement('div');
    card.className = "card";
    card.innerHTML = `<h3>👤 ${email}</h3>`;

    for (const [section, items] of Object.entries(sections)) {
      card.innerHTML += `<strong>${section}</strong><ul>`;
      for (const [item, checked] of Object.entries(items)) {
        card.innerHTML += `<li>${checked ? "✅" : "❌"} ${item}</li>`;
      }
      card.innerHTML += `</ul>`;
    }

    resultsContainer.appendChild(card);
  }
}

async function saveTestResult(testName, score, correct, total) {
  if (!currentUserEmail) return alert("You must be logged in to save test results.");

  await addDoc(collection(db, "testResults"), {
    studentId: currentUserEmail,
    testName,
    score,
    correct,
    total,
    timestamp: new Date()
  });
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

// ==== Login Page ====

function renderLogin(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🔐 Login Required</h2>
      <p>Please log in to access CDL Trainer.</p>
    </div>
  `;
}