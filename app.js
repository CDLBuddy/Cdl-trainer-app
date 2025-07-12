// app.js

// ─── Global State ─────────────────────────────────────────────────────────────
let currentUserEmail = null;

// ─── 1. MODULE IMPORTS ─────────────────────────────────────────────────────────
// Firebase App
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

// Firestore
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Auth
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// UI Helpers
import { showToast } from "./ui-helpers.js";

console.log("✅ app.js loaded");

// ─── 2. FIREBASE CONFIG & INITIALIZATION ────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain:        "cdltrainerapp.firebaseapp.com",
  projectId:         "cdltrainerapp",
  storageBucket:     "cdltrainerapp.appspot.com",
  messagingSenderId: "977549527480",
  appId:             "1:977549527480:web:e959926bb02a4cef65674d",
  measurementId:     "G-MJ22BD2J1J"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ─── 3. AUTH STATE LISTENER ────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  console.log("🔔 Firebase auth state changed:", user);

  // Hide any loading overlays if you have them
  document.getElementById("js-error")?.classList.add("hidden");
  document.getElementById("loading-screen")?.classList.add("hidden");

  const appEl = document.getElementById("app");
  if (appEl) {
    // Show loading placeholder
    appEl.innerHTML = `
      <div class="screen-wrapper fade-in" style="text-align:center">
        <div class="loading-spinner" style="margin:40px auto;"></div>
        <p>Checking your credentials…</p>
      </div>
    `;
  }

  if (user) {
    // Signed in
    currentUserEmail = user.email;

    // 1) Fetch or create profile
    let userData;
    try {
      const usersRef  = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", user.email));
      const snap      = await getDocs(userQuery);

      if (!snap.empty) {
        userData = snap.docs[0].data();
      } else {
        const newUser = {
          uid:       user.uid,
          email:     user.email,
          name:      user.displayName || "CDL User",
          role:      "student",
          verified:  false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await addDoc(usersRef, newUser);
        userData = newUser;
      }

      // 2) Save to localStorage
      localStorage.setItem("userRole", userData.role    || "student");
      localStorage.setItem("fullName", userData.name    || "CDL User");
    } catch (err) {
      console.error("❌ User profile error:", err);
      const msg = err.message || err;
      showToast("Error loading profile: " + msg);
      alert("🛑 Firestore error: " + msg);
      return;
    }

    // 3) Setup logout button (you need an element with id="logout-btn" in your dashboard templates)
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        try {
          await signOut(auth);
          showToast("You’ve been logged out.");
          renderWelcome();
        } catch (err) {
          console.error("Logout failed:", err);
          showToast("Logout error");
        }
      };
    }

    // 4) Route to dashboard based on role
    const role = localStorage.getItem("userRole");
    if (role === "admin") {
      renderAdminDashboard();
    } else if (role === "instructor") {
      renderInstructorDashboard();
    } else {
      renderDashboard();
    }

  } else {
    // Signed out → welcome screen
    currentUserEmail = null;
    renderWelcome();
  }
});

// ─── 4. UTILITY FUNCTIONS ──────────────────────────────────────────────────────
function showModal(html) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

function closeModal() {
  document.querySelector(".modal-overlay")?.remove();
}

function getRoleBadge(email) {
  if (!email) return "";
  if (email.includes("admin@")) {
    return `<span class="role-badge admin">Admin</span>`;
  } else if (email.includes("instructor@")) {
    return `<span class="role-badge instructor">Instructor</span>`;
  } else {
    return `<span class="role-badge student">Student</span>`;
  }
}

async function getAITipOfTheDay() {
  const tips = [
    "Review your ELDT checklist daily.",
    "Use flashcards to stay sharp!",
    "Ask the AI Coach about Class A vs B.",
    "Take timed quizzes to simulate the real test.",
    "Complete your checklist for certification."
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

// ─── 5. SIMPLE RENDER & TEST UI ────────────────────────────────────────────────
function renderWelcome() {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  appEl.innerHTML = `
    <div style="padding:20px; text-align:center;">
      <h1>Welcome!</h1>
      <button id="login-btn">🚀 Login</button>
    </div>
  `;

  // Direct click binding for Login
  const loginBtn = document.getElementById("login-btn");
  loginBtn?.addEventListener("click", () => {
    handleNavigation("login", true);
  });

  // Wire up any other data-nav elements
  setupNavigation();
}

// ─── 6. NAVIGATION SETUP ───────────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      handleNavigation(target, true);
    });
  });
}

