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
    renderWelcome();
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
    case "flashcards": renderFlashcards(app); break;
    case "experience": renderExperience(app); break;
    case "dashboard": renderDashboard(app); break;    
    case "license":
  renderLicenseSelector(app); break;
       default:
      currentUserEmail?.includes("admin@") || currentUserEmail?.includes("instructor@")
        ? renderInstructorDashboard(app)
        : renderDashboard();
      break;
  }
}

// ==== Home Screen ====
async function renderHome(container) {
  container.innerHTML = `
    <div class="welcome-container fade-in">
      <img src="logo-icon.png" alt="CDL Icon" class="header-icon" />
      <h1>Welcome back${currentUserEmail ? `, ${currentUserEmail.split("@")[0]}` : ""}!</h1>
      ${getRoleBadge(currentUserEmail)}
      <p class="subtitle">Choose your training mode to begin</p>

      <div id="checklist-progress" class="progress-bar"></div>
      <div id="latest-score" class="result-card preview-card"></div>
      <div id="ai-tip" class="ai-tip-box"></div>

      <div class="button-grid">
        <button data-nav="walkthrough"><img src="icons/walkthrough.png" /> Walkthrough</button>
        <button data-nav="tests"><img src="icons/tests.png" /> Practice Tests</button>
        <button data-nav="coach"><img src="icons/coach.png" /> AI Coach</button>
        <button data-nav="checklists"><img src="icons/checklist.png" /> My Checklist <span id="checklist-alert" class="notify-bubble" style="display:none;">!</span></button>
        <button data-nav="results"><img src="icons/results.png" /> Test Results</button>
        <button data-nav="flashcards"><img src="icons/flashcards.png" /> Flashcards</button>
        <button data-nav="experience"><img src="icons/experience.png" /> Experience</button>
        <button data-nav="license"><img src="icons/license.png" /> License Path</button>
        <button data-nav="login"><img src="icons/login.png" /> Profile / Login</button>
      </div>

      <button class="login-button" data-nav="coach">🎧 Talk to Your AI Coach</button>
    </div>
  `;
  setupNavigation();

  // 🎉 AI Tip of the Day
  const tips = [
    "Review your ELDT checklist daily.",
    "Use flashcards to stay sharp!",
    "Ask the AI Coach about Class A vs B.",
    "Take timed quizzes to simulate the real test.",
    "Complete your checklist for certification."
  ];
  document.getElementById("ai-tip").textContent = `💡 Tip: ${tips[Math.floor(Math.random() * tips.length)]}`;

  // 🔄 Checklist Progress
  if (currentUserEmail) {
    const snap = await getDocs(query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail)));
    let total = 0, done = 0;
    snap.forEach(doc => {
      const prog = doc.data().progress;
      Object.values(prog).forEach(sec => {
        Object.values(sec).forEach(val => {
          total++;
          if (val) done++;
        });
      });
    });
    const pct = total ? Math.round((done/total)*100) : 0;
    document.getElementById("checklist-progress").innerHTML = `
      <div class="progress-label">Checklist Progress: ${pct}%</div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    `;
    if (pct < 100) {
      document.getElementById("checklist-alert").style.display = "inline-block";
    }
  }

  // 📊 Last Test Score
  if (currentUserEmail) {
    const snap2 = await getDocs(query(collection(db, "testResults"), where("studentId", "==", currentUserEmail)));
    let last = null;
    snap2.forEach(doc => {
      const d = doc.data();
      if (!last || d.timestamp.toDate() > last.timestamp.toDate()) last = d;
    });
    if (last) {
      document.getElementById("latest-score").innerHTML = `
        <h4>📘 Last Test: ${last.testName}</h4>
        <p>Score: ${last.correct}/${last.total} (${Math.round((last.correct/last.total)*100)}%)</p>
        <p><small>${new Date(last.timestamp.toDate()).toLocaleDateString()}</small></p>
      `;
    }
  }

  // 🌙 Auto Dark Mode after 6pm
  const hr = new Date().getHours();
  document.body.classList.toggle("dark", hr >= 18 || hr < 6);
}

