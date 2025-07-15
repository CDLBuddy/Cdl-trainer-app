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
// Loader overlay controller (used by auth + navigation)
function showPageTransitionLoader() {
  const overlay = document.getElementById('loader-overlay');
  if (overlay) overlay.classList.remove('hidden');
}

function hidePageTransitionLoader() {
  const overlay = document.getElementById('loader-overlay');
  if (overlay) {
    setTimeout(() => overlay.classList.add('hidden'), 400);
  }
}
// ─── Fade-In on Scroll Animation ──────────────────────────────────────────────
function initFadeInOnScroll() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in-on-scroll').forEach(el => observer.observe(el));
}
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

  // Hide static loading overlays
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

      // 2 Save to localStorage
      localStorage.setItem("userRole", userData.role || "student");
      localStorage.setItem("fullName", userData.name || "CDL User");

    } catch (err) {
      console.error("❌ User profile error:", err);
      showToast("Error loading profile: " + (err.message || err));
      alert("🛑 Firestore error: " + (err.message || err));
      return;
    }

    // 3 Setup logout button
    document.getElementById("logout-btn")?.addEventListener("click", async () => {
      try {
        await signOut(auth);
        showToast("You’ve been logged out.");
        showPageTransitionLoader();
        setTimeout(() => {
          renderWelcome();
          hidePageTransitionLoader();
        }, 300);
      } catch (err) {
        console.error("Logout failed:", err);
        showToast("Logout error");
      }
    });

    // 4 Route to dashboard based on role
    showPageTransitionLoader();
    setTimeout(() => {
      const role = localStorage.getItem("userRole");
      if (role === "admin") {
        renderAdminDashboard();
      } else if (role === "instructor") {
        renderInstructorDashboard();
      } else {
        renderDashboard();
      }
      hidePageTransitionLoader();
    }, 300);

  } else {
    // Signed out → welcome screen
    currentUserEmail = null;
    showPageTransitionLoader();
    setTimeout(() => {
      renderWelcome();
      hidePageTransitionLoader();
    }, 300);
  }

  // Fade the full-screen boot loader after a minimum duration
  const elapsed  = Date.now() - loaderShownAt;
  const minShown = 400; // ms
    setTimeout(() => loaderEl?.classList.add("hide"), Math.max(0, minShown - elapsed));
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

// ── Infinite-carousel helper ───────────────────────────────────────── //
function initInfiniteCarousel(trackSelector = ".features-inner") {
  const track = document.querySelector(trackSelector);
  if (!track || track.dataset.looped) return;   // already initialised

  // 1 duplicate once so we can scroll forever //
  track.innerHTML += track.innerHTML;
  track.dataset.looped = "true";

  // 2 reset scroll when we hit either end //
  track.addEventListener("scroll", () => {
    const max = track.scrollWidth / 2;          // length of the original set
    if (track.scrollLeft >= max) {              // passed the end
      track.scrollLeft -= max;                  // jump back to start copy
    } else if (track.scrollLeft <= 0) {         // before the start
      track.scrollLeft += max;                  // jump to end copy
    }
  });
}

// Auto-scroll helper: seamless drift, pauses on hover/touch //
function initCarousel() {
  const track = document.querySelector(".features-inner");
  if (!track) return;

  // convenience getter -- half the total width (after duplication)
  const half = () => track.scrollWidth / 2;

  let isPaused = false;
  const speed  = 1.0;            // px per frame  (≈36 px/s at 60 fps)

  // Pause on user interaction //
  ["mouseenter","touchstart"].forEach(evt =>
    track.addEventListener(evt, () => isPaused = true)
  );
  ["mouseleave","touchend"].forEach(evt =>
    track.addEventListener(evt, () => isPaused = false)
  );

  // Continuous drift loop //
  function drift() {
    if (!isPaused) {
      // add, then wrap with modulus -- no visible jump
      track.scrollLeft = (track.scrollLeft + speed) % half();
    }
    requestAnimationFrame(drift);
  }
  requestAnimationFrame(drift);
}