// ─── 7. CORE NAVIGATION HANDLER & DISPATCHER ───────────────────────────────────
async function handleNavigation(targetPage, pushToHistory = false) {
  console.log(`🧭 handleNavigation → ${targetPage}`);

  const appEl = document.getElementById("app");
  if (!appEl) return;

  // Fade‐out stub (requires .fade-in/.fade-out in CSS)
  appEl.classList.remove("fade-in");
  appEl.classList.add("fade-out");
  await new Promise(r => setTimeout(r, 150));

  // Push to history
  if (pushToHistory) {
    history.pushState({ page: targetPage }, "", `#${targetPage}`);
  }

  // Dispatch to the right renderer
  renderPage(targetPage);

  // Fade‐in stub
  appEl.classList.remove("fade-out");
  appEl.classList.add("fade-in");
}

function renderPage(page) {
  const container = document.getElementById("app");
  if (!container) return;

  switch (page) {
    case "walkthrough":
      renderWalkthrough(container);
      break;
    case "tests":
      renderPracticeTests(container);
      break;
    case "coach":
      renderAICoach(container);
      break;
    case "checklists":
      renderChecklists(container);
      break;
    case "results":
      renderTestResults(container);
      break;
    case "flashcards":
      renderFlashcards(container);
      break;
    case "experience":
      renderExperience(container);
      break;
    case "license":
      renderLicenseSelector(container);
      break;
    case "login":
      renderLogin(container);
      break;
    case "home":
      renderWelcome();
      break;
    default:
      renderDashboard();
      break;
  }
}

// ─── 8. FULL LOGIN FORM & HANDLERS ─────────────────────────────────────────────
function renderLogin(container) {
  container.innerHTML = `
    <div class="login-card fade-in" style="padding:20px; max-width:400px; margin:40px auto;">
      <h2>🚀 Login or Signup</h2>
      <form id="login-form">
        <input id="email" type="email" placeholder="Email" required style="width:100%; padding:8px; margin:8px 0;" />
        <div style="position:relative; margin:8px 0;">
          <input id="password" type="password" placeholder="Password" required style="width:100%; padding:8px;" />
          <button type="button" id="toggle-password" style="position:absolute; right:8px; top:8px;">👁️</button>
        </div>
        <div id="error-msg" style="color:red; display:none; margin:8px 0;"></div>
        <button id="login-submit" type="submit" style="width:100%; padding:10px; margin-top:12px;">Login / Signup</button>
      </form>
      <div style="margin-top:12px; text-align:center;">
        <button data-nav="home">⬅️ Back</button>
        <button id="google-login" style="margin-left:8px;">Continue with Google</button>
      </div>
      <p style="text-align:center; margin-top:8px;"><a href="#" id="reset-password">Forgot password?</a></p>
    </div>
  `;

  // Wire up nav
  setupNavigation();

  // Toggle password visibility
  const passwordInput = document.getElementById("password");
  document.getElementById("toggle-password").onclick = () => {
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  };

  // Handle login/signup
  document.getElementById("login-form").onsubmit = async e => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const pwd = passwordInput.value;
    const errorDiv = document.getElementById("error-msg");
    errorDiv.style.display = "none";

    if (!email || !pwd) {
      errorDiv.textContent = "Please enter both email and password.";
      errorDiv.style.display = "block";
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, pwd);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, pwd);
          await addDoc(collection(db, "users"), {
            uid: cred.user.uid,
            email,
            name: "CDL User",
            role: "student",
            verified: false,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          });
          showToast("🎉 Account created and signed in!");
        } catch (suErr) {
          errorDiv.textContent = suErr.message;
          errorDiv.style.display = "block";
        }
      } else {
        errorDiv.textContent = err.message;
        errorDiv.style.display = "block";
      }
    }
  };

  // Google Sign-In
  document.getElementById("google-login").onclick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      showToast("Google Sign-In failed: " + err.message);
    }
  };

  // Password reset
  document.getElementById("reset-password").onclick = async e => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    if (!email) {
      showToast("Enter your email to receive a reset link.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("📬 Reset link sent!");
    } catch (err) {
      showToast("Error: " + err.message);
    }
  };
}