// ==== Flashcards ====
function renderFlashcards(container) {
  container.innerHTML = `
    <div class="card">
      <h2>📑 Flashcards</h2>
      <p>Coming soon: Swipe through CDL topics for memorization.</p>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
}

// ==== Driving Experience ====
function renderExperience(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🚚 Driving Experience</h2>
      <p>Tell us about your driving background:</p>
      <form id="experience-form">
        <label><input type="radio" name="exp" value="beginner"> Beginner</label><br/>
        <label><input type="radio" name="exp" value="some"> Some Experience</label><br/>
        <label><input type="radio" name="exp" value="experienced"> Experienced CDL Driver</label><br/><br/>
        <button id="save-exp-btn">Save Experience</button>
      </form>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
  document.getElementById("save-exp-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    const selected = document.querySelector("input[name=exp]:checked")?.value;
    if (!selected) return alert("Please select your experience level.");
    await addDoc(collection(db, "experienceResponses"), {
      studentId: currentUserEmail,
      experience: selected,
      timestamp: new Date()
    });
    alert("✅ Experience saved!");
    renderPage("home");
  });
}

// ==== License Selector ====
function renderLicenseSelector(container) {
  container.innerHTML = `
    <div class="card">
      <h2>🎯 License Path</h2>
      <form id="license-form">
        <label><input type="radio" name="license" value="Class A"> Class A</label><br/>
        <label><input type="radio" name="license" value="Class A (O)"> Class A (O)</label><br/>
        <label><input type="radio" name="license" value="Class B"> Class B</label><br/><br/>
        <button id="save-license-btn">Save License</button>
      </form>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
  document.getElementById("save-license-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    const selected = document.querySelector("input[name=license]:checked")?.value;
    if (!selected) return alert("Please select a license type.");
    await addDoc(collection(db, "licenseSelection"), {
      studentId: currentUserEmail,
      licenseType: selected,
      timestamp: new Date()
    });
    alert("✅ License saved!");
    renderPage("home");
  });
}

// ==== Other Pages ====
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