function renderWelcome() {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  appEl.innerHTML = `
    <div class="welcome-screen">
      <div class="bokeh-layer">
        <div class="bokeh-dot parallax-float" style="top:10%; left:15%; animation-delay:0s;"></div>
        <div class="bokeh-dot parallax-float" style="top:30%; left:70%; animation-delay:2s;"></div>
        <div class="bokeh-dot parallax-float" style="top:60%; left:25%; animation-delay:4s;"></div>
        <div class="bokeh-dot parallax-float" style="top:80%; left:80%; animation-delay:6s;"></div>
      </div>
      <div class="welcome-content shimmer-glow fade-in">
        <h1 class="typewriter">
          <span id="headline"></span><span class="cursor">|</span>
        </h1>
        <p>Your all-in-one CDL prep coach. Scroll down to get started!</p>
        <button id="login-btn" class="btn pulse">
          <span class="icon">🚀</span> Login
        </button>
        <div class="features">
          <div class="features-inner">
            <div class="feat"><i>🧪</i><p>Practice Tests</p></div>
            <div class="feat"><i>✅</i><p>Checklists</p></div>
            <div class="feat"><i>📊</i><p>Results</p></div>
            <div class="feat"><i>🎧</i><p>AI Coach</p></div>
          </div>
        </div>
      </div>
      <button class="fab" title="AI Coach" aria-label="Open AI Coach">🎧</button>
    </div>
  `;

  initInfiniteCarousel?.();
  initCarousel?.();
  initFadeInOnScroll?.();
  startTypewriter();
  document.getElementById("login-btn")?.addEventListener("click", () => {
    handleNavigation('login');
  });
}
// ─── 4. SMART NAVIGATION ───────────────────────────────────────────────────────

// Route and transition handler
function handleNavigation(page) {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  const currentScreen = appEl.querySelector(".screen-wrapper");
  if (currentScreen) currentScreen.classList.add("fade-out");

  showPageTransitionLoader();
  setTimeout(() => {
    switch (page) {
      case "dashboard":
        renderDashboard(appEl);
        break;
      case "instructor":
        renderInstructorDashboard(appEl);
        break;
      case "admin":
        renderAdminDashboard(appEl);
        break;
      case "checklist":
        renderChecklists(appEl);
        break;
      case "tests":
        renderPracticeTests(appEl);
        break;
      case "flashcards":
        renderFlashcards(appEl);
        break;
      case "results":
        renderTestResults(appEl);
        break;
      case "coach":
        renderAICoach(appEl);
        break;
      case "profile":
        renderProfile(appEl);
        break;
      case "walkthrough":
        renderWalkthrough(appEl);
        break;
      case "login":
        renderLogin(appEl);
        break;
      case "home":
        renderHome(appEl);
        break;
      default:
        renderHome(appEl);
        break;
    }

    if (page !== location.hash.replace("#", "")) {
      history.pushState({}, "", "#" + page);
    }
    hidePageTransitionLoader();
  }, 350);
}

