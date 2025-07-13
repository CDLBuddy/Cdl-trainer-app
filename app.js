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
  updateDoc,
  serverTimestamp
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

// ─── Typewriter Headline Logic ───────────────────────────────────────────────
const _headlines = [
  "CDL Buddy",
  "Your CDL Prep Coach",
  "Study Smarter, Not Harder"
];
let _hw = 0, _hc = 0;

function startTypewriter() {
  const el = document.getElementById("headline");
  if (!el) return;

  if (_hc < _headlines[_hw].length) {
    el.textContent += _headlines[_hw][_hc++];
    setTimeout(startTypewriter, 100);
  } else {
    setTimeout(() => {
      el.textContent = "";
      _hc = 0;
      _hw = (_hw + 1) % _headlines.length;
      startTypewriter();
    }, 2000);
  }
}

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

  // Hide loading overlays
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
      showToast("Error loading profile: " + (err.message||err));
      alert("🛑 Firestore error: " + (err.message||err));
      return;
    }

    // 3) Setup logout button
    document.getElementById("logout-btn")?.addEventListener("click", async () => {
      try {
        await signOut(auth);
        showToast("You’ve been logged out.");
        renderWelcome();
      } catch (err) {
        console.error("Logout failed:", err);
        showToast("Logout error");
      }
    });

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
  if (email.includes("admin@"))       return `<span class="role-badge admin">Admin</span>`;
  else if (email.includes("instructor@")) return `<span class="role-badge instructor">Instructor</span>`;
  else                                 return `<span class="role-badge student">Student</span>`;
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

// ─── 5. RENDER WELCOME SCREEN ──────────────────────────────────────────────
function renderWelcome() {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  appEl.innerHTML = `
    <div class="welcome-screen">
      <img src="pattern.svg" class="parallax" alt="" />

      <div class="welcome-content fade-in">
        <h1 class="typewriter">
          <span id="headline"></span><span class="cursor">|</span>
        </h1>
        <p>Your all-in-one CDL prep coach. Scroll down to get started!</p>

        <button id="login-btn" class="btn">🚀 Login</button>

        <!-- Infinite + swipeable carousel -->
        <div class="features">
          <div class="features-inner">
            <div class="feat"><i>🧪</i><p>Practice Tests</p></div>
            <div class="feat"><i>✅</i><p>Checklists</p></div>
            <div class="feat"><i>📊</i><p>Results</p></div>
            <div class="feat"><i>🎧</i><p>AI Coach</p></div>
            <!-- duplicated -->
            <div class="feat"><i>🧪</i><p>Practice Tests</p></div>
            <div class="feat"><i>✅</i><p>Checklists</p></div>
            <div class="feat"><i>📊</i><p>Results</p></div>
            <div class="feat"><i>🎧</i><p>AI Coach</p></div>
          </div>
        </div>
      </div>

      <button class="fab" title="AI Coach">🎧</button>
    </div>
  `;

  // navigation wiring
  document.getElementById("login-btn")?.addEventListener("click", () =>
    handleNavigation("login", true)
  );
  document.querySelector(".fab")?.addEventListener("click", () =>
    handleNavigation("coach", true)
  );

  setupNavigation();
  startTypewriter();
  initCarousel();   // ← kick off swipe+auto-loop
}


// ─── CAROUSEL SWIPE + AUTO-LOOP ─────────────────────────────────────────────
function initCarousel() {
  const carousel = document.querySelector(".features");
  const inner    = carousel.querySelector(".features-inner");
  let isHovering = false;

  // Pause auto-scroll on user interaction
  ["mouseenter", "touchstart"].forEach(evt =>
    carousel.addEventListener(evt, () => isHovering = true)
  );
  ["mouseleave", "touchend"].forEach(evt =>
    carousel.addEventListener(evt, () => isHovering = false)
  );

  // Every 3s, advance one card -- if past half, jump back to start
  setInterval(() => {
    if (isHovering) return;
    const cardWidth = inner.querySelector(".feat").offsetWidth;
    carousel.scrollBy({ left: cardWidth, behavior: "smooth" });

    if (carousel.scrollLeft >= inner.scrollWidth / 2) {
      // instant jump back (no animation) to loop
      carousel.scrollTo({ left: 0 });
    }
  }, 3000);
}