async function renderDashboard() {
  const app = document.getElementById("app");
  app.innerHTML = `<div class="dashboard-card fade-in">Loading your dashboard...</div>`;

  const container = document.querySelector(".dashboard-card");
  let license = "Not selected", experience = "Unknown", streak = 0;
  let testData = null, checklistPct = 0, checklistStatus = "✅";

  // 👤 Greeting & Role
  const name = currentUserEmail?.split("@")[0];
  const roleBadge = getRoleBadge(currentUserEmail);

  // 🧠 AI Tip
  const tips = [
    "Review your ELDT checklist daily.",
    "Use flashcards to stay sharp!",
    "Ask the AI Coach about Class A vs B.",
    "Take timed quizzes to simulate the real test.",
    "Complete your checklist for certification."
  ];
  const aiTip = tips[Math.floor(Math.random() * tips.length)];

  // 📊 Checklist Progress
  const eldtSnap = await getDocs(query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail)));
  let total = 0, done = 0;
  eldtSnap.forEach(doc => {
    const prog = doc.data().progress;
    Object.values(prog).forEach(sec => {
      Object.values(sec).forEach(val => {
        total++; if (val) done++;
      });
    });
  });
  checklistPct = total ? Math.round((done/total)*100) : 0;
  if (checklistPct < 100) checklistStatus = "❌";

  // 📘 Last Test Score
  const testSnap = await getDocs(query(collection(db, "testResults"), where("studentId", "==", currentUserEmail)));
  testSnap.forEach(doc => {
    const d = doc.data();
    if (!testData || d.timestamp.toDate() > testData.timestamp.toDate()) testData = d;
  });

  // 🧾 Profile Summary
  const licenseSnap = await getDocs(query(collection(db, "licenseSelection"), where("studentId", "==", currentUserEmail)));
  licenseSnap.forEach(doc => license = doc.data().licenseType || license);
  const expSnap = await getDocs(query(collection(db, "experienceResponses"), where("studentId", "==", currentUserEmail)));
  expSnap.forEach(doc => experience = doc.data().experience || experience);

  // 🔥 Study Streak (via localStorage)
  const today = new Date().toDateString();
  let studyLog = JSON.parse(localStorage.getItem("studyLog") || "[]");
  if (!studyLog.includes(today)) {
    studyLog.push(today);
    localStorage.setItem("studyLog", JSON.stringify(studyLog));
  }
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6);
  streak = studyLog.filter(date => new Date(date) >= cutoff).length;

  // 🧭 Quick Actions
  const showChecklistBtn = checklistPct < 100;
  const showTestBtn = !testData;

  // 🧱 Build UI
  container.innerHTML = `
    <h1>Welcome back, ${name}!</h1>
    ${roleBadge}
    <p class="ai-tip">💡 ${aiTip}</p>

    <div class="dashboard-summary">
      <div class="dashboard-card">
        <h3>📋 Checklist Progress</h3>
        <div class="progress-track">
          <div class="progress-fill" style="width:${checklistPct}%;"></div>
        </div>
        <p>${checklistPct}% complete</p>
        ${checklistPct < 100 ? `<span class="notify-bubble">!</span>` : ""}
        <button data-nav="checklists">View Checklist</button>
      </div>

      <div class="dashboard-card">
        <h3>🧪 Latest Test</h3>
        ${testData ? `
          <p><strong>${testData.testName}</strong></p>
          <p>${testData.correct}/${testData.total} correct</p>
          <p><small>${new Date(testData.timestamp.toDate()).toLocaleDateString()}</small></p>
        ` : `<p>No tests taken yet.</p>`}
        ${!testData ? `<span class="notify-bubble">!</span>` : ""}
        <button data-nav="results">View All Results</button>
      </div>

      <div class="dashboard-card">
        <h3>🧾 Your Profile</h3>
        <p>Email: ${currentUserEmail}</p>
        <p>License: ${license}</p>
        <p>Experience: ${experience}</p>
        ${license === "Not selected" ? `<span class="notify-bubble">!</span>` : ""}
        <button data-nav="license">Update Info</button>
      </div>

      <div class="dashboard-card">
        <h3>🔥 Study Streak</h3>
        <p>${streak} days active this week</p>
        <button data-nav="home">Go to Home</button>
      </div>
    </div>

    <div class="dashboard-actions">
      ${showChecklistBtn ? `<button data-nav="checklists">Resume Checklist</button>` : ""}
      ${showTestBtn ? `<button data-nav="tests">Start First Test</button>` : ""}
      <button data-nav="coach">🎧 Talk to AI Coach</button>
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

function renderWelcome() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="welcome-screen fade-in">
      <img src="logo-icon.png" alt="CDL Icon" class="header-icon" />
      <h1>Welcome to CDL Trainer</h1>
      <p class="subtitle">Your personalized training coach for CDL success</p>
      <div class="button-group">
        <button data-nav="login" class="primary-btn">🚀 Get Started</button>
        <button data-nav="license" class="secondary-btn">🔍 Explore License Paths</button>
      </div>
    </div>
  `;
  setupNavigation();
}