// Click listener + browser history
function setupNavigation() {
  // Handle button clicks
  document.body.addEventListener("click", (e) => {
    const target = e.target.closest("[data-nav]");
    if (target) {
      const page = target.getAttribute("data-nav");
      if (page) {
        handleNavigation(page);
      }
    }
  });

  // Handle browser back/forward buttons
  window.addEventListener("popstate", () => {
    const page = location.hash.replace("#", "") || "home";
    handleNavigation(page);
  });
}
function renderLogin(container = document.getElementById("app")) {
  container.innerHTML = `
    <div class="login-card fade-in">
      <h2>🚛 CDL Trainer Login</h2>
      <form id="login-form" autocomplete="off">
        <div class="form-group">
          <label>Email</label>
          <input id="email" name="email" type="email" required autocomplete="username" />
        </div>
        <div class="form-group password-group">
          <label>Password</label>
          <div style="position:relative;">
            <input id="login-password" name="password" type="password" required autocomplete="current-password" style="padding-right:2.3rem;">
            <button type="button" id="toggle-password" style="position:absolute;right:7px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--accent);font-size:1.17em;cursor:pointer;">👁</button>
          </div>
        </div>
        <div id="error-msg" style="display:none;color:var(--error);margin-bottom:10px;font-weight:500;"></div>
        <button class="btn primary" type="submit">Log In</button>
        <button type="button" class="btn" id="google-login" style="margin-top:0.8rem;display:flex;align-items:center;justify-content:center;gap:0.5em;">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" style="height:1.1em;width:1.1em;vertical-align:middle;"> Sign in with Google
        </button>
        <button type="button" class="btn outline" id="reset-password" style="margin-top:0.6rem;">Forgot Password?</button>
      </form>
      <div class="login-footer" style="margin-top:1.2rem;">
        New? <button class="btn outline" type="button" id="go-signup">Sign Up</button>
      </div>
      <button class="btn outline" id="back-to-welcome-btn" type="button" style="margin-top:0.8rem;width:100%;">⬅ Back</button>
    </div>
  `;

  // Navigation to sign-up
  const goSignup = container.querySelector("#go-signup");
  if (goSignup) goSignup.onclick = () => renderSignup(container);

  // Password toggle
  const pwdInput = container.querySelector("#login-password");
  const togglePwd = container.querySelector("#toggle-password");
  if (pwdInput && togglePwd) {
    togglePwd.onclick = () => {
      pwdInput.type = pwdInput.type === "password" ? "text" : "password";
      togglePwd.textContent = pwdInput.type === "password" ? "👁" : "🙈";
    };
  }

  setupNavigation();

  // Email/password login
  const loginForm = container.querySelector("#login-form");
  if (loginForm) {
    loginForm.onsubmit = async e => {
      e.preventDefault();
      const email = container.querySelector("#email").value.trim();
      const pwd   = pwdInput.value;
      const errD  = container.querySelector("#error-msg");
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
  }

  // Google sign-in
  const googleBtn = container.querySelector("#google-login");
  if (googleBtn) {
    googleBtn.onclick = async () => {
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
        handleNavigation("dashboard", true);
      } catch (err) {
        showToast("Google Sign-In failed: " + err.message);
      }
    };
  }

  // Reset password
  const resetBtn = container.querySelector("#reset-password");
  if (resetBtn) {
    resetBtn.onclick = async e => {
      e.preventDefault();
      const email = container.querySelector("#email").value.trim();
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

  // Back to welcome page (context-aware and explicit)
  const backBtn = container.querySelector("#back-to-welcome-btn");
  if (backBtn) {
    backBtn.addEventListener("click", async () => {
      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (err) {
          console.error("Sign-out failed:", err);
        }
      }
      renderWelcome(); // Go directly to welcome screen; or use handleNavigation("home")
    });
  }
}

function renderSignup(container = document.getElementById("app")) {
  container.innerHTML = `
    <div class="signup-card fade-in">
      <h2>✍ Sign Up for CDL Trainer</h2>
      <form id="signup-form" autocomplete="off">
        <div class="form-group">
          <label>Name</label>
          <input name="name" type="text" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input name="email" type="email" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input name="password" type="password" required minlength="6" />
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <input name="confirm" type="password" required minlength="6" />
        </div>
        <div class="form-group">
          <label>Role</label>
          <div class="role-badge-select">
            <label>
              <input type="radio" name="role" value="student" checked />
              <span>Student</span>
            </label>
            <label>
              <input type="radio" name="role" value="instructor" />
              <span>Instructor</span>
            </label>
            <label>
              <input type="radio" name="role" value="admin" />
              <span>Admin</span>
            </label>
          </div>
        </div>
        <div class="form-group" id="access-code-group" style="display:none;">
          <label>Instructor/Admin Access Code</label>
          <input name="accessCode" type="text" autocomplete="one-time-code" />
        </div>
        <button class="btn primary" type="submit">Create Account</button>
        <div class="signup-footer" style="margin-top:1rem;">
          Already have an account? <button class="btn outline" type="button" id="go-login">Log In</button>
        </div>
        <button class="btn outline" id="back-to-welcome-btn" type="button" style="margin-top:0.8rem;width:100%;">⬅ Back</button>
      </form>
    </div>
  `;

  // Role toggle: show code only for instructor/admin
  const radioEls = container.querySelectorAll('input[name="role"]');
  const codeGroup = container.querySelector("#access-code-group");
  radioEls.forEach(radio => {
    radio.addEventListener("change", () => {
      if (container.querySelector('input[name="role"]:checked').value !== "student") {
        codeGroup.style.display = "";
      } else {
        codeGroup.style.display = "none";
      }
    });
  });

  // Log In button in footer
  document.getElementById("go-login")?.addEventListener("click", () => renderLogin(container));

  // Context-aware back to welcome button (just like login)
  document.getElementById("back-to-welcome-btn")?.addEventListener("click", () => {
    renderWelcome();
  });

  // TODO: Add your signup handling logic here (validate, check code, create user, etc.)
}
// ─── 9. STUDENT DASHBOARD ────────────────────────────────────────────────
async function renderDashboard(container = document.getElementById("app")) {
  if (!container) return;

  // 1  FETCH DATA ----------------------------------------------------- //
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

 // 2  RENDER DASHBOARD LAYOUT ---------------------------------------
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
          <p><span class="big-num" id="streak-days">${streak}</span> day${streak !== 1 ? "s" : ""} active this week</p>
        </div>

        <div class="glass-card metric">
          <h3>🚛 Profile</h3>
          <p><strong>License:</strong> ${license}</p>
          <p><strong>Experience:</strong> ${experience}</p>
        </div>

      </section>

      <!-- compact scrollable nav ---------------------------- -->
      <div class="dash-rail-wrapper">
        <aside class="dash-rail">
          <button class="rail-btn" data-nav="profile"><i>👤</i><span>My&nbsp;Profile</span></button>
          <button class="rail-btn" data-nav="checklist"><i>✅</i><span>My&nbsp;Checklist</span></button>
          <button class="rail-btn" data-nav="tests"><i>🧪</i><span>Testing</span></button>
          <button class="rail-btn" data-nav="flashcards"><i>🃏</i><span>Flashcards</span></button>
          <button class="rail-btn" data-nav="coach"><i>🎧</i><span>AI&nbsp;Coach</span></button>
        </aside>
      </div>

      <div style="text-align:center; margin-top:2rem;">
        <button id="logout-btn" class="btn outline">🚪 Logout</button>
      </div>
    </div>
  `;

  // Update progress values (in case of re-render)
  document.getElementById("checklist-pct").textContent = checklistPct.toString();
  document.querySelector("#metric-checklist progress").setAttribute("value", checklistPct);

  setupNavigation();

  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.removeItem("fullName");
    localStorage.removeItem("userRole");
    renderWelcome();
  });
}

// Render Walkthrough
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
        ⚠ You haven’t selected your CDL class yet.<br>
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
      </div>
    `;
  }

  content += `
    <button id="back-to-dashboard-btn" class="btn outline" style="margin-top:2rem;">⬅ Dashboard</button>
    </div>
  `;
  container.innerHTML = content;

  // Directly wire back button for clarity and instant return
  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderDashboard();
  });

  setupNavigation(); // Still enable data-nav for profile etc
}
// Render Profile
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
        <button class="btn outline" id="back-to-dashboard-btn" type="button" style="margin-top:0.5rem;">⬅ Dashboard</button>
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

  // Context-aware back navigation (direct, always works)
  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderDashboard();
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
// Render Checklist
async function renderChecklists(container = document.getElementById("app")) {
  if (!auth.currentUser) {
    container.innerHTML = "<p>You must be logged in to view this page.</p>";
    return;
  }

  // --- Load student data (from Firestore) ---
  let userData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", auth.currentUser.email));
    const snap = await getDocs(q);
    if (!snap.empty) userData = snap.docs[0].data();
  } catch (e) {
    userData = {};
  }

  // Simulate system-detected progress
  const {
    cdlClass,
    cdlPermit,
    permitPhotoUrl,
    vehicleQualified,
    truckPlateUrl,
    trailerPlateUrl,
    experience,
    lastTestScore,
    walkthroughProgress,
    studyMinutes,
  } = userData;

  // Calculate completion percent and which sections are incomplete
  let complete = 0, total = 5;
  const checklist = [
    {
      label: "Profile Complete",
      done: cdlClass && cdlPermit && experience,
      link: "profile",
      notify: !(cdlClass && cdlPermit && experience),
    },
    {
      label: "Permit Uploaded",
      done: cdlPermit === "yes" && permitPhotoUrl,
      link: "profile",
      notify: cdlPermit === "yes" && !permitPhotoUrl,
    },
    {
      label: "Vehicle Data Plates Uploaded",
      done: vehicleQualified === "yes" && truckPlateUrl && trailerPlateUrl,
      link: "profile",
      notify: vehicleQualified === "yes" && (!truckPlateUrl || !trailerPlateUrl),
    },
    {
      label: "Practice Test Passed",
      done: lastTestScore >= 80,
      link: "tests",
      notify: lastTestScore < 80,
    },
    {
      label: "Walkthrough Progress",
      done: walkthroughProgress >= 1,
      link: "walkthrough",
      notify: walkthroughProgress < 1,
    },
  ];
  complete = checklist.filter(x => x.done).length;
  const percent = Math.round((complete / checklist.length) * 100);

  // Page HTML
  container.innerHTML = `
    <div class="screen-wrapper fade-in checklist-page" style="max-width:480px;margin:0 auto;">
      <h2>📋 Student Checklist</h2>
      <div class="progress-track" style="margin-bottom:18px;">
        <div class="progress-fill" style="width:${percent}%;"></div>
        <span class="progress-label">${percent}% Complete</span>
      </div>
      <ul class="checklist-list">
        ${checklist.map(item => `
          <li class="${item.done ? 'done' : ''}">
            <span>${item.label}</span>
            ${item.done 
              ? `<span class="badge badge-success">✔</span>` 
              : `<button class="btn outline btn-sm" data-nav="${item.link}">Complete</button>
                 ${item.notify ? `<span class="notify-bubble">!</span>` : ""}`
            }
          </li>
        `).join("")}
      </ul>
      <button class="btn wide" id="back-to-dashboard-btn" style="margin-top:24px;">⬅ Back to Dashboard</button>
    </div>
  `;

  // Explicit back button (always works, even if navigation logic changes)
  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderDashboard();
  });

  setupNavigation();
}
// Practice Tests
async function renderPracticeTests(container = document.getElementById("app")) {
  const appEl = container || document.getElementById("app");
  if (!appEl) return;

  const tests = ["General Knowledge", "Air Brakes", "Combination Vehicles"];
  const testScores = {};

  try {
    const snap = await getDocs(
      query(collection(db, "testResults"), where("studentId", "==", currentUserEmail))
    );

    tests.forEach(test => {
      const testDocs = snap.docs
        .map(doc => doc.data())
        .filter(d => d.testName === test);
      if (testDocs.length > 0) {
        const latest = testDocs.sort((a, b) =>
          (b.timestamp?.toDate?.() || new Date(b.timestamp)) -
          (a.timestamp?.toDate?.() || new Date(a.timestamp))
        )[0];
        const pct = Math.round((latest.correct / latest.total) * 100);
        testScores[test] = {
          pct,
          passed: pct >= 80,
          lastResult: latest
        };
      }
    });
  } catch (e) {
    console.error("❌ Error loading test results:", e);
  }

  appEl.innerHTML = `
    <div class="screen-wrapper fade-in" style="max-width:600px;margin:0 auto;padding:20px;">
      <h2 class="dash-head">🧪 CDL Practice Tests</h2>
      <p style="margin-bottom: 1.4rem;">Select a practice test to begin:</p>

      <div class="test-list">
        ${tests.map(name => {
          const data = testScores[name];
          const scoreBadge = data
            ? data.passed
              ? `<span class="badge badge-success">✅ ${data.pct}%</span>`
              : `<span class="badge badge-fail">❌ ${data.pct}%</span>`
            : `<span class="badge badge-neutral">⏳ Not attempted</span>`;
          return `
            <div class="glass-card" style="margin-bottom: 1.2rem; padding:18px;">
              <h3 style="margin-bottom: 0.6rem;">${name} ${scoreBadge}</h3>
              <div class="btn-grid">
                <button class="btn wide retake-btn" data-test="${name}">🔁 Retake</button>
                ${data ? `<button class="btn wide outline review-btn" data-test="${name}">🧾 Review</button>` : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <div style="text-align:center; margin-top:2rem;">
        <button id="back-to-dashboard-btn" class="btn outline wide">⬅ Back to Dashboard</button>
      </div>
    </div>
  `;

  setupNavigation();

  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderDashboard();
  });

  setTimeout(() => {
    appEl.querySelectorAll(".retake-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const test = btn.dataset.test;
        showToast(`Restarting "${test}" test…`);
        renderTestEngine(appEl, test);
      });
    });

    appEl.querySelectorAll(".review-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const test = btn.dataset.test;
        showToast(`Loading your last "${test}" result…`);
        renderTestReview(appEl, test);
      });
    });
  }, 0);
}
async function renderTestReview(container, testName) {
  container.innerHTML = `<div class="screen-wrapper fade-in"><h2>🧾 ${testName} Review</h2><p>Loading...</p></div>`;

  try {
    const snap = await getDocs(
      query(collection(db, "testResults"), where("studentId", "==", currentUserEmail))
    );

    const results = snap.docs
      .map(doc => doc.data())
      .filter(d => d.testName === testName)
      .sort((a, b) =>
        (b.timestamp?.toDate?.() || new Date(b.timestamp)) -
        (a.timestamp?.toDate?.() || new Date(a.timestamp))
      );

    if (results.length === 0) {
      container.innerHTML = `<p>No results found for this test.</p>`;
      return;
    }

    const latest = results[0];
    const pct = Math.round((latest.correct / latest.total) * 100);

    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="max-width:600px;margin:0 auto;padding:20px;">
        <h2>🧾 ${testName} Review</h2>
        <p>You scored <strong>${latest.correct}/${latest.total}</strong> (${pct}%)</p>
        <p><em>Question-level review coming soon!</em></p>
        <div style="margin-top:20px;">
          <button class="btn outline" data-nav="practiceTests">⬅ Back to Practice Tests</button>
        </div>
      </div>
    `;

    setupNavigation();
  } catch (e) {
    console.error("❌ Review fetch error:", e);
    container.innerHTML = `<p>Failed to load review data.</p>`;
  }
}
function renderFlashcards(container = document.getElementById("app")) {
  const flashcards = [
    { q: "What is the minimum tread depth for front tires?", a: "4/32 of an inch." },
    { q: "What do you check for on rims?", a: "Bent, damaged, or rust trails." },
    { q: "When must you use 3 points of contact?", a: "When entering and exiting the vehicle." },
    { q: "What triggers the spring brake pop-out?", a: "Low air pressure (between 20–45 PSI)." }
  ];
  let current = 0;

  function renderCard() {
    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="max-width:420px;margin:0 auto;">
        <h2>🃏 CDL Flashcards</h2>
        <div class="flashcard-card" id="flashcard" tabindex="0">
          <div class="flashcard-card-inner">
            <div class="flashcard-front">Q: ${flashcards[current].q}</div>
            <div class="flashcard-back">A: ${flashcards[current].a}</div>
          </div>
        </div>
        <div style="display:flex;gap:1rem;justify-content:center;margin-top:10px;">
          <button id="prev-flash" class="btn outline" ${current === 0 ? "disabled" : ""}>⬅ Prev</button>
          <button id="next-flash" class="btn outline" ${current === flashcards.length-1 ? "disabled" : ""}>Next ➡</button>
        </div>
        <button class="btn wide outline" id="back-to-dashboard-btn" style="margin:26px 0 0 0;">⬅ Back to Dashboard</button>
      </div>
    `;

    // Flip logic
    let flipped = false;
    const flashcard = document.getElementById("flashcard");
    flashcard.onclick = () => {
      flipped = !flipped;
      if (flipped) flashcard.classList.add("flipped");
      else flashcard.classList.remove("flipped");
    };

    // Navigation
    document.getElementById("prev-flash").onclick = () => {
      if (current > 0) { current--; renderCard(); }
    };
    document.getElementById("next-flash").onclick = () => {
      if (current < flashcards.length - 1) { current++; renderCard(); }
    };

    document.getElementById("back-to-dashboard-btn").onclick = () => renderDashboard();
  }

  renderCard();
  setupNavigation();
}
// AI Coach (Student Dashboard Only)
function renderAICoach(container = document.getElementById("app")) {
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>🎧 Talk to Your AI Coach</h2>
      <div id="ai-chat-log" style="border:1px solid #ccc; height:300px; overflow-y:auto; padding:10px; margin-bottom:10px;"></div>
      <textarea id="ai-input" placeholder="Ask a question..." style="width:100%; height:60px; padding:8px;"></textarea>
      <button id="ai-send-btn" style="width:100%; padding:10px; margin-top:6px;">Send</button>
      <button id="back-to-dashboard-btn" class="btn outline wide" style="display:block; margin:20px auto;">⬅ Back to Dashboard</button>
    </div>
  `;

  // Back to student dashboard (explicit for clarity)
  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderDashboard();
  });

  setupNavigation();

  const logEl = document.getElementById("ai-chat-log");
  document.getElementById("ai-send-btn").addEventListener("click", async () => {
    const q = document.getElementById("ai-input").value.trim();
    if (!q) return;
    logEl.innerHTML += `<div style="margin:8px 0;"><strong>You:</strong> ${q}</div>`;
    document.getElementById("ai-input").value = "";
    const reply = await getAITipOfTheDay(); // Replace with your real AI logic if needed!
    logEl.innerHTML += `<div style="margin:8px 0; color:#0066cc;"><strong>AI Coach:</strong> ${reply}</div>`;
    logEl.scrollTop = logEl.scrollHeight;
  });
}

