console.log("🚀 [DEBUG] app.js start");
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
  deleteDoc,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Auth
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// UI Helpers
import { showToast as importedShowToast, setupNavigation } from "./ui-helpers.js";

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



// ─── 3. GLOBAL STATE & REFERENCES ───────────────────────────────────────────────
let currentUserEmail = null;
// alias for student dashboard
const renderStudentDashboard = renderDashboard;



// ─── 4. UTILITY FUNCTIONS ──────────────────────────────────────────────────────
// 4.1 Toast Notification (duplicate safe-guard against imported version)
function showToast(message, duration = 3000) {
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;
  Object.assign(toast.style, {
    position:      "fixed",
    bottom:        "20px",
    left:          "50%",
    transform:     "translateX(-50%)",
    background:    "#333",
    color:         "#fff",
    padding:       "10px 20px",
    borderRadius:  "5px",
    opacity:       "1",
    transition:    "opacity 0.5s ease"
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, duration);
}

// 4.2 Modal helpers
function showModal(html) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

function closeModal() {
  document.querySelector(".modal-overlay")?.remove();
}

// 4.3 Role badge helper
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

// 4.4 AI Tip helper
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



// ─── 5. AUTH STATE LISTENER ─────────────────────────────────────────────────────
console.log("✅ Firebase auth listener attached");
onAuthStateChanged(auth, async (user) => {
  console.log("🔥 Firebase auth state changed", user);

  // Hide overlays
  document.getElementById("js-error")?.classList.add("hidden");
  document.getElementById("loading-screen")?.classList.add("hidden");

  const appEl = document.getElementById("app");
  if (appEl) {
    appEl.innerHTML = `
      <div class="screen-wrapper fade-in" style="text-align:center">
        <div class="loading-spinner" style="margin:40px auto;"></div>
        <p>Checking your credentials…</p>
      </div>
    `;
  }

  if (user) {
    // ─── a) Signed-in flow ─────────────────────────────────────────────────────
    currentUserEmail = user.email;
    try {
      const userRef   = collection(db, "users");
      const userQuery = query(userRef, where("email", "==", user.email));
      const snapshot  = await getDocs(userQuery);
      let userData;
      if (!snapshot.empty) {
        userData = snapshot.docs[0].data();
      } else {
        const newUser = {
          email:     user.email,
          name:      user.displayName || "CDL User",
          role:      "student",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        await addDoc(userRef, newUser);
        userData = newUser;
      }
      localStorage.setItem("userRole", userData.role || "student");
      localStorage.setItem("fullName",  userData.name || "CDL User");
    } catch (err) {
      console.error("❌ User profile error:", err);
      if (appEl) appEl.innerHTML = `<div class="card"><p>Error loading profile.</p></div>`;
      return;
    }

    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.style.display = "inline-block";
      const fresh = logoutBtn.cloneNode(true);
      logoutBtn.parentNode.replaceChild(fresh, logoutBtn);
      fresh.addEventListener("click", async () => {
        try {
          await signOut(auth);
          alert("You’ve been logged out.");
          location.reload();
        } catch {
          alert("Logout error.");
        }
      });
    }

    // Render dashboard after tiny delay
    setTimeout(() => {
      const role = localStorage.getItem("userRole");
      if (role === "admin") {
        renderAdminDashboard();
      } else if (role === "instructor") {
        renderInstructorDashboard();
      } else {
        renderStudentDashboard();
      }
    }, 300);

  } else {
    // ─── b) Signed-out flow ───────────────────────────────────────────────────
    currentUserEmail = null;
    document.getElementById("logout-btn")?.style.setProperty("display", "none");

    setTimeout(() => {
      renderWelcome();
      setupNavigation();
    }, 200);
  }
});



// ─── 6. NAVIGATION SETUP & HANDLERS ─────────────────────────────────────────────
function setupNavigation() {
  const navItems = document.querySelectorAll("[data-nav]");
  navItems.forEach(btn =>
    btn.addEventListener("click", async (e) => {
      const target = e.target.closest("[data-nav]")?.getAttribute("data-nav");
      if (!target) return;
      await handleNavigation(target, true);
    })
  );

  // Multilingual labels
  const lang = localStorage.getItem("language") || "en";
  const labels = {
    en: { coach: "AI Coach", license: "License Path", tests: "Practice Tests" },
    es: { coach: "Entrenador AI", license: "Tipo de Licencia", tests: "Exámenes Prácticos" },
    fr: { coach: "Coach IA", license: "Permis", tests: "Tests Pratiques" },
    de: { coach: "KI-Coach", license: "Führerschein", tests: "Übungstests" }
  };
  for (const [key, label] of Object.entries(labels[lang])) {
    const btn = document.querySelector(`[data-nav="${key}"]`);
    if (btn?.querySelector("span")) btn.querySelector("span").textContent = label;
  }

  // Role‐aware UI
  if (currentUserEmail?.includes("instructor@") || currentUserEmail?.includes("admin@")) {
    document.querySelector('[data-nav="license"]')?.remove();
  }

  // Keyboard nav
  document.addEventListener("keydown", async e => {
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
    const key = e.key.toLowerCase();
    if (key === "h") await handleNavigation("home", true);
    if (key === "t") await handleNavigation("tests", true);
    if (key === "c") await handleNavigation("coach", true);
  });

  // Touch swipe
  let touchStartX = 0;
  document.addEventListener("touchstart", e => touchStartX = e.touches[0].clientX);
  document.addEventListener("touchend", async e => {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > 100)  await handleNavigation("home", true);
    if (deltaX < -100) await handleNavigation("tests", true);
  });

  // Back/forward
  window.addEventListener("popstate", e => {
    const page = e.state?.page || "home";
    handleNavigation(page, false);
  });

  // Initial route
  const hash = location.hash.replace("#", "");
  if (hash) {
    handleNavigation(hash, false);
  } else if (auth.currentUser) {
    handleNavigation("home", false);
  } else {
    renderWelcome();
  }
}