// ─── 6. NAVIGATION SETUP ───────────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      handleNavigation(btn.getAttribute("data-nav"), true);
    });
  });
}

// ─── 7. CORE NAVIGATION HANDLER & DISPATCHER ───────────────────────────────────
async function handleNavigation(targetPage, pushToHistory = false) {
  console.log(`🧭 handleNavigation → ${targetPage}`);

  const appEl = document.getElementById("app");
  if (!appEl) return;

  appEl.classList.remove("fade-in");
  appEl.classList.add("fade-out");
  await new Promise(r => setTimeout(r, 150));

  if (pushToHistory) {
    history.pushState({ page: targetPage }, "", `#${targetPage}`);
  }

  renderPage(targetPage);

  appEl.classList.remove("fade-out");
  appEl.classList.add("fade-in");
}

function renderPage(page) {
  const c = document.getElementById("app");
  if (!c) return;
  switch (page) {
    case "walkthrough": renderWalkthrough(c);    break;
    case "tests":       renderPracticeTests(c);  break;
    case "coach":       renderAICoach(c);        break;
    case "checklists":  renderChecklists(c);     break;
    case "results":     renderTestResults(c);    break;
    case "flashcards":  renderFlashcards(c);     break;
    case "experience":  renderExperience(c);     break;
    case "license":     renderLicenseSelector(c);break;
    case "login":       renderLogin(c);          break;
    case "dashboard":   renderDashboard();       break;
    case "home":        renderWelcome();         break;
    default:            renderDashboard();       break;
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
  setupNavigation();

  const pwdInput = document.getElementById("password");
  document.getElementById("toggle-password").onclick = () => {
    pwdInput.type = pwdInput.type === "password" ? "text" : "password";
  };

  document.getElementById("login-form").onsubmit = async e => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const pwd   = pwdInput.value;
    const errD  = document.getElementById("error-msg");
    errD.style.display = "none";

    if (!email || !pwd) {
      errD.textContent = "Please enter both email and password.";
      errD.style.display = "block";
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, pwd);
      handleNavigation("dashboard", true);
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
            lastLogin: new Date().toISOString()
          });
          showToast("🎉 Account created!");
          handleNavigation("dashboard", true);
        } catch (suErr) {
          errD.textContent = suErr.message;
          errD.style.display = "block";
        }
      } else {
        errD.textContent = err.message;
        errD.style.display = "block";
      }
    }
  };

  document.getElementById("google-login").onclick = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      handleNavigation("dashboard", true);
    } catch (err) {
      showToast("Google Sign-In failed: " + err.message);
    }
  };

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

// Practice Tests
function renderPracticeTests(container) {
  console.log("🧪 renderPracticeTests CALLED");

  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>🧪 CDL Practice Tests</h2>
      <p>Select a practice test to begin:</p>
      <ul style="list-style:none; padding:0;">
        <li><button class="test-btn" data-test="General Knowledge" style="width:100%;">General Knowledge</button></li>
        <li><button class="test-btn" data-test="Air Brakes" style="width:100%;">Air Brakes</button></li>
        <li><button class="test-btn" data-test="Combination Vehicles" style="width:100%;">Combination Vehicles</button></li>
      </ul>
      <button data-nav="dashboard" style="margin-top:20px;">⬅️ Back</button>
    </div>
  `;

  setupNavigation();

  // Confirm test button click binding and hook up the engine
  setTimeout(() => {
    const testBtns = container.querySelectorAll(".test-btn");
    console.log("🔎 Found", testBtns.length, "test buttons");

    testBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        console.log("✅ Clicked:", btn.dataset.test);
        showToast(`Loading "${btn.dataset.test}" test…`);
        renderTestEngine(document.getElementById("app"), btn.dataset.test);
      });
    });
  }, 0);
}

// AI Coach
function renderAICoach(container) {
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>🎧 Talk to Your AI Coach</h2>
      <div id="ai-chat-log" style="border:1px solid #ccc; height:300px; overflow-y:auto; padding:10px; margin-bottom:10px;"></div>
      <textarea id="ai-input" placeholder="Ask a question..." style="width:100%; height:60px; padding:8px;"></textarea>
      <button id="ai-send-btn" style="width:100%; padding:10px; margin-top:6px;">Send</button>
      <button data-nav="dashboard" style="display:block; margin:20px auto;">⬅️ Back</button>
    </div>
  `;
  setupNavigation();
  const logEl = document.getElementById("ai-chat-log");
  document.getElementById("ai-send-btn").addEventListener("click", async () => {
    const q = document.getElementById("ai-input").value.trim();
    if (!q) return;
    logEl.innerHTML += `<div style="margin:8px 0;"><strong>You:</strong> ${q}</div>`;
    document.getElementById("ai-input").value = "";
    const reply = await getAITipOfTheDay();
    logEl.innerHTML += `<div style="margin:8px 0; color:#0066cc;"><strong>AI Coach:</strong> ${reply}</div>`;
    logEl.scrollTop = logEl.scrollHeight;
  });
}