// ─── 9. STUDENT DASHBOARD ─────────────────────────────────────────────────────
async function renderDashboard() {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  // Fetch ELDT progress
  let checklistPct = 0;
  try {
    const snap = await getDocs(
      query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail))
    );
    let total = 0, done = 0;
    snap.forEach(d => {
      const prog = d.data().progress;
      Object.values(prog).forEach(sec =>
        Object.values(sec).forEach(val => { total++; if (val) done++; })
      );
    });
    checklistPct = total ? Math.round((done / total) * 100) : 0;
  } catch (e) {
    console.error("ELDT fetch error", e);
  }

  // Fetch last test result
  let lastTestData = null;
  try {
    const snap2 = await getDocs(
      query(collection(db, "testResults"), where("studentId", "==", currentUserEmail))
    );
    snap2.forEach(d => {
      const t = d.data();
      if (!lastTestData || t.timestamp.toDate() > lastTestData.timestamp.toDate()) {
        lastTestData = t;
      }
    });
  } catch (e) {
    console.error("TestResults fetch error", e);
  }

  // Fetch profile info (license & experience)
  let license = "Not selected", experience = "Unknown";
  try {
    (await getDocs(query(collection(db, "licenseSelection"), where("studentId", "==", currentUserEmail))))
      .forEach(d => license = d.data().licenseType || license);
    (await getDocs(query(collection(db, "experienceResponses"), where("studentId", "==", currentUserEmail))))
      .forEach(d => experience = d.data().experience || experience);
  } catch (e) {
    console.error("Profile fetch error", e);
  }

  // Compute study streak (last 7 days)
  let streak = 0;
  try {
    const today = new Date().toDateString();
    let log = JSON.parse(localStorage.getItem("studyLog") || "[]");
    if (!log.includes(today)) {
      log.push(today);
      localStorage.setItem("studyLog", JSON.stringify(log));
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    streak = log.filter(d => new Date(d) >= cutoff).length;
  } catch (e) {
    console.error("Streak calc error", e);
  }

  const name = localStorage.getItem("fullName") || "CDL User";
  const roleBadge = getRoleBadge(currentUserEmail);

  appEl.innerHTML = `
    <div style="padding:20px; max-width:600px; margin:0 auto;">
      <h1>Welcome back, ${name}!</h1>
      ${roleBadge}
      <div style="margin:20px 0;">
        <h3>📋 Checklist Progress</h3>
        <div class="progress-track"><div class="progress-fill" style="width:${checklistPct}%"></div></div>
        <p>${checklistPct}% complete</p>
      </div>
      <div style="margin:20px 0;">
        <h3>🧪 Last Test</h3>
        ${lastTestData
          ? `<p><strong>${lastTestData.testName}</strong> -- ${lastTestData.correct}/${lastTestData.total} (${Math.round(lastTestData.correct/lastTestData.total*100)}%)</p>`
          : `<p>No tests taken yet.</p>`
        }
      </div>
      <div style="margin:20px 0;">
        <h3>📝 Your Profile</h3>
        <p><strong>License:</strong> ${license}</p>
        <p><strong>Experience:</strong> ${experience}</p>
      </div>
      <div style="margin:20px 0;">
        <h3>🔥 Study Streak</h3>
        <p>${streak} day${streak !== 1 ? "s" : ""} active this week</p>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:30px;">
        <button data-nav="tests" style="flex:1; padding:10px;">🧪 Practice Tests</button>
        <button data-nav="coach" style="flex:1; padding:10px;">🎧 AI Coach</button>
        <button data-nav="checklists" style="flex:1; padding:10px;">✅ My Checklist</button>
        <button data-nav="results" style="flex:1; padding:10px;">📊 Test Results</button>
      </div>
      <div style="text-align:center; margin-top:30px;">
        <button id="logout-btn" style="padding:8px 16px;">🚪 Logout</button>
      </div>
    </div>
  `;

  setupNavigation();
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.removeItem("fullName");
    localStorage.removeItem("userRole");
    renderWelcome();
  });
}

// ─── 10. MISSING PAGE RENDERERS ────────────────────────────────────────────────