async function handleNavigation(targetPage, pushToHistory = false) {
  const app = document.getElementById("app");
  if (!app) return;
  app.classList.remove("fade-in"); app.classList.add("fade-out");
  await new Promise(r => setTimeout(r, 150));

  if (pushToHistory) history.pushState({ page: targetPage }, "", `#${targetPage}`);

  if (targetPage === "home") {
    if (!currentUserEmail) {
      renderWelcome();
    } else if (currentUserEmail.includes("admin@")) {
      renderAdminDashboard();
    } else if (currentUserEmail.includes("instructor@")) {
      renderInstructorDashboard();
    } else {
      renderStudentDashboard();
    }
  } else {
    renderPage(targetPage);
  }
}

// ─── 7. RENDER FUNCTIONS ───────────────────────────────────────────────────────
// 7.1 Welcome Screen
function renderWelcome() {
  const appEl = document.getElementById("app");
  if (!appEl) return;
  appEl.innerHTML = `
    <div class="welcome-screen fade-in">
      <img src="logo-icon.png" alt="CDL Buddy Logo" class="header-icon" />
      <h1>Welcome to CDL Trainer</h1>
      <p class="subtitle">Your AI-powered CDL training assistant.</p>
      <div class="button-row">
        <button data-nav="login" class="btn-primary">🚀 Login / Signup</button>
        <button data-nav="coach" class="btn-secondary">🎧 Talk to AI Coach</button>
      </div>
    </div>
  `;
  setupNavigation();
}

// DEBUG: force login
  document.getElementById("force-login").addEventListener("click", () => {
    console.log("🔧 [DEBUG] Force renderLogin() called");
    renderLogin();
  });
}

// 7.2 Login / Signup
function renderLogin() {
  document.body.style.border = "4px solid magenta";
  const appEl = document.getElementById("app");
  if (!appEl) return;
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

  // DOM refs
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

  // Toggle password visibility
  toggleBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    toggleBtn.textContent = isHidden ? "🙈" : "👁️";
  });

  // Login / signup
  loginForm.addEventListener("submit", async e => {
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

  // Reset password
  resetLink.addEventListener("click", async e => {
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

  // Google Sign-In
  googleBtn.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      alert("Google Sign-In failed: " + err.message);
    }
  });

  // Placeholders
  appleBtn.addEventListener("click", () => alert("🚧 Apple Login coming soon."));
  smsBtn.addEventListener("click",   () => alert("🚧 SMS Login coming soon."));
}

