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

// ─── 7. CORE NAVIGATION HANDLER & RENDERER ─────────────────────────────────────
async function handleNavigation(targetPage, pushToHistory = false) {
  console.log(`🧭 handleNavigation → ${targetPage}`);

  const appEl = document.getElementById("app");
  if (!appEl) return;

  // Fade-out stub (ensure you have .fade-in/.fade-out in CSS)
  appEl.classList.remove("fade-in");
  appEl.classList.add("fade-out");
  await new Promise(r => setTimeout(r, 150));

  if (pushToHistory) {
    history.pushState({ page: targetPage }, "", `#${targetPage}`);
  }

  renderPage(targetPage);

  // Fade-in stub
  appEl.classList.remove("fade-out");
  appEl.classList.add("fade-in");
}

function renderPage(page) {
  const container = document.getElementById("app");
  if (!container) return;

  switch (page) {
    case "login":
      renderLogin(container);
      break;
    default:
      renderWelcome();
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

  // Back button and any other nav
  setupNavigation();

  // Toggle password visibility
  const passwordInput = document.getElementById("password");
  document.getElementById("toggle-password").onclick = () => {
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  };

  // Login / Signup handler
  document.getElementById("login-form").onsubmit = async e => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const pwd   = passwordInput.value;
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
            uid:       cred.user.uid,
            email,
            name:      "CDL User",
            role:      "student",
            verified:  false,
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

  // Reset password
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
  {
    const snap = await getDocs(
      query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail))
    );
    let total = 0, done = 0;
    snap.forEach(d => {
      const prog = d.data().progress;
      Object.values(prog).forEach(sec =>
        Object.values(sec).forEach(v => { total++; if (v) done++; })
      );
    });
    checklistPct = total ? Math.round((done/total)*100) : 0;
  }

  // Fetch last test result
  let lastTest = null;
  {
    const snap = await getDocs(
      query(collection(db, "testResults"), where("studentId", "==", currentUserEmail))
    );
    snap.forEach(d => {
      const data = d.data();
      if (!lastTest || data.timestamp.toDate() > lastTest.timestamp.toDate()) {
        lastTest = data;
      }
    });
  }

  // Fetch profile details
  let license = "Not selected", experience = "Unknown";
  {
    const ls = await getDocs(query(collection(db, "licenseSelection"), where("studentId", "==", currentUserEmail)));
    ls.forEach(d => license = d.data().licenseType || license);
    const es = await getDocs(query(collection(db, "experienceResponses"), where("studentId", "==", currentUserEmail)));
    es.forEach(d => experience = d.data().experience || experience);
  }

  // Compute study streak (last 7 days)
  let streak = 0;
  {
    const today = new Date().toDateString();
    let log = JSON.parse(localStorage.getItem("studyLog")||"[]");
    if (!log.includes(today)) {
      log.push(today);
      localStorage.setItem("studyLog", JSON.stringify(log));
    }
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6);
    streak = log.filter(d => new Date(d) >= cutoff).length;
  }

  // Render
  appEl.innerHTML = `
    <div style="padding:20px; max-width:600px; margin:0 auto;">
      <h1>Welcome back, ${localStorage.getItem("fullName")||"Student"}!</h1>
      ${getRoleBadge(currentUserEmail)}
      
      <div style="margin:20px 0;">
        <h3>📋 Checklist Progress</h3>
        <div class="progress-track"><div class="progress-fill" style="width:${checklistPct}%;"></div></div>
        <p>${checklistPct}% complete</p>
      </div>

      <div style="margin:20px 0;">
        <h3>🧪 Last Test</h3>
        ${lastTest
          ? `<p><strong>${lastTest.testName}</strong> -- ${lastTest.correct}/${lastTest.total} (${Math.round(lastTest.correct/lastTest.total*100)}%)</p>`
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
        <p>${streak} day${streak!==1?"s":""} active this week</p>
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
    showToast("Logged out.");
    renderWelcome();
  });
}

// ─── Kick everything off ───────────────────────────────────────────────────────
renderWelcome();