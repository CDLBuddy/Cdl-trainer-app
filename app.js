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
const loaderEl      = document.getElementById("app-loader"); // ⏳ full-screen loader
const loaderShownAt = Date.now();                            // time it first appeared

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

  /* fade the loader out after it’s been visible at least 400 ms */
  const elapsed  = Date.now() - loaderShownAt;
  const minShown = 400;                       // ms
  setTimeout(() => loaderEl?.classList.add("hide"),
             Math.max(0, minShown - elapsed));
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

/* ── Infinite-carousel helper ───────────────────────────────────────── */
function initInfiniteCarousel(trackSelector = ".features-inner") {
  const track = document.querySelector(trackSelector);
  if (!track || track.dataset.looped) return;   // already initialised

  /* 1️⃣ duplicate once so we can scroll forever */
  track.innerHTML += track.innerHTML;
  track.dataset.looped = "true";

  /* 2️⃣ reset scroll when we hit either end */
  track.addEventListener("scroll", () => {
    const max = track.scrollWidth / 2;          // length of the original set
    if (track.scrollLeft >= max) {              // passed the end
      track.scrollLeft -= max;                  // jump back to start copy
    } else if (track.scrollLeft <= 0) {         // before the start
      track.scrollLeft += max;                  // jump to end copy
    }
  });
}

/* Auto-scroll helper: seamless drift, pauses on hover/touch */
function initCarousel() {
  const track = document.querySelector(".features-inner");
  if (!track) return;

  // convenience getter -- half the total width (after duplication)
  const half = () => track.scrollWidth / 2;

  let isPaused = false;
  const speed  = 1.0;            // px per frame  (≈36 px/s at 60 fps)

  /* Pause on user interaction */
  ["mouseenter","touchstart"].forEach(evt =>
    track.addEventListener(evt, () => isPaused = true)
  );
  ["mouseleave","touchend"].forEach(evt =>
    track.addEventListener(evt, () => isPaused = false)
  );

  /* Continuous drift loop */
  function drift() {
    if (!isPaused) {
      // add, then wrap with modulus -- no visible jump
      track.scrollLeft = (track.scrollLeft + speed) % half();
    }
    requestAnimationFrame(drift);
  }
  requestAnimationFrame(drift);
}