// 7.3 Home Screen
async function renderHome(container) {
  if (!container) return;
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

  // AI Tip
  const tips = [
    "Review your ELDT checklist daily.",
    "Use flashcards to stay sharp!",
    "Ask the AI Coach about Class A vs B.",
    "Take timed quizzes to simulate the real test.",
    "Complete your checklist for certification."
  ];
  document.getElementById("ai-tip").textContent = `💡 Tip: ${tips[Math.floor(Math.random() * tips.length)]}`;

  // Checklist Progress
  if (currentUserEmail) {
    const snap = await getDocs(query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail)));
    let total = 0, done = 0;
    snap.forEach(d => {
      const prog = d.data().progress;
      Object.values(prog).forEach(sec => Object.values(sec).forEach(val => { total++; if (val) done++; }));
    });
    const pct = total ? Math.round((done/total)*100) : 0;
    document.getElementById("checklist-progress").innerHTML = `
      <div class="progress-label">Checklist Progress: ${pct}%</div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    `;
    if (pct < 100) document.getElementById("checklist-alert").style.display = "inline-block";
  }

  // Last Test Score
  if (currentUserEmail) {
    const snap2 = await getDocs(query(collection(db, "testResults"), where("studentId", "==", currentUserEmail)));
    let last = null;
    snap2.forEach(d => {
      const data = d.data();
      if (!last || data.timestamp.toDate() > last.timestamp.toDate()) last = data;
    });
    if (last) {
      const dateStr = last.timestamp.toDate().toLocaleDateString();
      document.getElementById("latest-score").innerHTML = `
        <h4>📘 Last Test: ${last.testName}</h4>
        <p>Score: ${last.correct}/${last.total} (${Math.round((last.correct/last.total)*100)}%)</p>
        <p><small>${dateStr}</small></p>
      `;
    }
  }

  // Auto Dark Mode after 6pm
  const hr = new Date().getHours();
  document.body.classList.toggle("dark", hr >= 18 || hr < 6);
}

// 7.4 Feature Screens
function renderFlashcards(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="card">
      <h2>📑 Flashcards</h2>
      <p>Coming soon: Swipe through CDL topics for memorization.</p>
      <button data-nav="home">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
}

function renderExperience(container) {
  if (!container) return;
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
  document.getElementById("save-exp-btn").addEventListener("click", async e => {
    e.preventDefault();
    const sel = document.querySelector("input[name=exp]:checked")?.value;
    if (!sel) return alert("Please select your experience level.");
    await addDoc(collection(db, "experienceResponses"), {
      studentId: currentUserEmail,
      experience: sel,
      timestamp: new Date()
    });
    alert("✅ Experience saved!");
    renderPage("home");
  });
}

function renderLicenseSelector(container) {
  if (!container) return;
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
  document.getElementById("save-license-btn").addEventListener("click", async e => {
    e.preventDefault();
    const sel = document.querySelector("input[name=license]:checked")?.value;
    if (!sel) return alert("Please select a license type.");
    await addDoc(collection(db, "licenseSelection"), {
      studentId: currentUserEmail,
      licenseType: sel,
      timestamp: new Date()
    });
    alert("✅ License saved!");
    renderPage("home");
  });
}

