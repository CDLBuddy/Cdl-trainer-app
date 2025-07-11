// app.js

// ▶️ UI helpers (all in one place)
import {
  setupNavigation,
  showToast,
  getRoleBadge,
  getAITipOfTheDay,
  openStudentHelpForm
} from './ui-helpers.js';

// ------------------------------------------------------------------------------------------
// 1️⃣ Your Firebase config
const firebaseConfig = {
  apiKey:            "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain:        "cdltrainerapp.firebaseapp.com",
  projectId:         "cdltrainerapp",
  storageBucket:     "cdltrainerapp.appspot.com",
  messagingSenderId: "977549527480",
  appId:             "1:977549527480:web=e959926bb02a4cef65674d",
  measurementId:     "G-MJ22BD2J1J"
};

// ------------------------------------------------------------------------------------------
// 2️⃣ Import & initialize Firebase App, Auth & Firestore
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import {
  getAuth,                        // ← you need this
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
  query,
  where
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const firebaseApp = initializeApp(firebaseConfig);
const auth        = getAuth(firebaseApp);
const db          = getFirestore(firebaseApp);

// ------------------------------------------------------------------------------------------
// 3️⃣ Your full renderLogin() implementation
function renderLogin() {
  // (Optional) Visual debug border -- remove when stable
  document.body.style.border = "4px solid magenta";

  const appEl = document.getElementById("app");
  if (!appEl) return;

  // 1) Inject login HTML
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

  // 2) Wire up navigation links on any [data-nav] buttons
  setupNavigation();

  // 3) Query DOM only _after_ the HTML is in place
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

  // 👁️ Toggle password visibility
  toggleBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    toggleBtn.textContent = isHidden ? "🙈" : "👁️";
  });

  // 🔑 Login / Signup Handler
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

    submitBtn.disabled = true;
    try {
      await signInWithEmailAndPassword(auth, email, pwd);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, pwd);
          await addDoc(collection(db, "users"), {
            uid:       cred.user.uid,
            email,
            name:      "CDL User",
            role:      "student",
            verified:  false,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          });
          alert("🎉 Account created and signed in!");
        } catch (suErr) {
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

  // 📬 Reset Password Handler
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

  // 🌐 Google Sign-In
  googleBtn.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      alert("Google Sign-In failed: " + err.message);
    }
  });

  // 🚧 Placeholder for unimplemented flows
  appleBtn.addEventListener("click", () => alert("🚧 Apple Login coming soon."));
  smsBtn.addEventListener("click",   () => alert("🚧 SMS Login coming soon."));
}

// === Dashboards === //
async function renderDashboard() {
  const appEl = document.getElementById("app");
  appEl.innerHTML = `<div class="dashboard-card slide-in-up fade-in">Loading your dashboard...</div>`;
  const container = document.querySelector(".dashboard-card");

  const currentUser       = auth.currentUser;
  const currentUserEmail  = currentUser?.email || "unknown";
  const name              = currentUserEmail.split("@")[0];
  const roleBadge         = getRoleBadge(currentUserEmail);
  const aiTip             = await getAITipOfTheDay();

  document.body.classList.toggle("dark-mode", new Date().getHours() >= 18);

  let license        = "Not selected",
      experience     = "Unknown",
      streak         = 0;
  let testData       = null,
      checklistPct   = 0;

  // ELDT Progress
  const eldtSnap = await getDocs(
    query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail))
  );
  let total = 0, done = 0;
  eldtSnap.forEach(doc => {
    const prog = doc.data().progress;
    Object.values(prog).forEach(sec =>
      Object.values(sec).forEach(val => {
        total++;
        if (val) done++;
      })
    );
  });
  checklistPct = total ? Math.round((done / total) * 100) : 0;

  // Latest Test
  const testSnap = await getDocs(
    query(collection(db, "testResults"), where("studentId", "==", currentUserEmail))
  );
  testSnap.forEach(doc => {
    const d = doc.data();
    if (!testData || d.timestamp.toDate() > testData.timestamp.toDate()) {
      testData = d;
    }
  });

  // License & Experience
  const licenseSnap = await getDocs(
    query(collection(db, "licenseSelection"), where("studentId", "==", currentUserEmail))
  );
  licenseSnap.forEach(doc => license = doc.data().licenseType || license);

  const expSnap = await getDocs(
    query(collection(db, "experienceResponses"), where("studentId", "==", currentUserEmail))
  );
  expSnap.forEach(doc => experience = doc.data().experience || experience);

  // Study Streak
  const today    = new Date().toDateString();
  let studyLog   = JSON.parse(localStorage.getItem("studyLog") || "[]");
  if (!studyLog.includes(today)) {
    studyLog.push(today);
    localStorage.setItem("studyLog", JSON.stringify(studyLog));
  }
  const cutoff   = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  streak         = studyLog.filter(date => new Date(date) >= cutoff).length;

  const showChecklistBtn = checklistPct < 100;
  const showTestBtn      = !testData;

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

  setupNavigation();
}

// ------------------------------------------------------------------------------------------
// 4️⃣ Auth‐state listener: shows login if signed out,
//    or your post-login dashboard if signed in.
onAuthStateChanged(auth, (user) => {
  console.log("🔥 onAuthStateChanged fired, user =", user);
  setupNavigation();

  if (user) {
    console.log("✅ User signed in, calling renderDashboard()");
    renderDashboard();
  } else {
    console.log("🔒 No user, calling renderLogin()");
    renderLogin();
  }
});

// ------------------------------------------------------------------------------------------
// 5️⃣ Fallback for initial page load
window.addEventListener('DOMContentLoaded', () => {
  // onAuthStateChanged will immediately fire with the current user (or null)
});