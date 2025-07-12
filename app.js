// ─────────────────────────────────────────────────────────────────────────────
// 1️⃣ Imports (all `import` statements first)
// ─────────────────────────────────────────────────────────────────────────────
// Firebase SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// UI helpers
import {
  setupNavigation,
  showToast,
  getRoleBadge,
  getAITipOfTheDay,
  openStudentHelpForm
} from './ui-helpers.js';


// ─────────────────────────────────────────────────────────────────────────────
// 2️⃣ Configuration & Initialization
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain:        "cdltrainerapp.firebaseapp.com",
  projectId:         "cdltrainerapp",
  storageBucket:     "cdltrainerapp.appspot.com",
  messagingSenderId: "977549527480",
  appId:             "1:977549527480:web=e959926bb02a4cef65674d",
  measurementId:     "G-MJ22BD2J1J"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth        = getAuth(firebaseApp);
const db          = getFirestore(firebaseApp);

// Page Render Functions

export async function renderChecklists() {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="dashboard-card fade-in">
      <h2>📋 Your ELDT Checklist</h2>
      <p>Select a section below to begin or continue:</p>
      <ul class="checklist-list">
        <li>Section 1: Pre-Trip Inspection <button class="btn-small" data-nav="checklist-section-1">Go</button></li>
        <li>Section 2: Coupling/Uncoupling <button class="btn-small" data-nav="checklist-section-2">Go</button></li>
        <li>Section 3: Basic Vehicle Control <button class="btn-small" data-nav="checklist-section-3">Go</button></li>
      </ul>
      <button data-nav="" class="btn-block">← Back to Dashboard</button>
    </div>
  `;
  setupNavigation();
}

export async function renderTestStart() {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="dashboard-card fade-in">
      <h2>📝 Start a Practice Test</h2>
      <p>Choose a topic:</p>
      <select id="test-topic">
        <option value="general">General Knowledge</option>
        <option value="air-brakes">Air Brakes</option>
        <option value="combination">Combination Vehicles</option>
      </select>
      <button id="begin-test" class="btn-block">Start Test</button>
      <button data-nav="" class="btn-block btn-secondary">← Back to Dashboard</button>
    </div>
  `;
  document.getElementById('begin-test').addEventListener('click', () => {
    const topic = document.getElementById('test-topic').value;
    renderTest(topic);
  });
  setupNavigation();
}

export async function renderTestResults() {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="dashboard-card fade-in">
      <h2>📊 Past Test Results</h2>
      <p>Loading your past results…</p>
      <ul class="results-list">
        <li>No results found.</li>
      </ul>
      <button data-nav="" class="btn-block">← Back to Dashboard</button>
    </div>
  `;
  setupNavigation();
}

export async function renderLicenseSelector() {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="dashboard-card fade-in">
      <h2>🧾 Update Your Profile</h2>
      <form id="license-form">
        <label for="license-type">Select license type:</label>
        <select id="license-type" required>
          <option value="">-- Choose One --</option>
          <option value="class-a">Class A</option>
          <option value="class-b">Class B</option>
          <option value="class-c">Class C</option>
        </select>
        <label for="experience-level">Years of driving experience:</label>
        <input id="experience-level" type="number" min="0" placeholder="e.g. 2" required />
        <button type="submit" class="btn-block">Save Profile</button>
      </form>
      <button data-nav="" class="btn-block btn-secondary">← Back to Dashboard</button>
    </div>
  `;
  document.getElementById('license-form').addEventListener('submit', async e => {
    e.preventDefault();
    const license   = document.getElementById('license-type').value;
    const experience= document.getElementById('experience-level').value;
    await setDoc(doc(db, "licenseSelection", auth.currentUser.uid), {
      studentId:   auth.currentUser.email,
      licenseType: license,
      experience:  experience,
      updatedAt:   new Date().toISOString()
    });
    showToast('🎉 Profile updated!');
    window.location.hash = '';
  });
  setupNavigation();
}