async function renderChecklists(container) {
  if (currentUserEmail?.includes("instructor@") || currentUserEmail?.includes("admin@")) {
    return await renderInstructorChecklists(container);
  }
  container.innerHTML = `
    <div class="card fade-in">
      <h2>✅ ELDT Checklist</h2>
      <form id="eldt-form" class="checklist-form"></form>
      <div class="checklist-buttons">
        <button id="save-eldt-btn" class="btn-primary">💾 Save Progress</button>
        <button data-nav="home" class="btn-secondary">⬅️ Home</button>
      </div>
      <div id="saved-summary"></div>
    </div>
  `;
  setupNavigation();
  const checklist = {
    "Pre-trip Inspection": ["Check lights","Check tires","Fluid levels","Leaks under vehicle","Cab safety equipment"],
    "Basic Vehicle Control": ["Straight line backing","Offset backing (left/right)","Parallel parking","Alley dock"],
    "On-Road Driving": ["Lane changes","Turns (left/right)","Intersections","Expressway entry/exit","Railroad crossing"],
    "Hazard Perception": ["Scan for pedestrians","React to road hazards","Mirror checks"],
    "Emergency Maneuvers": ["Skid recovery","Controlled braking","Steering control"]
  };
  let savedData = {};
  const snap = await getDocs(query(collection(db, "eldtProgress"), where("studentId","==",currentUserEmail)));
  if (!snap.empty) snap.forEach(d => savedData = d.data().progress||{});
  const form = document.getElementById("eldt-form");
  Object.entries(checklist).forEach(([section, items]) => {
    const fieldset = document.createElement("fieldset");
    fieldset.innerHTML = `<legend>${section}</legend>`;
    items.forEach(item => {
      const checked = savedData[section]?.[item] ? "checked" : "";
      fieldset.innerHTML += `<label><input type="checkbox" name="${section}::${item}" ${checked}/> ${item}</label><br/>`;
    });
    form.appendChild(fieldset);
  });
  document.getElementById("save-eldt-btn").addEventListener("click", async e => {
    e.preventDefault();
    const inputs = form.querySelectorAll("input[type=checkbox]");
    const progress = {};
    inputs.forEach(i => {
      const [sec, item] = i.name.split("::");
      progress[sec] = progress[sec]||{};
      progress[sec][item] = i.checked;
    });
    const old = await getDocs(query(collection(db,"eldtProgress"),where("studentId","==",currentUserEmail)));
    for(const d of old.docs) await deleteDoc(d.ref);
    await addDoc(collection(db,"eldtProgress"),{ studentId: currentUserEmail, timestamp:new Date(), progress });
    alert("✅ Progress saved!");
    renderPage("checklists");
  });
  if (Object.keys(savedData).length) {
    const summary = document.getElementById("saved-summary");
    summary.innerHTML = `<h3>📋 Saved Progress Summary</h3>`;
    for (const [sec, items] of Object.entries(savedData)) {
      summary.innerHTML += `<strong>${sec}</strong><ul>`;
      for (const [item, done] of Object.entries(items)) {
        summary.innerHTML += `<li>${done?"✅":"❌"} ${item}</li>`;
      }
      summary.innerHTML += `</ul>`;
    }
  }
}

async function renderInstructorChecklists(container) {
  container.innerHTML = `
    <div class="card fade-in">
      <h2>📊 Instructor Checklist Overview</h2>
      <div id="instructor-checklist-results" class="instructor-results">Loading student progress...</div>
      <button data-nav="home" class="btn-secondary">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
  const results = document.getElementById("instructor-checklist-results");
  const snap = await getDocs(collection(db, "eldtProgress"));
  const grouped = {};
  snap.forEach(d => {
    const { studentId, progress } = d.data();
    grouped[studentId] = grouped[studentId]||{};
    Object.entries(progress).forEach(([sec, items]) => grouped[studentId][sec] = items);
  });
  results.innerHTML = "";
  Object.entries(grouped).forEach(([email, secs]) => {
    const card = document.createElement("div");
    card.className = "card mini fade-in";
    card.innerHTML = `<h3>👤 ${email}</h3>`;
    for (const [sec, items] of Object.entries(secs)) {
      card.innerHTML += `<strong>${sec}</strong><ul>`;
      for (const [item, done] of Object.entries(items)) {
        card.innerHTML += `<li>${done?"✅":"❌"} ${item}</li>`;
      }
      card.innerHTML += `</ul>`;
    }
    results.appendChild(card);
  });
}

function renderWalkthrough(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="card fade-in">
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

async function renderTestResults(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="card fade-in">
      <h2>📊 Test Results</h2>
      <div id="results-display" class="results-grid">Loading results...</div>
      <button data-nav="home" class="btn-secondary">⬅️ Home</button>
    </div>
  `;
  setupNavigation();
  const display = document.getElementById("results-display");
  const snap = await getDocs(query(collection(db,"testResults"),where("studentId","==",currentUserEmail)));
  if (snap.empty) {
    display.innerHTML = `<p class="empty-state">😕 No test results found yet.</p>`;
    return;
  }
  const sorted = snap.docs.map(d=>d.data()).sort((a,b)=>b.timestamp.toDate()-a.timestamp.toDate());
  display.innerHTML = "";
  sorted.forEach(data =>{
    const percent = ((data.correct/data.total)*100).toFixed(1);
    const dateStr = new Date(data.timestamp.toDate()).toLocaleDateString();
    display.innerHTML += `
      <div class="result-card fade-in">
        <h3>${data.testName}</h3>
        <p><strong>Score:</strong> ${data.correct}/${data.total} (${percent}%)</p>
        <p><strong>Correct:</strong> ${data.correct} questions</p>
        <p><strong>Date:</strong> ${dateStr}</p>
      </div>
    `;
  });
}