// ─── 10. MISSING PAGE RENDERERS ────────────────────────────────────────────────
// ─── PLACEHOLDER RENDERERS TO AVOID ReferenceError ─────────────────── //
function renderExperience(c=document.getElementById("app")){
  c.innerHTML = `<div class="screen-wrapper fade-in"><h2>🧳 Experience Survey</h2><p>Coming soon…</p><button data-nav="dashboard">⬅ Back</button></div>`;
  setupNavigation();
}
function renderLicenseSelector(c=document.getElementById("app")){
  c.innerHTML = `<div class="screen-wrapper fade-in"><h2>🚛 Select License</h2><p>Coming soon…</p><button data-nav="dashboard">⬅ Back</button></div>`;
  setupNavigation();
}

// Test Results
async function renderTestResults(container) {
  // 1 Show a loading state
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>📊 Test Results</h2>
      <p>Loading...</p>
    </div>`;

  // 2 Fetch testResults for the current user
  const snap = await getDocs(
    query(
      collection(db, "testResults"),
      where("studentId", "==", currentUserEmail)
    )
  );

  // 3) Normalize timestamps (handle either Firestore Timestamp or ISO string
  const results = snap.docs.map(d => {
    const data = d.data();
    const ts   = data.timestamp;
    const date = ts?.toDate
      ? ts.toDate()        // Firestore Timestamp case
      : new Date(ts);      // ISO‐string fallback
    return { ...data, timestamp: date };
  });

  // 4 Sort descending by date
  results.sort((a, b) => b.timestamp - a.timestamp);

  // 5 Build the results HTML
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
        <button data-nav="dashboard" style="padding:8px 16px; margin-right:8px;">⬅ Back to Dashboard</button>
        <button data-nav="tests" style="padding:8px 16px;">🔄 Retake a Test</button>
      </div>
    </div>
  `;

  // 6 Render and re-bind navigation
  container.innerHTML = html;
  setupNavigation();
}

// ─── 11. REAL TEST ENGINE ──────────────────────────────────────────────────────
async function renderTestEngine(container, testName) {
  // 1 Define your question banks
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

  // 2 Grab the selected bank
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