// 10.1 Practice Tests
function renderPracticeTests(container) {
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>🧪 CDL Practice Tests</h2>
      <p>Select a practice test to begin:</p>
      <ul style="list-style:none; padding:0;">
        <li><button class="test-btn" data-test="General Knowledge" style="width:100%; padding:10px; margin:6px 0;">General Knowledge</button></li>
        <li><button class="test-btn" data-test="Air Brakes" style="width:100%; padding:10px; margin:6px 0;">Air Brakes</button></li>
        <li><button class="test-btn" data-test="Combination Vehicles" style="width:100%; padding:10px; margin:6px 0;">Combination Vehicles</button></li>
      </ul>
      <button data-nav="home" style="margin-top:20px;">⬅️ Back</button>
    </div>
  `;
  setupNavigation();
  document.querySelectorAll(".test-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showToast(`Starting "${btn.dataset.test}" test...`);
      // TODO: integrate actual test engine here
    });
  });
}

// 10.2 AI Coach
function renderAICoach(container) {
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>🎧 Talk to Your AI Coach</h2>
      <div id="ai-chat-log" style="border:1px solid #ccc; height:300px; overflow-y:auto; padding:10px; margin-bottom:10px;"></div>
      <textarea id="ai-input" placeholder="Ask a question..." style="width:100%; height:60px; padding:8px;"></textarea>
      <button id="ai-send-btn" style="width:100%; padding:10px; margin-top:6px;">Send</button>
      <button data-nav="home" style="display:block; margin:20px auto;">⬅️ Back</button>
    </div>
  `;
  setupNavigation();
  const logEl = document.getElementById("ai-chat-log");
  document.getElementById("ai-send-btn").addEventListener("click", async () => {
    const inputEl = document.getElementById("ai-input");
    const question = inputEl.value.trim();
    if (!question) return;
    logEl.innerHTML += `<div style="margin:8px 0;"><strong>You:</strong> ${question}</div>`;
    inputEl.value = "";
    // Simulate AI response
    const aiReply = await getAITipOfTheDay(); 
    logEl.innerHTML += `<div style="margin:8px 0; color:#0066cc;"><strong>AI Coach:</strong> ${aiReply}</div>`;
    logEl.scrollTop = logEl.scrollHeight;
  });
}

// 10.3 My Checklist
async function renderChecklists(container) {
  container.innerHTML = `<div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;"><h2>✅ My ELDT Checklist</h2><p>Loading...</p></div>`;

  // Fetch or create progress doc
  const refQuery = query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail));
  const snap = await getDocs(refQuery);
  let progressDoc, progressData;
  if (snap.empty) {
    progressData = {
      studentId: currentUserEmail,
      progress: {
        "Section 1": { "Item A": false, "Item B": false },
        "Section 2": { "Item C": false, "Item D": false }
      }
    };
    const docRef = await addDoc(collection(db, "eldtProgress"), progressData);
    progressDoc = { id: docRef.id, data: () => progressData };
  } else {
    progressDoc = { id: snap.docs[0].id, data: () => snap.docs[0].data() };
    progressData = progressDoc.data();
  }

  // Build UI
  let html = `<div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;"><h2>✅ My ELDT Checklist</h2><ul style="list-style:none; padding:0;">`;
  Object.entries(progressData.progress).forEach(([section, items]) => {
    html += `<li style="margin-bottom:16px;"><strong>${section}</strong><ul style="list-style:none; padding-left:12px;">`;
    Object.entries(items).forEach(([item, done]) => {
      html += `
        <li style="margin:6px 0;">
          <label>
            <input type="checkbox" data-item="${item}" ${done ? "checked" : ""}>
            ${item}
          </label>
        </li>
      `;
    });
    html += `</ul></li>`;
  });
  html += `</ul><button data-nav="home">⬅️ Back</button></div>`;
  container.innerHTML = html;
  setupNavigation();

  // Hook checkbox toggles
  container.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", async () => {
      const itemName = cb.dataset.item;
      // find which section it belongs to
      for (let [section, items] of Object.entries(progressData.progress)) {
        if (items.hasOwnProperty(itemName)) {
          progressData.progress[section][itemName] = cb.checked;
          break;
        }
      }
      await updateDoc(doc(db, "eldtProgress", progressDoc.id), { progress: progressData.progress });
    });
  });
}

// 10.4 Test Results
async function renderTestResults(container) {
  container.innerHTML = `<div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;"><h2>📊 Test Results</h2><p>Loading...</p></div>`;

  const snap = await getDocs(query(collection(db, "testResults"), where("studentId", "==", currentUserEmail)));
  const results = snap.docs.map(d => d.data());
  results.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

  let html = `<div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;"><h2>📊 Test Results</h2><ul style="list-style:none; padding:0;">`;
  if (results.length === 0) {
    html += `<li>No test results found.</li>`;
  } else {
    results.forEach(r => {
      const pct = Math.round((r.correct / r.total) * 100);
      const date = r.timestamp.toDate().toLocaleDateString();
      html += `<li style="margin:8px 0;"><strong>${r.testName}</strong> -- ${pct}% (${r.correct}/${r.total}) <em>on ${date}</em></li>`;
    });
  }
  html += `</ul><button data-nav="home">⬅️ Back</button></div>`;

  container.innerHTML = html;
  setupNavigation();
}

// ─── Kick everything off ───────────────────────────────────────────────────────
renderWelcome();