// 7.5 Dashboards
async function renderDashboard() {
  document.body.style.border = "4px solid green";
  const app = document.getElementById("app");
  app.innerHTML = `<div class="dashboard-card slide-in-up fade-in">Loading your dashboard...</div>`;
  const container = document.querySelector(".dashboard-card");
  const user = auth.currentUser;
  const email = user?.email || "unknown";
  const name = email.split("@")[0];
  const roleBadge = getRoleBadge(email);
  const aiTip = await getAITipOfTheDay();
  document.body.classList.toggle("dark-mode", new Date().getHours() >= 18);

  // Data fetch: progress
  let checklistPct = 0, done=0, total=0;
  const eldtSnap = await getDocs(query(collection(db,"eldtProgress"),where("studentId","==",email)));
  eldtSnap.forEach(d=> {
    const prog = d.data().progress;
    Object.values(prog).forEach(sec=> Object.values(sec).forEach(v=>{ total++; if(v) done++; }));
  });
  checklistPct = total ? Math.round((done/total)*100):0;
  const checklistStatus = checklistPct<100?"❌":"✅";

  // Latest test
  let testData = null;
  const testSnap = await getDocs(query(collection(db,"testResults"),where("studentId","==",email)));
  testSnap.forEach(d=>{
    const data = d.data();
    if (!testData || data.timestamp.toDate()>testData.timestamp.toDate()) testData = data;
  });

  // License & experience
  let license = "Not selected", experience = "Unknown";
  const licSnap = await getDocs(query(collection(db,"licenseSelection"),where("studentId","==",email)));
  licSnap.forEach(d=>license=d.data().licenseType||license);
  const expSnap = await getDocs(query(collection(db,"experienceResponses"),where("studentId","==",email)));
  expSnap.forEach(d=>experience=d.data().experience||experience);

  // Study streak
  const today = new Date().toDateString();
  let studyLog = JSON.parse(localStorage.getItem("studyLog")||"[]");
  if (!studyLog.includes(today)) { studyLog.push(today); localStorage.setItem("studyLog",JSON.stringify(studyLog)); }
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-6);
  const streak = studyLog.filter(date=>new Date(date)>=cutoff).length;

  const showChecklistBtn = checklistPct<100;
  const showTestBtn = !testData;

  container.innerHTML = `
    <h1>Welcome back, ${name}!</h1>
    ${roleBadge}
    <div class="ai-tip-box">💡 ${aiTip}</div>

    <div class="dashboard-summary">
      <div class="dashboard-card">
        <h3>📋 Checklist Progress</h3>
        <div class="progress-track"><div class="progress-fill" style="width:${checklistPct}%;"></div></div>
        <p>${checklistPct}% complete</p>
        ${checklistPct<100?`<span class="notify-bubble">!</span>`:""}
        <button data-nav="checklists">View Checklist</button>
      </div>

      <div class="dashboard-card">
        <h3>🧪 Latest Test</h3>
        ${testData?`
          <p><strong>${testData.testName}</strong></p>
          <p>${testData.correct}/${testData.total} correct</p>
          <p><small>${new Date(testData.timestamp.toDate()).toLocaleDateString()}</small></p>
        `:`<p>No tests taken yet.</p>`}
        ${!testData?`<span class="notify-bubble">!</span>`:""}
        <button data-nav="results">View All Results</button>
      </div>

      <div class="dashboard-card">
        <h3>🧾 Your Profile</h3>
        <p>Email: ${email}</p>
        <p>License: ${license}</p>
        <p>Experience: ${experience}</p>
        ${license==="Not selected"?`<span class="notify-bubble">!</span>`:""}
        <button data-nav="license">Update Info</button>
      </div>

      <div class="dashboard-card">
        <h3>🔥 Study Streak</h3>
        <p>${streak} day${streak!==1?"s":""} active this week</p>
        <button onclick="openStudentHelpForm()">Ask the AI Coach</button>
      </div>
    </div>

    <div class="dashboard-actions">
      ${showChecklistBtn?`<button data-nav="checklists">Resume Checklist</button>`:""}
      ${showTestBtn?`<button data-nav="tests">Start First Test</button>`:""}
      <button data-nav="coach">🎧 Talk to AI Coach</button>
    </div>
  `;
  setupNavigation();
}