// My Checklist
async function renderChecklists(container) {
  container.innerHTML = `<div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;"><h2>✅ My ELDT Checklist</h2><p>Loading...</p></div>`;

  const q = query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail));
  const snap = await getDocs(q);

  let docId, progressData;
  if (snap.empty) {
    progressData = {
      studentId: currentUserEmail,
      progress: {
        "Section 1": { "Item A": false, "Item B": false },
        "Section 2": { "Item C": false, "Item D": false }
      }
    };
    const r = await addDoc(collection(db, "eldtProgress"), progressData);
    docId = r.id;
  } else {
    docId = snap.docs[0].id;
    progressData = snap.docs[0].data();
  }

  let html = `<div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;"><h2>✅ My ELDT Checklist</h2><ul style="list-style:none; padding:0;">`;
  Object.entries(progressData.progress).forEach(([sect, items]) => {
    html += `<li style="margin-bottom:16px;"><strong>${sect}</strong><ul style="list-style:none; padding-left:12px;">`;
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
  html += `</ul><button data-nav="dashboard">⬅️ Back</button></div>`;

  container.innerHTML = html;
  setupNavigation();

  container.querySelectorAll("input[type=checkbox]").forEach(cb =>
    cb.addEventListener("change", async () => {
      const itemName = cb.dataset.item;
      for (let [sect, items] of Object.entries(progressData.progress)) {
        if (items.hasOwnProperty(itemName)) {
          progressData.progress[sect][itemName] = cb.checked;
          break;
        }
      }
      await updateDoc(doc(db, "eldtProgress", docId), { progress: progressData.progress });
    })
  );
}

// Test Results
async function renderTestResults(container) {
  // 1) Show a loading state
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>📊 Test Results</h2>
      <p>Loading...</p>
    </div>`;

  // 2) Fetch testResults for the current user
  const snap = await getDocs(
    query(
      collection(db, "testResults"),
      where("studentId", "==", currentUserEmail)
    )
  );

  // 3) Normalize timestamps (handle either Firestore Timestamp or ISO string)
  const results = snap.docs.map(d => {
    const data = d.data();
    const ts   = data.timestamp;
    const date = ts?.toDate
      ? ts.toDate()        // Firestore Timestamp case
      : new Date(ts);      // ISO‐string fallback
    return { ...data, timestamp: date };
  });

  // 4) Sort descending by date
  results.sort((a, b) => b.timestamp - a.timestamp);

  // 5) Build the results HTML
  let html = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>📊 Test Results</h2>
      <ul style="list-style:none; padding:0;">
  `;

  if (results.length === 0) {
    html += `<li>No test results found.</li>`;
  } else {
    results.forEach(r => {
      const pct  = Math.round((r.correct / r.total) * 100);
      const date = r.timestamp.toLocaleDateString();
      html  += `
        <li style="margin:8px 0;">
          <strong>${r.testName}</strong> -- ${pct}% (${r.correct}/${r.total}) on ${date}
        </li>
      `;
    });
  }

  html += `
      </ul>
      <div style="text-align:center; margin-top:20px;">
        <button data-nav="dashboard" style="padding:8px 16px; margin-right:8px;">⬅️ Back to Dashboard</button>
        <button data-nav="tests" style="padding:8px 16px;">🔄 Retake a Test</button>
      </div>
    </div>
  `;

  // 6) Render and re-bind navigation
  container.innerHTML = html;
  setupNavigation();
}

// ─── 11. REAL TEST ENGINE ──────────────────────────────────────────────────────
async function renderTestEngine(container, testName) {
  // 1) Define your question banks
  const questionBanks = {
    "General Knowledge": [
      {
        q: "What is the maximum allowed blood alcohol concentration for CDL drivers?",
        choices: ["0.02%", "0.04%", "0.08%", "0.10%"],
        answer: 1
      },
      {
        q: "When approaching a railroad crossing without gates, you should:",
        choices: [
          "Stop, look, and listen",
          "Slow down, look, and prepare to stop",
          "Maintain speed if no train in sight",
          "Honk your horn continuously"
        ],
        answer: 1
      },
      // …add more…
    ],
    "Air Brakes": [
      {
        q: "Before driving with air brakes, you must wait until the air pressure reaches at least:",
        choices: ["60 psi", "80 psi", "100 psi", "120 psi"],
        answer: 2
      },
      {
        q: "The air compressor governor controls:",
        choices: [
          "When the compressor stops pumping air",
          "How fast the compressor runs",
          "The warning buzzer pressure",
          "Brake chamber pressure"
        ],
        answer: 0
      }
    ],
    "Combination Vehicles": [
      {
        q: "The fifth-wheel locking jaws must completely surround the shank of the kingpin. This is called:",
        choices: [
          "Coupling lock",
          "Safety latch",
          "Locking engagement",
          "Full lock"
        ],
        answer: 3
      },
      {
        q: "When uncoupling a trailer you must:",
        choices: [
          "Raise the landing gear",
          "Disengage the locking handle",
          "Chock the trailer wheels",
          "All of the above"
        ],
        answer: 2
      }
    ]
  };

  // 2) Grab the selected bank
  const questions = questionBanks[testName] || [];
  let currentIdx = 0;
  let correctCount = 0;

  // Utility: Render a single question
  function showQuestion() {
    const { q, choices } = questions[currentIdx];
    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
        <h2>🧪 ${testName} (${currentIdx + 1}/${questions.length})</h2>
        <p style="margin:16px 0;"><strong>${q}</strong></p>
        <ul style="list-style:none; padding:0;">
          ${choices
            .map((c, i) => `<li style="margin:8px 0;">
              <button class="choice-btn" data-choice="${i}" style="width:100%; padding:10px;">
                ${c}
              </button>
            </li>`)
            .join("")}
        </ul>
      </div>
    `;
    // Bind choice buttons
    container.querySelectorAll(".choice-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const chosen = parseInt(btn.dataset.choice, 10);
        if (chosen === questions[currentIdx].answer) correctCount++;
        currentIdx++;
        if (currentIdx < questions.length) {
          showQuestion();
        } else {
          showResults();
        }
      });
    });
  }

// ─── inside renderTestEngine ───
async function showResults() {
  const total = questions.length;
  const pct   = total ? Math.round((correctCount / total) * 100) : 0;

  // Save result with Firestore server timestamp
  try {
    await addDoc(collection(db, "testResults"), {
      studentId: currentUserEmail,
      testName:  testName,
      correct:   correctCount,
      total:     total,
      timestamp: serverTimestamp()    // ← server-side timestamp
    });
  } catch (e) {
    console.error("❌ Failed to save test result:", e);
    showToast("Error saving test result");
  }

  // Render results screen
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto; text-align:center;">
      <h2>📊 ${testName} Results</h2>
      <p style="font-size:1.2em; margin:16px 0;">
        You scored <strong>${correctCount}/${total}</strong> (${pct}%)
      </p>
      <button data-nav="dashboard" style="padding:10px 20px; margin-top:20px;">
        🏠 Back to Dashboard
      </button>
      <button data-nav="tests" style="padding:10px 20px; margin-top:12px;">
        🔄 Try Again
      </button>
    </div>
  `;
  setupNavigation();
}

  // Kick things off
  if (questions.length === 0) {
    container.innerHTML = `<p>No questions found for "${testName}".</p>`;
    setupNavigation();
  } else {
    showQuestion();
  }
}

// ─── Kick everything off ───────────────────────────────────────────────────────
renderWelcome();