async function renderChecklistSection(sectionId) {
  console.log('👉 renderChecklistSection', sectionId);
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="dashboard-card fade-in">
      <h2>📋 Checklist Section ${sectionId}</h2>
      <div id="items-container">Loading…</div>
      <button data-nav="checklists" class="btn-block">← Back to Checklist</button>
    </div>
  `;
  setupNavigation();

  try {
    // 1️⃣ Load existing progress
    const uid = auth.currentUser.uid;
    console.log(' • currentUser.email =', uid);

    const ref  = doc(db, 'eldtProgress', `${uid}-section-${sectionId}`);
    console.log(' • Firestore ref =', ref.path);

    const snap = await getDoc(ref);
    console.log(' • snapshot.exists() =', snap.exists());

    const data = snap.exists() ? snap.data().progress : {};
    console.log(' • loaded data =', data);

    // 2️⃣ Define defaults per section
    let defaultItems;
    switch (sectionId) {
      case 1:
        defaultItems = {
          "Check mirrors and windshield": false,
          "Test horn and lights":         false,
          "Inspect tires and wheels":     false
        };
        break;
      case 2:
        defaultItems = {
          "Connect glad hands securely": false,
          "Check air lines for leaks":   false,
          "Test trailer brakes":         false
        };
        break;
      case 3:
        defaultItems = {
          "Adjust steering wheel and seat": false,
          "Practice backing straight":      false,
          "Practice backing around corner": false
        };
        break;
      default:
        defaultItems = {};
    }
    console.log(' • defaultItems =', defaultItems);

    // 3️⃣ Merge and render
    const progress = { ...defaultItems, ...data };
    console.log(' • merged progress =', progress);

    const container = document.getElementById('items-container');
    container.innerHTML = Object.entries(progress).map(
      ([item, done]) => `
        <label class="checklist-item">
          <input type="checkbox" data-item="${item}" ${done ? 'checked' : ''}/>
          ${item}
        </label>
      `
    ).join('');
    console.log(' • rendered checkboxes');

    // 4️⃣ Wire up persistence
    container.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', async e => {
        const key = e.target.dataset.item;
        progress[key] = e.target.checked;
        await setDoc(ref, { progress }, { merge: true });
        console.log(` • saved ${key}=${e.target.checked}`);
      });
    });

  } catch (err) {
    // Display the real error message
    alert('Checklist load error:\n' + err.message);
    console.error('❌ renderChecklistSection error:', err);
    document
      .getElementById('items-container')
      .innerText = 'Error loading checklist.';
  }
}

async function renderTest(topic) {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="dashboard-card fade-in">
      <h2>📝 ${topic.charAt(0).toUpperCase() + topic.slice(1)} Test</h2>
      <p>Loading questions for "${topic}"…</p>
      <button data-nav="tests" class="btn-block">← Back to Test Menu</button>
    </div>
  `;
  setupNavigation();
}

      // Login