function renderLogin(container) {
  container.innerHTML = `
    <div class="card login-card">
      <h2>🔐 Login</h2>
      <form id="login-form">
        <label for="email">Email:</label><br/>
        <input type="email" id="email" placeholder="Enter email" required autofocus/><br/>

        <label for="password">Password:</label><br/>
        <div class="password-wrapper">
          <input type="password" id="password" placeholder="Enter password" required />
          <button type="button" id="toggle-password" aria-label="Show/Hide Password">👁️</button>
        </div>

        <div class="login-options">
          <label><input type="checkbox" id="remember-me" /> Remember Me</label>
          <a href="#" id="reset-password">Forgot Password?</a>
        </div>

        <button type="submit" id="login-submit">🔓 Sign In</button>

        <p class="or-divider">OR</p>
        <div class="alt-login-buttons">
          <button type="button" id="google-login">🔵 Sign in with Google</button>
          <button type="button" id="apple-login"> Sign in with Apple (Coming Soon)</button>
          <button type="button" id="sms-login">📱 Sign in via SMS (Coming Soon)</button>
        </div>

        <p id="login-error" class="error-text" style="display:none;"></p>
      </form>

      <div class="test-account-hint">
        <strong>Test Account:</strong><br/>
        Email: <code>student1@sample.com</code><br/>
        Password: <code>cdltrainer</code>
      </div>

      <div class="login-extras">
        <select id="language-select">
          <option value="en" selected>🇺🇸 English</option>
          <option value="es">🇪🇸 Español</option>
          <option value="fr">🇫🇷 Français</option>
          <option value="de">🇩🇪 Deutsch</option>
        </select>

        <label><input type="checkbox" id="dark-mode-toggle" /> 🌙 Dark Mode</label>
      </div>

      <footer class="login-footer">
        <small>Version 1.0 • Built by CDL Buddy</small>
      </footer>
    </div>
  `;

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginForm = document.getElementById("login-form");
  const errorMsg = document.getElementById("login-error");
  const togglePassword = document.getElementById("toggle-password");

  // Show/hide password
  togglePassword.addEventListener("click", () => {
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;
    togglePassword.textContent = type === "password" ? "👁️" : "🙈";
  });

  // Dark mode toggle
  document.getElementById("dark-mode-toggle").addEventListener("change", (e) => {
    document.body.classList.toggle("dark-mode", e.target.checked);
  });

  // Enter key support
  loginForm.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });

  // Login submit
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      errorMsg.textContent = "Email and password required.";
      errorMsg.style.display = "block";
      return;
    }

    try {
      document.getElementById("login-submit").disabled = true;
      errorMsg.style.display = "none";

      const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        try {
          const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
          await createUserWithEmailAndPassword(auth, email, password);
          alert("🎉 Account created and logged in!");
        } catch (signupErr) {
          errorMsg.textContent = signupErr.message;
          errorMsg.style.display = "block";
        }
      } else {
        errorMsg.textContent = err.message;
        errorMsg.style.display = "block";
      }
    } finally {
      document.getElementById("login-submit").disabled = false;
    }
  });

  // Reset password (basic)
  document.getElementById("reset-password").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return alert("Enter your email to receive a reset link.");
    const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
    try {
      await sendPasswordResetEmail(auth, email);
      alert("📬 Reset link sent!");
    } catch (err) {
      alert("Error: " + err.message);
    }
  });

  // Language switch (UI only)
  document.getElementById("language-select").addEventListener("change", (e) => {
    alert(`Language switched to ${e.target.options[e.target.selectedIndex].text} (UI translation coming soon)`);
  });

  // Scaffold for Google Login
  document.getElementById("google-login").addEventListener("click", () => {
    alert("🔵 Google Sign-In coming soon!");
  });

  document.getElementById("apple-login").addEventListener("click", () => {
    alert(" Apple Sign-In coming soon!");
  });

  document.getElementById("sms-login").addEventListener("click", () => {
    alert("📱 SMS Sign-In coming soon!");
  });

  // Greet test users
  if (emailInput.value === "student1@sample.com") {
    console.log("👋 Hello test user!");
  }
}

// ==== Checklists ====
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

  const checklist = {
    "Pre-trip Inspection": [
      "Check lights", "Check tires", "Fluid levels", "Leaks under vehicle", "Cab safety equipment"
    ],
    "Basic Vehicle Control": [
      "Straight line backing", "Offset backing (left/right)", "Parallel parking", "Alley dock"
    ],
    "On-Road Driving": [
      "Lane changes", "Turns (left/right)", "Intersections", "Expressway entry/exit", "Railroad crossing"
    ],
    "Hazard Perception": [
      "Scan for pedestrians", "React to road hazards", "Mirror checks"
    ],
    "Emergency Maneuvers": [
      "Skid recovery", "Controlled braking", "Steering control"
    ]
  };

  const form = document.getElementById("eldt-form");
  let savedData = {};
  const snapshot = await getDocs(query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail)));
  snapshot.forEach(doc => savedData = doc.data().progress || {});

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

// ==== Instructor Checklist View ====
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

// ==== Save Quiz Test Result ====
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

// ==== Test Results View ====
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