async function renderInstructorDashboard() {
  const user = auth.currentUser; if (!user) return;
  const name = user.displayName || "Instructor";
  const aiTip = await getAITipOfTheDay();
  document.body.classList.toggle("dark-mode", new Date().getHours()>=18);

  const q = query(collection(db,"users"),where("role","==","student"),where("assignedInstructor","==",user.uid));
  const snap = await getDocs(q);

  let studentCards="", totalProgress=0, totalStudents=0, activityFeed=[];
  for (const d of snap.docs) {
    const s = d.data();
    const prog = s.checklistProgress||0;
    totalProgress+=prog; totalStudents++;
    studentCards+=`
      <div class="card fade-in">
        <h3>${s.displayName||"Unnamed Student"}</h3>
        <p>Email: ${s.email}</p>
        <p>Progress: ${prog}%</p>
        <p>Last Active: ${s.lastActive||"--"}</p>
        <p>Last Score: ${s.lastTestScore||"--"}</p>
        <button class="btn btn-primary" onclick="viewStudentProfile('${d.id}')">View Profile</button>
        <button class="btn btn-secondary" onclick="assignChecklist('${d.id}')">Assign Checklist</button>
        <button class="btn btn-secondary" onclick="messageStudent('${d.id}','${s.displayName||"Student"}')">Message</button>
      </div>
    `;
    if (s.activityLog) {
      activityFeed.push(...s.activityLog.map(msg=>({ name:s.displayName||"Student", message:msg, timestamp:s.lastActive })));
    }
  }
  const avgProgress = totalStudents?Math.round(totalProgress/totalStudents):0;
  activityFeed.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  const recentActivity = activityFeed.slice(0,5).map(e=>`<li><strong>${e.name}</strong>: ${e.message} (${e.timestamp||"recently"})</li>`).join("");

  const appEl = document.getElementById("app");
  appEl.innerHTML = `
    <div class="dashboard fade-in">
      <h2>👋 Welcome, <span class="name">${name}</span> <span class="role-badge">Instructor</span></h2>
      <div class="ai-tip-box">💡 ${aiTip}</div>
      <div class="dashboard-summary">
        <div class="card">
          <h3>📋 Checklist Overview</h3>
          <p>Average Student Progress: <strong>${avgProgress}%</strong></p>
          <div class="progress-bar"><div class="progress-fill" style="width:${avgProgress}%;"></div></div>
        </div>
        <div class="card">
          <h3>🧑‍🎓 Your Students (${totalStudents})</h3>
          ${studentCards||"<p>No students assigned yet.</p>"}
        </div>
        <div class="card">
          <h3>📊 Recent Activity</h3>
          <ul class="activity-feed">${recentActivity||"<li>No recent activity</li>"}</ul>
        </div>
        <div class="card actions">
          <h3>🛠️ Quick Actions</h3>
          <button class="btn btn-secondary" onclick="renderAddStudent()">Add New Student</button>
          <button class="btn btn-secondary" onclick="sendMessageToStudents()">Send Message</button>
          <button class="btn btn-secondary" onclick="viewELDTProgress()">View ELDT Progress</button>
          <button class="btn btn-secondary" onclick="viewStudentQuestions()">View Questions</button>
        </div>
      </div>
    </div>
  `;
  setupNavigation();
}