function renderLogin() {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `
    <div class="login-card fade-in">
      <h2>🚀 Login or Signup</h2>
      <form id="login-form">
        <input id="email" type="email" placeholder="Email" required />
        <div class="password-wrapper">
          <input id="password" type="password" placeholder="Password" required />
          <button type="button" id="toggle-password" class="toggle-password">👁️</button>
        </div>
        <div id="error-msg" class="error-message" style="display:none;"></div>
        <button id="login-submit" type="submit">Login / Signup</button>
      </form>
      <div class="alt-login-buttons">
        <button id="google-login" class="btn-google">Continue with Google</button>
        <button id="apple-login" class="btn-apple"> Apple Login</button>
        <button id="sms-login" class="btn-sms">📱 SMS Login</button>
        <p><a href="#" id="reset-password">Forgot password?</a></p>
      </div>
    </div>
  `;
  setupNavigation();

  const loginForm     = document.getElementById("login-form");
  const emailInput    = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const toggleBtn     = document.getElementById("toggle-password");
  const errorMsg      = document.getElementById("error-msg");
  const submitBtn     = document.getElementById("login-submit");
  const googleBtn     = document.getElementById("google-login");
  const appleBtn      = document.getElementById("apple-login");
  const smsBtn        = document.getElementById("sms-login");
  const resetLink     = document.getElementById("reset-password");

  toggleBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    toggleBtn.textContent = isHidden ? "🙈" : "👁️";
  });

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const pwd   = passwordInput.value;
  errorMsg.style.display = "none";

  if (!email || !pwd) {
    errorMsg.textContent = "Please enter both email and password.";
    errorMsg.style.display = "block";
    return;
  }

  console.log("🔑 Attempting signInWithEmailAndPassword for", email);
  submitBtn.disabled = true;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pwd);
    console.log("✅ signIn successful, uid =", cred.user.uid);
    // Optionally show a toast:
    showToast("🎉 Signed in as " + email);
  } catch (err) {
    console.error("❌ signIn error:", err);
    if (err.code === "auth/user-not-found") {
      console.log("🚀 User not found, creating account for", email);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pwd);
        console.log("✅ Account created, uid =", cred.user.uid);
        await addDoc(collection(db, "users"), {
          uid:       cred.user.uid,
          email,
          name:      "CDL User",
          role:      "student",
          verified:  false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });
        console.log("✅ User doc written for", email);
        showToast("🎉 Account created and signed in!");
      } catch (suErr) {
        console.error("❌ Error creating user doc:", suErr);
        errorMsg.textContent = suErr.message;
        errorMsg.style.display = "block";
      }
    } else {
      errorMsg.textContent = err.message;
      errorMsg.style.display = "block";
    }
  } finally {
    submitBtn.disabled = false;
  }
});
  resetLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) {
      alert("Enter your email to receive a reset link.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("📬 Reset link sent!");
    } catch (err) {
      alert("Error: " + err.message);
    }
  });

  googleBtn.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      alert("Google Sign-In failed: " + err.message);
    }
  });

  appleBtn.addEventListener("click", () => alert("🚧 Apple Login coming soon."));
  smsBtn.addEventListener("click",   () => alert("🚧 SMS Login coming soon."));
}

