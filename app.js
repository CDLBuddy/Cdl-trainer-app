// ==== Firebase Setup ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore, collection, query, where, getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

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

// ==== Auth State ====
onAuthStateChanged(auth, (user) => {
  const logoutBtn = document.getElementById("logout-btn");
  if (user) {
    currentUserEmail = user.email;
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    setupNavigation();
    renderPage("home");
    logoutBtn?.addEventListener("click", async () => {
      await signOut(auth);
      alert("Logged out.");
      location.reload();
    });
  } else {
    currentUserEmail = null;
    if (logoutBtn) logoutBtn.style.display = "none";
    renderLogin(document.getElementById("app"));
  }
});

// ==== Navigation ====
function setupNavigation() {
  const navItems = document.querySelectorAll("[data-nav]");
  navItems.forEach(btn =>
    btn.addEventListener("click", e => renderPage(e.target.getAttribute("data-nav")))
  );
}

function renderPage(page) {
  const app = document.getElementById("app");
  app.innerHTML = "";
  switch (page) {
    case "walkthrough": renderWalkthrough(app); break;
    case "tests": renderPracticeTests(app); break;
    case "coach": renderAICoach(app); break;
    case "checklists": renderChecklists(app); break;
    case "results": renderTestResults(app); break;
    case "quiz-general": loadQuizAndStart("general_knowledge", "General Knowledge"); break;
    case "quiz-air": loadQuizAndStart("air_brakes", "Air Brakes"); break;
    case "quiz-combo": loadQuizAndStart("combination_vehicle", "Combination Vehicle"); break;
    default:
      currentUserEmail?.includes("admin@") || currentUserEmail?.includes("instructor@")
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
      <p>Monitor student checklists and scores.</p>
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
        <li><button data-nav="quiz-general">📘 General Knowledge</button></li>
        <li><button data-nav="quiz-air">💨 Air Brakes</button></li>
        <li><button data-nav="quiz-combo">🚛 Combination Vehicles</button></li>
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

// ==== ELDT Checklist (Student View) ====
async function renderChecklists(container) {
  if (currentUserEmail?.includes("instructor@") || currentUserEmail?.includes("admin@")) {
    return await renderInstructorChecklists(container);
  }

  container.innerHTML = `
    <div class="card">
      <h2>✅ ELDT Checklist</h2>
      <form id="eldt-form"></form>
      <button id="save-eldt-btn">💾 Save Progress</button>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;

  setupNavigation();

  // STEP 1: Define checklist structure
  const checklist = {
    "Pre-trip Inspection": ["Check lights", "Check tires", "Fluid levels", "Leaks under vehicle", "Cab safety equipment"],
    "Basic Vehicle Control": ["Straight line backing", "Offset backing (left/right)", "Parallel parking", "Alley dock"],
    "On-Road Driving": ["Lane changes", "Turns (left/right)", "Intersections", "Expressway entry/exit", "Railroad crossing"],
    "Hazard Perception": ["Scan for pedestrians", "React to road hazards", "Mirror checks"],
    "Emergency Maneuvers": ["Skid recovery", "Controlled braking", "Steering control"]
  };

  // STEP 2: Load saved progress
  const form = document.getElementById("eldt-form");
  let savedData = {};
  const snapshot = await getDocs(query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail)));
  snapshot.forEach(doc => savedData = doc.data().progress || {});

  // STEP 3: Build UI
  Object.entries(checklist).forEach(([section, items]) => {
    const fieldset = document.createElement("fieldset");
    fieldset.innerHTML = `<legend>${section}</legend>`;
    items.forEach(item => {
      const id = `${section}::${item}`;
      const checked = savedData?.[section]?.[item] || false;
      fieldset.innerHTML += `
        <label><input type="checkbox" name="${id}" ${checked ? "checked" : ""}/> ${item}</label><br/>
      `;
    });
    form.appendChild(fieldset);
  });

  // STEP 4: Save to Firestore
  document.getElementById("save-eldt-btn").addEventListener("click", async e => {
    e.preventDefault();
    const inputs = form.querySelectorAll("input[type=checkbox]");
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
    alert("✅ Checklist saved!");
    renderPage("checklists");
  });

  // STEP 5: Summary display
  if (Object.keys(savedData).length) {
    const summary = document.createElement("div");
    summary.innerHTML = `<h3>📋 Saved Progress Summary</h3>`;
    for (const [section, items] of Object.entries(savedData)) {
      summary.innerHTML += `<strong>${section}</strong><ul>`;
      for (const [item, completed] of Object.entries(items)) {
        summary.innerHTML += `<li>${completed ? "✅" : "❌"} ${item}</li>`;
      }
      summary.innerHTML += `</ul>`;
    }
    container.querySelector(".card").appendChild(summary);
  }
}

// ==== Instructor View of Checklists ====
async function renderInstructorChecklists(container) {
  container.innerHTML = `
    <div class="card">
      <h2>📊 Instructor Checklist Overview</h2>
      <div id="instructor-checklist-results">Loading...</div>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();

  const resultsContainer = document.getElementById("instructor-checklist-results");
  const snapshot = await getDocs(collection(db, "eldtProgress"));

  const grouped = {};
  snapshot.forEach(doc => {
    const { studentId, progress } = doc.data();
    if (!grouped[studentId]) grouped[studentId] = {};
    Object.entries(progress).forEach(([section, items]) => {
      if (!grouped[studentId][section]) grouped[studentId][section] = {};
      Object.entries(items).forEach(([item, checked]) => {
        grouped[studentId][section][item] = checked;
      });
    });
  });

  Object.entries(grouped).forEach(([email, sections]) => {
    const card = document.createElement("div");
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
  });
}

// ==== Save Test Results ====
async function saveTestResult(testName, score, correct, total) {
  if (!currentUserEmail) return alert("Please log in to save results.");
  await addDoc(collection(db, "testResults"), {
    studentId: currentUserEmail,
    testName,
    score,
    correct,
    total,
    timestamp: new Date()
  });
}

// ==== View Test Results ====
async function renderTestResults(container) {
  container.innerHTML = `
    <div class="card">
      <h2>📊 Test Results</h2>
      <div id="results-display">Loading...</div>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();

  const display = document.getElementById("results-display");
  const snapshot = await getDocs(query(collection(db, "testResults"), where("studentId", "==", currentUserEmail)));
  display.innerHTML = snapshot.empty ? "<p>No test results found.</p>" : "";

  snapshot.forEach(doc => {
    const data = doc.data();
    display.innerHTML += `
      <div class="result-card">
        <h4>${data.testName}</h4>
        <p>Score: ${data.score}/${data.total}</p>
        <p>Date: ${new Date(data.timestamp.toDate()).toLocaleDateString()}</p>
      </div>
    `;
  });
}

// ==== Login Fallback ====
function renderLogin(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🔐 Login Required</h2>
      <p>Please log in to access CDL Trainer features.</p>
    </div>
  `;
}