async function renderAdminDashboard() {
  const user = auth.currentUser; if (!user) return;
  const name = user.displayName || "Admin";
  const aiTip = await getAITipOfTheDay();
  document.body.classList.toggle("dark-mode", new Date().getHours()>=18);

  const snap = await getDocs(collection(db,"users"));
  let userCards="", unverified=0;
  snap.forEach(d=>{
    const u=d.data(); if (!u.verified) unverified++;
    userCards+=`
      <div class="card fade-in">
        <h3>${u.displayName||"Unnamed"} <span class="role-badge">${u.role||"unknown"}</span></h3>
        <p>Email: ${u.email}</p>
        <p>Status: ${u.verified?"✅ Verified":"⚠️ Unverified"}</p>
        <button class="btn btn-secondary" onclick="editUser('${d.id}')">Manage</button>
      </div>
    `;
  });

  const appEl = document.getElementById("app");
  appEl.innerHTML = `
    <div class="dashboard fade-in">
      <h2>👋 Welcome, <span class="name">${name}</span> <span class="role-badge admin">Admin</span></h2>
      <div class="ai-tip-box">💡 ${aiTip}</div>
      <div class="dashboard-summary">
        <div class="card"><h3>👥 All Users (${snap.size})</h3>${userCards}</div>
        <div class="card"><h3>📋 Global Checklist Management</h3><p>Manage the structure of checklist sections and ELDT modules.</p><button class="btn btn-primary" onclick="editChecklist()">Edit Checklist</button></div>
        <div class="card"><h3>🧪 Test Bank</h3><p>Edit or add test questions available to all students.</p><button class="btn btn-primary" onclick="manageTestBank()">Manage Tests</button></div>
        <div class="card"><h3>🕵️ System Activity Log</h3><p>View recent activity by users and system events.</p><button class="btn btn-primary" onclick="viewSystemLogs()">View Logs</button></div>
        <div class="card actions"><h3>🛠️ Quick Actions</h3><button class="btn btn-secondary" onclick="addNewUser()">Add User</button><button class="btn btn-secondary" onclick="addTest()">Add New Test</button><button class="btn btn-secondary" onclick="sendAdminBroadcast()">Send Message</button></div>
      </div>
      ${unverified>0?`<div class="notification-bubble">🔔 ${unverified} unverified user(s)</div>`:""}
    </div>
  `;
  setupNavigation();
}



// ─── 8. GLOBAL PAGE RENDERER ────────────────────────────────────────────────────
function renderPage(page) {
  const container = document.getElementById("app");
  if (!container) return;
  switch (page) {
    case "flashcards":   return renderFlashcards(container);
    case "experience":   return renderExperience(container);
    case "license":      return renderLicenseSelector(container);
    case "checklists":   return renderChecklists(container);
    case "results":      return renderTestResults(container);
    case "walkthrough":  return renderWalkthrough(container);
    case "home":         return renderHome(container);
    case "login":        return renderLogin();
    default:
      container.innerHTML = `<div class="card fade-in"><p>🚧 Page under construction: ${page}</p></div>`;
  }
}



// ─── 9. UI CONTROLS (GLOBAL) ───────────────────────────────────────────────────
// Theme toggle
document.getElementById("theme-toggle")?.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", isDark?"true":"false");
});

// Language selector
document.getElementById("language-selector")?.addEventListener("change", e => {
  alert(`Language switched to ${e.target.value} (UI translation coming soon)`);
});



// ─── 10. ADMIN / INSTRUCTOR MODALS & HELPERS ──────────────────────────────────
function renderAddStudent() {
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Add Student</h3>
        <input type="text" id="studentName" placeholder="Student Name" />
        <input type="email" id="studentEmail" placeholder="Email" />
        <button onclick="submitNewStudent()">Add</button>
        <button onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  showModal(html);
}

async function submitNewStudent() {
  const name  = document.getElementById("studentName").value;
  const email = document.getElementById("studentEmail").value;
  const instructorId = auth.currentUser.uid;
  if (!email) return alert("Email is required.");
  await addDoc(collection(db, "users"), {
    displayName: name,
    email,
    role: "student",
    assignedInstructor: instructorId,
    checklistProgress: 0,
    createdAt: new Date().toISOString()
  });
  closeModal(); renderInstructorDashboard();
}

async function sendMessageToStudents() {
  const msg = prompt("Enter message for all your students:");
  if (!msg) return;
  const instructorId = auth.currentUser.uid;
  const q = query(collection(db,"users"),where("role","==","student"),where("assignedInstructor","==",instructorId));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await addDoc(collection(db,"users",d.id,"messages"), {
      sender: auth.currentUser.displayName||"Instructor",
      message: msg,
      timestamp: new Date().toISOString()
    });
  }
  alert("Message sent to all students.");
}

async function viewELDTProgress() {
  const instructorId = auth.currentUser.uid;
  const q = query(collection(db,"users"),where("role","==","student"),where("assignedInstructor","==",instructorId));
  const snap = await getDocs(q);
  let html = "<h3>ELDT Progress</h3><ul>";
  snap.docs.forEach(d=>{
    const s = d.data();
    html += `<li>${s.displayName||"Student"}: ${s.checklistProgress||0}%</li>`;
  });
  html += "</ul><button onclick='closeModal()'>Close</button>";
  showModal(`<div class="modal-content">${html}</div>`);
}