async function renderDashboard() {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  // 1️⃣ Loading placeholder
  appEl.innerHTML = `<div class="dashboard-card">Loading your dashboard…</div>`;
  const container = document.querySelector(".dashboard-card");

  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");

    const uid       = user.uid;
    const emailFull = user.email || "";
    const name      = emailFull.split("@")[0];
    const roleBadge = getRoleBadge(emailFull);
    const aiTip     = await getAITipOfTheDay();
    document.body.classList.toggle("dark-mode", new Date().getHours() >= 18);

    // 2️⃣ ELDT Checklist Progress (scan+filter by UID)
    let total = 0, done = 0;
    const eldtSnap = await getDocs(collection(db, "eldtProgress"));
    eldtSnap.forEach(doc => {
      if (!doc.id.startsWith(`${uid}-section-`)) return;
      const prog = doc.data().progress || {};
      Object.values(prog).forEach(sec =>
        Object.values(sec).forEach(val => {
          total++;
          if (val) done++;
        })
      );
    });
    const checklistPct = total ? Math.round((done/total)*100) : 0;
    const showChecklistBtn = checklistPct < 100;

    // 3️⃣ Latest Test Results (by email)
    let testData = null;
    const testSnap = await getDocs(
      query(collection(db, "testResults"), where("studentId", "==", emailFull))
    );
    testSnap.forEach(doc => {
      const d = doc.data();
      if (!testData || d.timestamp.toDate() > testData.timestamp.toDate()) {
        testData = d;
      }
    });
    const showTestBtn = !testData;

    // 4️⃣ License & Experience (by email)
    let license = "Not selected";
    const licSnap = await getDocs(
      query(collection(db, "licenseSelection"), where("studentId", "==", emailFull))
    );
    licSnap.forEach(doc => license = doc.data().licenseType || license);

    let experience = "Unknown";
    const expSnap = await getDocs(
      query(collection(db, "experienceResponses"), where("studentId", "==", emailFull))
    );
    expSnap.forEach(doc => experience = doc.data().experience || experience);

    // 5️⃣ Study Streak
    const today  = new Date().toDateString();
    let studyLog = JSON.parse(localStorage.getItem("studyLog") || "[]");
    if (!studyLog.includes(today)) {
      studyLog.push(today);
      localStorage.setItem("studyLog", JSON.stringify(studyLog));
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const streak = studyLog.filter(d => new Date(d) >= cutoff).length;

    // 6️⃣ Render the dashboard
    container.innerHTML = `
      <h1>Welcome back, ${name}!</h1>
      ${roleBadge}
      <div class="ai-tip-box">💡 ${aiTip}</div>

      <div class="dashboard-summary">
        <div class="dashboard-card">
          <h3>📋 Checklist Progress</h3>
          <div class="progress-track">
            <div class="progress-fill" style="width:${checklistPct}%;"></div>
          </div>
          <p>${checklistPct}% complete</p>
          ${showChecklistBtn ? `<span class="notify-bubble">!</span>` : ""}
          <button data-nav="checklists">View Checklist</button>
        </div>

        <div class="dashboard-card">
          <h3>🧪 Latest Test</h3>
          ${testData ? `
            <p><strong>${testData.testName}</strong></p>
            <p>${testData.correct}/${testData.total} correct</p>
            <p><small>${new Date(testData.timestamp.toDate()).toLocaleDateString()}</small></p>
          ` : `<p>No tests taken yet.</p>`}
          ${showTestBtn ? `<span class="notify-bubble">!</span>` : ""}
          <button data-nav="results">View All Results</button>
        </div>

        <div class="dashboard-card">
          <h3>🧾 Your Profile</h3>
          <p>Email: ${emailFull}</p>
          <p>License: ${license}</p>
          <p>Experience: ${experience}</p>
          ${license === "Not selected" ? `<span class="notify-bubble">!</span>` : ""}
          <button data-nav="license">Update Info</button>
        </div>

        <div class="dashboard-card">
          <h3>🔥 Study Streak</h3>
          <p>${streak} day${streak !== 1 ? "s" : ""} active this week</p>
          <button onclick="openStudentHelpForm()">Ask the AI Coach</button>
        </div>
      </div>

      <div class="dashboard-actions">
        ${showChecklistBtn ? `<button data-nav="checklists">Resume Checklist</button>` : ""}
        ${showTestBtn      ? `<button data-nav="tests">Start First Test</button>` : ""}
        <button data-nav="coach">🎧 Talk to AI Coach</button>
      </div>
    `;
  } catch (err) {
    console.error("renderDashboard error:", err);
    container.innerHTML = `
      <div class="dashboard-card error">
        <strong>Error loading dashboard:</strong><br>${err.message}
      </div>
    `;
  setupNavigation();
}

const routes = {
  "":                   renderDashboard,
  "checklists":         renderChecklists,
  "checklist-section-1": () => renderChecklistSection(1),
  "checklist-section-2": () => renderChecklistSection(2),
  "checklist-section-3": () => renderChecklistSection(3),
  "tests":              renderTestStart,
  "test-general":       () => renderTest('general'),
  "test-air-brakes":    () => renderTest('air-brakes'),
  "test-combination":   () => renderTest('combination'),
  "results":            renderTestResults,
  "license":            renderLicenseSelector,
  "coach":              openStudentHelpForm
};

function handleRoute() {
  const key = location.hash.replace(/^#\/?/, "");
  (routes[key] || routes[""])();
}

window.addEventListener("hashchange", handleRoute);
window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
  console.log("🔄 onAuthStateChanged → user =", user);
  setupNavigation();

  if (user) {
    console.log("→ rendering dashboard for uid", user.uid);
    renderDashboard();
  } else {
    console.log("→ rendering login screen");
    renderLogin();
  }
});