// ─── 5. RENDER WELCOME SCREEN ──────────────────────────────────────────────
function renderWelcome() {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  /* 1️⃣ Inject the HTML */
  appEl.innerHTML = `
    <div class="welcome-screen">

      <!-- 🌟 Background Glow Bokeh Layer -->
      <div class="bokeh-layer">
        <div class="bokeh-dot" style="top:10%; left:15%; animation-delay:0s;"></div>
        <div class="bokeh-dot" style="top:30%; left:70%; animation-delay:2s;"></div>
        <div class="bokeh-dot" style="top:60%; left:25%; animation-delay:4s;"></div>
        <div class="bokeh-dot" style="top:80%; left:80%; animation-delay:6s;"></div>
      </div>

      <img src="pattern.svg" class="parallax" alt="" />

      <div class="welcome-content fade-in">
        <h1 class="typewriter">
          <span id="headline"></span><span class="cursor">|</span>
        </h1>
        <p>Your all-in-one CDL prep coach. Scroll down to get started!</p>

        <button id="welcome-login-btn" class="btn">
  <span class="icon">🚀</span> Login
</button>

        <!-- Swipeable + infinite carousel -->
        <div class="features">
          <div class="features-inner">
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
  
  initInfiniteCarousel();   
  initCarousel();           

  // navigation wiring
document.getElementById("welcome-login-btn")?.addEventListener("click", () =>
  handleNavigation("login", true)
);
document.querySelector(".fab")?.addEventListener("click", () =>
  handleNavigation("coach", true)
);

  setupNavigation();
  startTypewriter();
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
    case "profile":   renderProfile();   
break;
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

// ─── 8. FULL LOGIN FORM & HANDLERS ────────────────────────────────────────
function renderLogin(container = document.getElementById("app")) {
  if (!container) return;

  /* 1️⃣  NEW GLASS-MORPHIC MARKUP */
  container.innerHTML = `
    <div class="auth-wrapper fade-in">

      <h2 class="auth-head">
        <span class="icon">🚀</span> Login&nbsp;or&nbsp;Signup
      </h2>

      <form id="login-form" class="glass-card">
        <input id="email" type="email" placeholder="Email" required />
        <div class="password-wrap">
          <input id="password" type="password" placeholder="Password" required />
          <button type="button" id="toggle-password" class="eye-btn">👁️</button>
        </div>
        <div id="error-msg" class="error-msg" style="display:none;"></div>
        <button id="login-submit" type="submit" class="btn primary wide">Login&nbsp;/&nbsp;Signup</button>
      </form>

      <div class="auth-actions">
  <button id="back-btn" type="button" class="btn outline">← Back</button>
  <button id="google-login" type="button" class="btn outline">Continue&nbsp;with&nbsp;Google</button>
</div>

      <a id="reset-password" href="#" class="reset-link">Forgot&nbsp;password?</a>
    </div>
  `;

  /* 2️⃣  EXISTING EVENT HANDLERS (unchanged) */
  setupNavigation();                           // still works for data-nav buttons

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
            uid: cred.user.uid,
            email,
            name: "CDL User",
            role: "student",
            verified: false,
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

  /* Back to welcome page */
  document.getElementById("back-btn")
  .addEventListener("click", async () => {
    if (auth.currentUser) {
      try {          // sign the user out so auth listener won't redirect
        await signOut(auth);
      } catch (err) {
        console.error("Sign-out failed:", err);
      }
    }
  handleNavigation("home", true);
  });
}
// ─── 9. STUDENT DASHBOARD ────────────────────────────────────────────────
async function renderDashboard(container = document.getElementById("app")) {
  if (!container) return;

  /* 1️⃣  FETCH DATA ----------------------------------------------------- */
  // Checklist %
  let checklistPct = 0;
  try {
    const snap = await getDocs(
      query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail))
    );
    let total = 0,
      done = 0;
    snap.forEach((d) => {
      const prog = d.data().progress;
      Object.values(prog).forEach((sec) =>
        Object.values(sec).forEach((val) => {
          total++;
          if (val) done++;
        })
      );
    });
    checklistPct = total ? Math.round((done / total) * 100) : 0;
  } catch (e) {
    console.error("ELDT fetch error", e);
  }

  // Last-test summary
  let lastTestStr = "No tests taken yet.";
  try {
    const snap = await getDocs(
      query(collection(db, "testResults"), where("studentId", "==", currentUserEmail))
    );
    let latest = null;
    snap.forEach((d) => {
      const t = d.data();
      if (!latest || t.timestamp.toDate() > latest.timestamp.toDate()) latest = t;
    });
    if (latest) {
      const pct = Math.round((latest.correct / latest.total) * 100);
      lastTestStr = `${latest.testName} – ${pct}% on ${latest.timestamp
        .toDate()
        .toLocaleDateString()}`;
    }
  } catch (e) {
    console.error("TestResults fetch error", e);
  }

  // License & experience
  let license = "Not selected",
    experience = "Unknown";
  try {
    const licSnap = await getDocs(
      query(collection(db, "licenseSelection"), where("studentId", "==", currentUserEmail))
    );
    licSnap.forEach((d) => (license = d.data().licenseType || license));
    const expSnap = await getDocs(
      query(collection(db, "experienceResponses"), where("studentId", "==", currentUserEmail))
    );
    expSnap.forEach((d) => (experience = d.data().experience || experience));
  } catch (e) {
    console.error("Profile fetch error", e);
  }

  // 7-day study streak
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
    streak = log.filter((d) => new Date(d) >= cutoff).length;
  } catch (e) {
    console.error("Streak calc error", e);
  }

  /* 2️⃣  RENDER DASHBOARD LAYOUT --------------------------------------- */
  const name = localStorage.getItem("fullName") || "CDL User";
  const roleBadge = getRoleBadge(currentUserEmail);

  container.innerHTML = `
    <h2 class="dash-head">Welcome back, ${name}! ${roleBadge}</h2>

    <div class="dash-layout">

      <!-- metric cards ---------------------------- -->
      <section class="dash-metrics">

        <div class="glass-card metric" id="metric-checklist">
          <h3>✅ Checklist Progress</h3>
          <progress value="${checklistPct}" max="100"></progress>
          <p><span class="big-num" id="checklist-pct">${checklistPct}</span>% complete</p>
        </div>
        
        <div class="dashboard-card">
  <h3>🧭 Walkthrough</h3>
  <p>Practice the CDL inspection walkthrough and memorize critical phrases.</p>
  <button class="btn" data-nav="walkthrough">Open Walkthrough</button>
</div>

        <div class="glass-card metric">
          <h3>🧪 Last Test</h3>
          <p id="last-test">${lastTestStr}</p>
        </div>

        <div class="glass-card metric">
          <h3>🔥 Study Streak</h3>
          <p><span class="big-num" id="streak-days">${streak}</span> day${
    streak !== 1 ? "s" : ""
  } active this week</p>
        </div>

        <div class="glass-card metric">
          <h3>🚛 Profile</h3>
          <p><strong>License:</strong> ${license}</p>
          <p><strong>Experience:</strong> ${experience}</p>
        </div>

      </section>

      <!-- compact rail ---------------------------- -->
      <aside class="dash-rail">
        <button class="rail-btn" data-nav="profile">👤<span>My&nbsp;Profile</span></button>
        <button class="rail-btn" data-nav="checklist">✅<span>My&nbsp;Checklist</span></button>
        <button class="rail-btn" data-nav="test">🧪<span>Testing</span></button>
        <button class="rail-btn" data-nav="flashcards">🃏<span>Flashcards</span></button>
        <button class="rail-btn" data-nav="coach">🎧<span>AI&nbsp;Coach</span></button>
      </aside>

    </div>

    <div style="text-align:center; margin-top:2rem;">
      <button id="logout-btn" class="btn outline">🚪 Logout</button>
    </div>
  `;

  /* 3️⃣  UPDATE ELEMENTS & WIRE NAV ------------------------------------ */
  document.getElementById("checklist-pct").textContent =
    checklistPct.toString();
  document
    .querySelector("#metric-checklist progress")
    .setAttribute("value", checklistPct);

  setupNavigation();

  document
    .getElementById("logout-btn")
    ?.addEventListener("click", async () => {
      await signOut(auth);
      localStorage.removeItem("fullName");
      localStorage.removeItem("userRole");
      renderWelcome();
    });
}
// ─── 10. MISSING PAGE RENDERERS ────────────────────────────────────────────────
async function renderWalkthrough(container = document.getElementById("app")) {
  if (!auth.currentUser || !auth.currentUser.email) {
    container.innerHTML = "<p>You must be logged in to view this page.</p>";
    return;
  }

  // Get user profile from Firestore using modular API
  let userData;
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", auth.currentUser.email));
    const snap = await getDocs(q);
    userData = snap.empty ? null : snap.docs[0].data();
  } catch (e) {
    container.innerHTML = "<p>Error loading user profile.</p>";
    return;
  }
  const cdlClass = userData?.cdlClass || null;

  let content = `
    <div class="screen-wrapper walkthrough-page fade-in">
      <h2>🧭 CDL Walkthrough Practice</h2>
  `;

  if (!cdlClass) {
    content += `
      <div class="alert-box">
        ⚠️ You haven’t selected your CDL class yet.<br>
        Please go to your <strong>Profile</strong> and select one so we can load the correct walkthrough script.
      </div>
      <button data-nav="profile" class="btn">Go to Profile</button>
    `;
  } else {
    content += `
      <p><strong>CDL Class:</strong> ${cdlClass}</p>
      <p>Study the following walkthrough to prepare for your in-person vehicle inspection test. Critical sections will be highlighted.</p>

      <div class="walkthrough-script">
        <h3>🚨 Three-Point Brake Check (Must Memorize Word-for-Word)</h3>
        <div class="highlight-section">
          <p>"With the engine off and key on, I will release the parking brake, hold the service brake pedal for 1 minute, and check for air loss no more than 3 PSI."</p>
          <p>"Then I will perform a low air warning check, fan the brakes to make sure the warning activates before 60 PSI."</p>
          <p>"Finally, I will fan the brakes to trigger the spring brake pop-out between 20–45 PSI."</p>
        </div>

        <h3>✅ Entering the Vehicle</h3>
        <p>Say: "Getting in using three points of contact."</p>

        <h3>✅ Exiting the Vehicle</h3>
        <p>Say: "Getting out using three points of contact."</p>

        <h3>🔧 Engine Compartment (Sample)</h3>
        <p>Check oil level with dipstick. Look for leaks, cracks, or broken hoses...</p>
        
        <!-- More walkthrough sections will go here -->
      </div>
    `;
  }

  content += `<button data-nav="dashboard" class="btn">⬅️ Back to Dashboard</button></div>`;
  container.innerHTML = content;
  setupNavigation();
}

async function renderProfile(container = document.getElementById("app")) {
  if (!container) return;

  // Fetch user data from Firestore
  let userData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) userData = snap.docs[0].data();
  } catch (e) {
    userData = {};
  }

  // Default values
  const {
    name = "",
    dob = "",
    profilePicUrl = "",
    cdlClass = "",
    cdlPermit = "",
    permitPhotoUrl = "",
    vehicleQualified = "",
    truckPlateUrl = "",
    trailerPlateUrl = "",
    experience = ""
  } = userData;

  container.innerHTML = `
    <div class="screen-wrapper fade-in profile-page" style="max-width: 480px; margin: 0 auto;">
      <h2>👤 My Profile</h2>
      <form id="profile-form" autocomplete="off" style="display:flex; flex-direction:column; gap:1.3rem;">
        <label>
          Name:
          <input type="text" name="name" value="${name}" required />
        </label>
        <label>
          Date of Birth:
          <input type="date" name="dob" value="${dob}" required />
        </label>
        <label>
          Profile Picture:
          <input type="file" name="profilePic" accept="image/*" />
          ${profilePicUrl ? `<img src="${profilePicUrl}" alt="Profile Picture" style="max-width:90px;border-radius:12px;display:block;margin-top:7px;" />` : ""}
        </label>
        <label>
          CDL License Pursued:
          <select name="cdlClass" required>
            <option value="">Select</option>
            <option value="A" ${cdlClass==="A"?"selected":""}>Class A</option>
            <option value="B" ${cdlClass==="B"?"selected":""}>Class B</option>
            <option value="C" ${cdlClass==="C"?"selected":""}>Class C</option>
          </select>
        </label>
        <label>
          Do you have your CDL permit?
          <select name="cdlPermit" required>
            <option value="">Select</option>
            <option value="yes" ${cdlPermit==="yes"?"selected":""}>Yes</option>
            <option value="no" ${cdlPermit==="no"?"selected":""}>No</option>
          </select>
        </label>
        <div id="permit-photo-section" style="${cdlPermit==="yes"?"":"display:none"}">
          <label>
            Upload Permit Photo:
            <input type="file" name="permitPhoto" accept="image/*" />
            ${permitPhotoUrl ? `<img src="${permitPhotoUrl}" alt="Permit Photo" style="max-width:90px;border-radius:8px;display:block;margin-top:7px;" />` : ""}
          </label>
        </div>
        <label>
          Does the vehicle you plan to train/test in qualify for that CDL license?
          <select name="vehicleQualified" required>
            <option value="">Select</option>
            <option value="yes" ${vehicleQualified==="yes"?"selected":""}>Yes</option>
            <option value="no" ${vehicleQualified==="no"?"selected":""}>No</option>
          </select>
        </label>
        <div id="vehicle-photos-section" style="${vehicleQualified==="yes"?"":"display:none"}">
          <label>
            Upload Truck Data Plate Photo:
            <input type="file" name="truckPlate" accept="image/*" />
            ${truckPlateUrl ? `<img src="${truckPlateUrl}" alt="Truck Data Plate" style="max-width:90px;border-radius:8px;display:block;margin-top:7px;" />` : ""}
          </label>
          <label>
            Upload Trailer Data Plate Photo:
            <input type="file" name="trailerPlate" accept="image/*" />
            ${trailerPlateUrl ? `<img src="${trailerPlateUrl}" alt="Trailer Data Plate" style="max-width:90px;border-radius:8px;display:block;margin-top:7px;" />` : ""}
          </label>
        </div>
        <label>
          Experience:
          <select name="experience" required>
            <option value="">Select</option>
            <option value="none" ${experience==="none"?"selected":""}>No experience</option>
            <option value="1-2" ${experience==="1-2"?"selected":""}>1–2 years</option>
            <option value="3-5" ${experience==="3-5"?"selected":""}>3–5 years</option>
            <option value="6-10" ${experience==="6-10"?"selected":""}>6–10 years</option>
            <option value="10+" ${experience==="10+"?"selected":""}>10+ years</option>
          </select>
        </label>
        <button class="btn primary wide" type="submit">Save Profile</button>
        <button class="btn outline" type="button" data-nav="dashboard" style="margin-top:0.5rem;">⬅️ Back to Dashboard</button>
      </form>
    </div>
  `;

  // Show/hide sections based on select fields
  container.querySelector('select[name="cdlPermit"]').addEventListener('change', function() {
    document.getElementById('permit-photo-section').style.display = this.value === "yes" ? "" : "none";
  });
  container.querySelector('select[name="vehicleQualified"]').addEventListener('change', function() {
    document.getElementById('vehicle-photos-section').style.display = this.value === "yes" ? "" : "none";
  });

  setupNavigation();

  // Save handler (expand this to upload images to storage if needed!)
  container.querySelector("#profile-form").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);

    // For demo: Not handling image uploads yet--just save text/choices
    const data = {
      name: fd.get("name"),
      dob: fd.get("dob"),
      cdlClass: fd.get("cdlClass"),
      cdlPermit: fd.get("cdlPermit"),
      vehicleQualified: fd.get("vehicleQualified"),
      experience: fd.get("experience")
      // TODO: image upload handling
    };
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        // Update
        await updateDoc(doc(db, "users", snap.docs[0].id), data);
      }
      showToast("✅ Profile saved!");
    } catch (e) {
      showToast("Profile update failed.");
    }
  };
}

/* ─── PLACEHOLDER RENDERERS TO AVOID ReferenceError ─────────────────── */
function renderFlashcards(c=document.getElementById("app")){
  c.innerHTML = `<div class="screen-wrapper fade-in"><h2>🃏 Flashcards</h2><p>Coming soon…</p><button data-nav="dashboard">⬅️ Back</button></div>`;
  setupNavigation();
}
function renderExperience(c=document.getElementById("app")){
  c.innerHTML = `<div class="screen-wrapper fade-in"><h2>💼 Experience Survey</h2><p>Coming soon…</p><button data-nav="dashboard">⬅️ Back</button></div>`;
  setupNavigation();
}
function renderLicenseSelector(c=document.getElementById("app")){
  c.innerHTML = `<div class="screen-wrapper fade-in"><h2>🚛 Select License</h2><p>Coming soon…</p><button data-nav="dashboard">⬅️ Back</button></div>`;
  setupNavigation();
}

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

// ─── Kick everything off ────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  if (!auth.currentUser) renderWelcome();
});