async function editUser(userId) {
  const docRef = doc(db,"users",userId);
  const docSnap= await getDoc(docRef);
  if (!docSnap.exists()) return alert("User not found.");
  const u = docSnap.data();
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Edit User</h3>
        <label>Role:
          <select id="roleSelect">
            <option value="student" ${u.role==="student"?"selected":""}>Student</option>
            <option value="instructor" ${u.role==="instructor"?"selected":""}>Instructor</option>
            <option value="admin" ${u.role==="admin"?"selected":""}>Admin</option>
          </select>
        </label>
        <label><input type="checkbox" id="verifyCheck" ${u.verified?"checked":""}/> Verified</label>
        <button onclick="saveUserEdits('${userId}')">Save</button>
        <button onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  showModal(html);
}

async function saveUserEdits(userId) {
  const role     = document.getElementById("roleSelect").value;
  const verified = document.getElementById("verifyCheck").checked;
  await updateDoc(doc(db,"users",userId),{ role, verified });
  closeModal(); renderAdminDashboard();
}

function editChecklist() {
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Edit Global Checklist</h3>
        <p>This will open a dedicated editor page for checklists.</p>
        <button onclick="window.location.href='checklist-editor.html'">Go to Editor</button>
        <button onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  showModal(html);
}

async function manageTestBank() {
  const snapshot = await getDocs(collection(db,"tests"));
  let list = "";
  snapshot.forEach(d=> {
    const t = d.data();
    list += `<li>${t.title||"Untitled"} <button onclick="editTest('${d.id}')">Edit</button></li>`;
  });
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Test Bank</h3>
        <ul>${list}</ul>
        <button onclick="addTest()">+ Add New Test</button>
        <button onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
  showModal(html);
}

function editTest(testId) {
  alert("Test Editor for test ID: " + testId);
}

async function viewSystemLogs() {
  const logsRef = collection(db,"logs");
  const snap    = await getDocs(query(logsRef,orderBy("timestamp","desc"),limit(10)));
  let list = "";
  snap.forEach(d=>{
    const l = d.data();
    list += `<li>${l.message} <small>${l.timestamp}</small></li>`;
  });
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>System Activity Logs</h3>
        <ul>${list}</ul>
        <button onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
  showModal(html);
}

function addNewUser() {
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Add New User</h3>
        <input type="text" id="newUserName" placeholder="Full Name" />
        <input type="email" id="newUserEmail" placeholder="Email" />
        <select id="newUserRole">
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
        </select>
        <button onclick="createUser()">Create</button>
        <button onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  showModal(html);
}

async function createUser() {
  const name = document.getElementById("newUserName").value;
  const email= document.getElementById("newUserEmail").value;
  const role = document.getElementById("newUserRole").value;
  if (!email) return alert("Email required.");
  await addDoc(collection(db,"users"),{
    displayName: name,
    email,
    role,
    verified: false,
    createdAt: new Date().toISOString()
  });
  closeModal(); renderAdminDashboard();
}

function addTest() {
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Add New Test</h3>
        <input type="text" id="newTestTitle" placeholder="Test Title" />
        <button onclick="createTest()">Create</button>
        <button onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  showModal(html);
}

async function createTest() {
  const title = document.getElementById("newTestTitle").value;
  if (!title) return alert("Title required.");
  await addDoc(collection(db,"tests"),{
    title,
    questions: [],
    createdAt: new Date().toISOString()
  });
  closeModal(); renderAdminDashboard();
}

function sendAdminBroadcast() {
  const html = `
    <div class="modal">
      <div class="modal-content">
        <h3>Broadcast Message</h3>
        <textarea id="broadcastMessage" placeholder="Message to all users"></textarea>
        <button onclick="sendBroadcast()">Send</button>
        <button onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  showModal(html);
}

async function sendBroadcast() {
  const msg = document.getElementById("broadcastMessage").value;
  if (!msg) return alert("Message required.");
  await addDoc(collection(db,"notifications"), {
    message: msg,
    timestamp: new Date().toISOString(),
    target: "all"
  });
}