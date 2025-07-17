// app.js

// ─── Global State ─────────────────────────────────────────────────────────────
let currentUserEmail = null;

// ─── 1. MODULE IMPORTS ─────────────────────────────────────────────────────────
// Firebase App
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

// Firestore (all in ONE block)
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Auth (all in ONE block)
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

// UI Helpers (single block)
import {
  showToast,
  setupNavigation,
  showPageTransitionLoader,
  hidePageTransitionLoader,
  getRandomAITip,
  initFadeInOnScroll,
  startTypewriter,
  debounce,
  updateELDTProgress,
  getUserProgress,
  markStudentProfileComplete,
  markStudentPermitUploaded,
  markStudentVehicleUploaded,
  markStudentWalkthroughComplete,
  markStudentTestPassed,
  verifyStudentProfile,
  verifyStudentPermit,
  verifyStudentVehicle,
  reviewStudentWalkthrough,
  adminUnlockStudentModule,
  adminFlagStudent,
  adminResetStudentProgress,
  incrementStudentStudyMinutes,
  logStudySession,
  studentChecklistFields,
  instructorChecklistFields,
  adminChecklistFields
} from "./ui-helpers.js";

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

  // Only animate out if there's a screen to fade
  if (currentScreen) {
    currentScreen.classList.add("fade-out");

    // Listen for fade-out transition end (best for smoothness)
    currentScreen.addEventListener("transitionend", function onFade() {
      currentScreen.removeEventListener("transitionend", onFade);

      doNavigation(page, appEl);
    }, { once: true });

    showPageTransitionLoader(); // Show loader during transition
  } else {
    doNavigation(page, appEl);
  }
}

function doNavigation(page, appEl) {
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
  }

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
//Render login
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
function getNextChecklistAlert(user) {
  // 1. Permit photo
  if (!user.permitPhotoUrl) {
    return '🔔 Permit photo not uploaded! <button data-nav="profile" class="alert-link">Upload now</button>';
  }
  // 2. Vehicle qualified and both plates
  if (user.vehicleQualified === "yes" && (!user.truckPlateUrl || !user.trailerPlateUrl)) {
    return '🔔 Vehicle data not submitted! <button data-nav="profile" class="alert-link">Add now</button>';
  }
  // 3. License class selected
  if (!user.licenseClass) {
    return '🔔 License class not selected! <button data-nav="profile" class="alert-link">Set now</button>';
  }
  // 4. Profile info (date of birth, picture)
  if (!user.dob) {
    return '🔔 Date of birth missing! <button data-nav="profile" class="alert-link">Update profile</button>';
  }
  if (!user.profilePictureUrl) {
    return '🔔 Profile photo missing! <button data-nav="profile" class="alert-link">Add photo</button>';
  }
  // 5. Study streak (if using streaks)
  if (user.studyStreak < 3) {
    return `🔥 Keep it up! You're at a ${user.studyStreak}-day study streak. <button data-nav="coach" class="alert-link">Boost streak</button>`;
  }
  // 6. Walkthrough practiced (optional)
  if (!user.walkthroughPracticed) {
    return '🧭 Walkthrough not practiced! <button data-nav="walkthrough" class="alert-link">Practice now</button>';
  }
  // 7. Passing core CDL tests
  if (!user.tests?.generalKnowledgePassed) {
    return '📝 Complete General Knowledge with a passing grade! <button data-nav="practiceTests" class="alert-link">Take test</button>';
  }
  if (!user.tests?.airBrakesPassed) {
    return '📝 Complete Air Brakes with a passing grade! <button data-nav="practiceTests" class="alert-link">Take test</button>';
  }
  if (!user.tests?.combinationPassed) {
    return '📝 Complete Combination Vehicles with a passing grade! <button data-nav="practiceTests" class="alert-link">Take test</button>';
  }

  // 8. Endorsements required by license class/selections
  if (user.endorsements && Array.isArray(user.endorsements)) {
    const endorsementMap = {
      T: "Doubles/Triples",
      P: "Passenger",
      S: "School Bus",
      N: "Tank Vehicle",
      H: "Hazardous Materials",
      X: "Tanker + Hazmat Combo"
    };
    for (let e of user.endorsements) {
      const passKey = `endorsement_${e}_Passed`; // e.g. endorsement_T_Passed
      if (!user.tests?.[passKey]) {
        return `📝 Complete ${endorsementMap[e] || e} with a passing grade! <button data-nav="practiceTests" class="alert-link">Take test</button>`;
      }
    }
  }
  // 9. All done!
  return '✅ All checklist steps are complete!';
}
// ─── 9. STUDENT DASHBOARD ────────────────────────────────────────────────
async function renderDashboard(container = document.getElementById("app")) {
  if (!container) return;

  // 1  FETCH DATA ----------------------------------------------------- //
  if (!container) return;

// --- Fetch student Firestore profile (userData) ---
let userData = {};
try {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", currentUserEmail));
  const snap = await getDocs(q);
  if (!snap.empty) userData = snap.docs[0].data();
} catch (e) {
  userData = {};
}

// --- Checklist Progress ---
let checklistPct = 0;
try {
  const snap = await getDocs(
    query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail))
  );
  let total = 0, done = 0;
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

// --- Last-test summary (optional card/alert) ---
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

// --- License & Experience ---
let license = "Not selected", experience = "Unknown";
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

// --- 7-day Study Streak ---
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

        <div class="dashboard-card">
  <h3>✅ Checklist Progress</h3>
  <div class="progress-bar">
    <div class="progress-fill" style="width: ${checklistPct}%;"></div>
  </div>
  <div class="progress-percent">
    <strong id="checklist-pct">${checklistPct}</strong>% complete
  </div>
  <div class="checklist-alert warning">
    <span>${getNextChecklistAlert(userData)}</span>
  </div>
</div>

        <div class="dashboard-card">
          <h3>🧭 Walkthrough</h3>
          <p>Practice the CDL inspection walkthrough and memorize critical phrases.</p>
          <button class="btn" data-nav="walkthrough">Open Walkthrough</button>
        </div>

        <div class="glass-card metric">
          <h3>🔥 Study Streak</h3>
          <p><span class="big-num" id="streak-days">${streak}</span> day${streak !== 1 ? "s" : ""} active this week</p>
        </div>

        <div class="dashboard-card">
  <h3>🤖 AI Tip of the Day</h3>
  <p>${getRandomAITip()}</p>
  <button data-nav="coach" class="btn ai-tip">Ask AI Coach</button>
</div>

      </section>

      <!-- compact scrollable nav ---------------------------- -->
      <div class="dash-rail-wrapper">
  <aside class="dash-rail">
    <!-- My Profile -->
    <button class="rail-btn profile" data-nav="profile">
      <svg class="profile-icon" width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="26" fill="url(#frostBg)" stroke="#a5c9d6" stroke-width="2.5"/>
        <ellipse cx="28" cy="23" rx="8" ry="8.5" fill="#c4dbe8" fill-opacity="0.96"/>
        <ellipse cx="28" cy="38" rx="15" ry="8.2" fill="#b1d3e5" fill-opacity="0.75"/>
        <ellipse cx="28" cy="28" rx="24" ry="24" fill="none" stroke="#a5c9d6" stroke-width="1.5" opacity="0.45" filter="url(#glow)"/>
        <defs>
          <radialGradient id="frostBg" cx="0" cy="0" r="1" gradientTransform="rotate(65 28 28) scale(44)" gradientUnits="userSpaceOnUse">
            <stop stop-color="#eaf6fa" stop-opacity="0.5"/>
            <stop offset="1" stop-color="#0e1b1b" stop-opacity="0.32"/>
          </radialGradient>
          <filter id="glow" x="0" y="0" width="56" height="56" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="2.2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      <span class="label">My Profile</span>
    </button>

    <!-- My Checklist -->
    <button class="rail-btn checklist" data-nav="checklists" aria-label="My Checklist">
      <svg class="profile-icon" width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="26" fill="url(#frostBg)" stroke="#a5c9d6" stroke-width="2.5"/>
        <rect x="13" y="17" width="30" height="22" rx="6" fill="#b1d3e5" fill-opacity="0.83"/>
        <rect x="19" y="23" width="14" height="2.8" rx="1.3" fill="#fff" opacity="0.82"/>
        <rect x="19" y="28" width="8" height="2.2" rx="1.1" fill="#fff" opacity="0.66"/>
        <polyline points="15.5,29.5 19,33 25.5,25.5" fill="none" stroke="#31e6b5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.99" />
        <ellipse cx="28" cy="28" rx="24" ry="24" fill="none" stroke="#a5c9d6" stroke-width="1.5" opacity="0.45" filter="url(#glow)"/>
        <defs>
          <radialGradient id="frostBg" cx="0" cy="0" r="1" gradientTransform="rotate(65 28 28) scale(44)" gradientUnits="userSpaceOnUse">
            <stop stop-color="#eaf6fa" stop-opacity="0.5"/>
            <stop offset="1" stop-color="#0e1b1b" stop-opacity="0.32"/>
          </radialGradient>
          <filter id="glow" x="0" y="0" width="56" height="56" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="2.2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      <span class="label">My<br>Checklist</span>
    </button>

    <!-- Testing -->
    <button class="rail-btn testing" data-nav="practiceTests" aria-label="Testing">
      <svg class="profile-icon" width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="26" fill="url(#frostBg)" stroke="#a5c9d6" stroke-width="2.5"/>
        <rect x="22" y="14" width="12" height="26" rx="6" fill="#b1d3e5" fill-opacity="0.81"/>
        <rect x="26" y="10" width="4" height="10" rx="2" fill="#c4dbe8" fill-opacity="0.77"/>
        <ellipse cx="28" cy="33" rx="4.5" ry="7" fill="#31e6b5" opacity="0.29"/>
        <rect x="26.7" y="19" width="2.6" height="1.2" rx="0.6" fill="#fff" opacity="0.67"/>
        <rect x="26.7" y="22" width="2.6" height="1.2" rx="0.6" fill="#fff" opacity="0.6"/>
        <rect x="26.7" y="25" width="2.6" height="1.2" rx="0.6" fill="#fff" opacity="0.6"/>
        <ellipse cx="28" cy="28" rx="24" ry="24" fill="none" stroke="#a5c9d6" stroke-width="1.5" opacity="0.45" filter="url(#glow)"/>
        <defs>
          <radialGradient id="frostBg" cx="0" cy="0" r="1" gradientTransform="rotate(65 28 28) scale(44)" gradientUnits="userSpaceOnUse">
            <stop stop-color="#eaf6fa" stop-opacity="0.5"/>
            <stop offset="1" stop-color="#0e1b1b" stop-opacity="0.32"/>
          </radialGradient>
          <filter id="glow" x="0" y="0" width="56" height="56" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="2.2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      <span class="label">Testing<br>&nbsp;</span>
    </button>

    <!-- Flashcards -->
    <button class="rail-btn flashcards" data-nav="flashcards" aria-label="Flashcards">
      <svg class="profile-icon" width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="26" fill="url(#frostBg)" stroke="#a5c9d6" stroke-width="2.5"/>
        <rect x="15" y="17" width="20" height="22" rx="4" fill="#b1d3e5" fill-opacity="0.37" transform="rotate(-7 25 28)" />
        <rect x="21" y="13" width="20" height="28" rx="5" fill="#c4dbe8" fill-opacity="0.89"/>
        <text x="31" y="32" text-anchor="middle" font-size="16" font-family="Arial, Helvetica, sans-serif" fill="#fff" opacity="0.85" font-weight="bold">?</text>
        <rect x="28" y="36" width="8" height="2" rx="1" fill="#31e6b5" opacity="0.62"/>
        <ellipse cx="28" cy="28" rx="24" ry="24" fill="none" stroke="#a5c9d6" stroke-width="1.5" opacity="0.45" filter="url(#glow)"/>
        <defs>
          <radialGradient id="frostBg" cx="0" cy="0" r="1" gradientTransform="rotate(65 28 28) scale(44)" gradientUnits="userSpaceOnUse">
            <stop stop-color="#eaf6fa" stop-opacity="0.5"/>
            <stop offset="1" stop-color="#0e1b1b" stop-opacity="0.32"/>
          </radialGradient>
          <filter id="glow" x="0" y="0" width="56" height="56" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="2.2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      <span class="label">Flash<br>cards</span>
    </button>

    <!-- AI Coach -->
    <button class="rail-btn coach" data-nav="coach" aria-label="AI Coach">
      <svg class="profile-icon" width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="26" fill="url(#frostBg)" stroke="#a5c9d6" stroke-width="2.5"/>
        <path d="M16 33a12 12 0 0 1 24 0" stroke="#b1d3e5" stroke-width="3" fill="none" opacity="0.92"/>
        <rect x="13" y="32" width="6" height="10" rx="3" fill="#c4dbe8" fill-opacity="0.91"/>
        <rect x="37" y="32" width="6" height="10" rx="3" fill="#c4dbe8" fill-opacity="0.91"/>
        <polyline points="21,42 24,38 28,44 32,36 35,42" fill="none" stroke="#31e6b5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.97"/>
        <ellipse cx="28" cy="28" rx="24" ry="24" fill="none" stroke="#a5c9d6" stroke-width="1.5" opacity="0.45" filter="url(#glow)"/>
        <defs>
          <radialGradient id="frostBg" cx="0" cy="0" r="1" gradientTransform="rotate(65 28 28) scale(44)" gradientUnits="userSpaceOnUse">
            <stop stop-color="#eaf6fa" stop-opacity="0.5"/>
            <stop offset="1" stop-color="#0e1b1b" stop-opacity="0.32"/>
          </radialGradient>
          <filter id="glow" x="0" y="0" width="56" height="56" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="2.2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      <span class="label">AI<br>Coach</span>
    </button>
  </aside>
</div>

<!-- Logout Button - styled to be wider/rectangular and at bottom -->
<button class="rail-btn logout" id="logout-btn" aria-label="Logout" style="display:block; margin:36px auto 18px auto; width:260px; min-height:68px;">
  <svg class="profile-icon" width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="28" cy="28" r="26" fill="url(#frostBg)" stroke="#a5c9d6" stroke-width="2.5"/>
    <rect x="18" y="16" width="14" height="24" rx="4" fill="#b1d3e5" fill-opacity="0.91"/>
    <circle cx="20.7" cy="28" r="1.4" fill="#fff" opacity="0.65"/>
    <polyline points="34,28 41,28" stroke="#31e6b5" stroke-width="2.5" stroke-linecap="round" />
    <polyline points="38,25 41,28 38,31" fill="none" stroke="#31e6b5" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="28" cy="28" rx="24" ry="24" fill="none" stroke="#a5c9d6" stroke-width="1.5" opacity="0.45" filter="url(#glow)"/>
    <defs>
      <radialGradient id="frostBg" cx="0" cy="0" r="1" gradientTransform="rotate(65 28 28) scale(44)" gradientUnits="userSpaceOnUse">
        <stop stop-color="#eaf6fa" stop-opacity="0.5"/>
        <stop offset="1" stop-color="#0e1b1b" stop-opacity="0.32"/>
      </radialGradient>
      <filter id="glow" x="0" y="0" width="56" height="56" filterUnits="userSpaceOnUse">
        <feGaussianBlur stdDeviation="2.2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  </svg>
  <span class="label">Logout</span>
</button>
  `;

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

  // --- Fetch User Data
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

  // --- Fetch Drill/Walkthrough Progress
  let progress = {};
  try {
    progress = await getUserProgress(auth.currentUser.email) || {};
  } catch (e) { progress = {}; }

  // Drill status object (use Firestore progress if present, else empty)
  const completedDrills = {
    fill: !!progress.drills?.fill,
    order: !!progress.drills?.order,
    type: !!progress.drills?.type,
    visual: !!progress.drills?.visual
  };
  let allDrillsComplete = Object.values(completedDrills).every(Boolean);

  // --- Drills Data
  const brakeCheckFull = [
    "With the engine off and key on, I will release the parking brake, hold the service brake pedal for 1 minute, and check for air loss no more than 3 PSI.",
    "Then I will perform a low air warning check, fan the brakes to make sure the warning activates before 60 PSI.",
    "Finally, I will fan the brakes to trigger the spring brake pop-out between 20–45 PSI."
  ];
  const brakeCheckBlanks = [
    {
      text: "With the engine ___ and key on, I will release the ___ brake, hold the ___ brake pedal for 1 minute, and check for air loss no more than ___ PSI.",
      answers: ["off", "parking", "service", "3"]
    },
    {
      text: "Then I will perform a low air warning check, fan the brakes to make sure the warning activates before ___ PSI.",
      answers: ["60"]
    },
    {
      text: "Finally, I will fan the brakes to trigger the spring brake pop-out between ___–___ PSI.",
      answers: ["20", "45"]
    }
  ];
  const brakeCheckSteps = [
    "Release the parking brake",
    "Hold the service brake pedal for 1 minute, check for air loss no more than 3 PSI",
    "Perform low air warning check--fan brakes, warning should activate before 60 PSI",
    "Fan brakes to trigger spring brake pop-out between 20–45 PSI"
  ];
  const visualRecall = [
    {
      img: "brake-gauge.png", // Add or update path
      question: "At what PSI should the low air warning activate?",
      answer: "before 60"
    }
  ];

  let currentDrill = "fill";

  // --- HTML: Main Walkthrough + Drills UI
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
        <h3>🚨 Three-Point Brake Check <span style="color:var(--accent);">(Must Memorize Word-for-Word)</span></h3>
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

      <!-- Drills Progress Bar -->
      <div style="margin:2rem 0 1.3rem 0;">
        <progress value="${Object.values(completedDrills).filter(Boolean).length}" max="4" style="width:100%;"></progress>
        <span>${Object.values(completedDrills).filter(Boolean).length}/4 drills completed</span>
      </div>

      <!-- Drills Nav Bar -->
      <nav class="drills-nav" style="display:flex;gap:0.7rem;margin-bottom:1.2rem;">
        <button data-drill="fill" class="btn small${completedDrills.fill ? ' drill-done' : ''}">Fill-in-the-Blank${completedDrills.fill ? ' ✅' : ''}</button>
        <button data-drill="order" class="btn small${completedDrills.order ? ' drill-done' : ''}">Ordered Steps${completedDrills.order ? ' ✅' : ''}</button>
        <button data-drill="type" class="btn small${completedDrills.type ? ' drill-done' : ''}">Typing Challenge${completedDrills.type ? ' ✅' : ''}</button>
        <button data-drill="visual" class="btn small${completedDrills.visual ? ' drill-done' : ''}">Visual Recall${completedDrills.visual ? ' ✅' : ''}</button>
      </nav>
      <div id="drills-container"></div>
    `;

    // Confetti placeholder (hidden until all drills complete)
    content += `<canvas id="drill-confetti" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:100;"></canvas>`;
  }

  content += `
    <button id="back-to-dashboard-btn" class="btn outline" style="margin-top:2rem;">⬅ Dashboard</button>
    </div>
  `;
  container.innerHTML = content;

  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderDashboard();
  });

  // --- Drills Logic
  const drillsContainer = document.getElementById("drills-container");
  const drillsNav = document.querySelector(".drills-nav");
  let updatedDrills = {...completedDrills};

  function showConfetti() {
    const canvas = document.getElementById('drill-confetti');
    if (!canvas) return;
    canvas.style.display = "block";
    // Simple confetti burst (replace with a better effect if you want)
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    for (let i = 0; i < 80; i++) {
      ctx.beginPath();
      ctx.arc(Math.random()*canvas.width, Math.random()*canvas.height, Math.random()*7+3, 0, 2*Math.PI);
      ctx.fillStyle = `hsl(${Math.random()*360},95%,70%)`;
      ctx.fill();
    }
    setTimeout(() => canvas.style.display = "none", 1800);
  }

  async function markDrillComplete(type) {
    if (updatedDrills[type]) return;
    updatedDrills[type] = true;
    // Save drill completion date to Firestore progress doc
    await updateELDTProgress(auth.currentUser.email, {
      [`drills.${type}`]: true,
      [`drills.${type}CompletedAt`]: new Date().toISOString()
    });
    // Progress bar and nav badge update
    const completedCount = Object.values(updatedDrills).filter(Boolean).length;
    document.querySelector("progress").value = completedCount;
    document.querySelector("progress").nextElementSibling.textContent = `${completedCount}/4 drills completed`;
    drillsNav.querySelector(`[data-drill='${type}']`).innerHTML += " ✅";
    drillsNav.querySelector(`[data-drill='${type}']`).classList.add("drill-done");
    // Check for all drills complete
    if (Object.values(updatedDrills).every(Boolean)) {
      showConfetti();
      showToast("🎉 All drills complete! Walkthrough milestone saved.");
      await markStudentWalkthroughComplete(auth.currentUser.email);
    }
  }
  await incrementStudentStudyMinutes(auth.currentUser.email, 2); // or 1, 3, whatever is fair
await logStudySession(auth.currentUser.email, 2, `Walkthrough Drill: ${type}`);

  function renderDrill(drillType, container) {
    let html = "";
    if (drillType === "fill") {
      html += `<h3>Fill in the Blanks</h3>`;
      brakeCheckBlanks.forEach((item, idx) => {
        html += `<form class="drill-blank" data-idx="${idx}" style="margin-bottom:1.2rem;">`;
        let blanks = 0;
        const text = item.text.replace(/___/g, () => {
          blanks++;
          return `<input type="text" size="5" class="blank-input" data-answer="${item.answers[blanks-1]}" required style="margin:0 3px;" />`;
        });
        html += `<div>${text}</div>
          <button class="btn" type="submit" style="margin-top:0.6rem;">Check</button>
          <div class="drill-result" style="margin-top:0.3rem;"></div>
        </form>`;
      });
    } else if (drillType === "order") {
      html += `<h3>Put the Steps in Order</h3>
        <ul id="order-list" style="list-style:none;padding:0;">`;
      let shuffled = brakeCheckSteps.map((v, i) => ({v, sort: Math.random()}))
                                   .sort((a, b) => a.sort - b.sort)
                                   .map((o) => o.v);
      shuffled.forEach((step, idx) => {
        html += `<li draggable="true" class="order-step" data-idx="${idx}" style="background:#222;padding:7px 11px;border-radius:8px;margin:7px 0;cursor:grab;">${step}</li>`;
      });
      html += `</ul>
        <button class="btn" id="check-order-btn">Check Order</button>
        <div class="drill-result" style="margin-top:0.3rem;"></div>`;
    } else if (drillType === "type") {
      html += `<h3>Type the Brake Check Phrase Word-for-Word</h3>
        <form id="typing-challenge">
          <textarea rows="4" style="width:100%;" placeholder="Type the full phrase here"></textarea>
          <button class="btn" type="submit" style="margin-top:0.5rem;">Check</button>
          <div class="drill-result" style="margin-top:0.3rem;"></div>
        </form>
        <div style="font-size:0.95em;margin-top:0.6rem;opacity:0.6;">Hint: ${brakeCheckFull[0]}</div>`;
    } else if (drillType === "visual") {
      html += `<h3>Visual Recall</h3>
        <div style="margin-bottom:1rem;">
          <img src="${visualRecall[0].img}" alt="Brake Gauge" style="max-width:160px;display:block;margin-bottom:0.7rem;">
          <div>${visualRecall[0].question}</div>
          <input type="text" class="visual-answer" placeholder="Your answer" />
          <button class="btn" id="check-visual-btn" style="margin-left:9px;">Check</button>
          <div class="drill-result" style="margin-top:0.3rem;"></div>
        </div>`;
    }
    container.innerHTML = html;
  }

  function setupDrillsNav(drillNavBar, drillsContainer) {
    ["fill", "order", "type", "visual"].forEach(type => {
      const btn = drillNavBar.querySelector(`[data-drill="${type}"]`);
      btn.onclick = () => {
        currentDrill = type;
        renderDrill(type, drillsContainer);
        setupDrillEvents(type, drillsContainer);
      };
    });
  }

  function setupDrillEvents(type, drillsContainer) {
    // Fill-in-the-blank
    if (type === "fill") {
      drillsContainer.querySelectorAll("form.drill-blank").forEach(form => {
        form.onsubmit = async function(e) {
          e.preventDefault();
          let correct = true, hint = "";
          form.querySelectorAll(".blank-input").forEach((input, i) => {
            const ans = input.dataset.answer.toLowerCase().trim();
            const val = input.value.toLowerCase().trim();
            if (ans !== val) {
              correct = false;
              if (!hint) hint = `Hint: The answer for blank ${i+1} starts with "${ans.charAt(0).toUpperCase()}"`;
            }
          });
          if (correct) {
  form.querySelector(".drill-result").innerHTML = `<span style="color:limegreen;font-weight:bold;">✅ Correct!</span>`;
  form.style.background = "#133c19";
  await markDrillComplete("fill");
} else {
  form.querySelector(".drill-result").innerHTML = `<span style="color:#ffd700;font-weight:bold;">❌ Not quite. ${hint}</span>`;
  form.style.animation = "shake 0.25s";
  setTimeout(() => { form.style.animation = ""; }, 300);
}

// Always track study attempt:
await incrementStudentStudyMinutes(auth.currentUser.email, 2); // or whatever minutes is fair
await logStudySession(auth.currentUser.email, 2, `Walkthrough Drill: fill`);
        };
      });
    }
    // Ordered steps
    if (type === "order") {
      let dragging, dragIdx;
      const list = drillsContainer.querySelector("#order-list");
      list.querySelectorAll(".order-step").forEach((li, idx) => {
        li.draggable = true;
        li.ondragstart = () => { dragging = li; dragIdx = idx; };
        li.ondragover = e => e.preventDefault();
        li.ondrop = e => {
          e.preventDefault();
          if (dragging && dragging !== li) {
            if (dragIdx < idx) li.after(dragging);
            else li.before(dragging);
          }
        };
      });
      drillsContainer.querySelector("#check-order-btn").onclick = async () => {
        const ordered = Array.from(list.querySelectorAll(".order-step")).map(li => li.textContent.trim());
        const correct = JSON.stringify(ordered) === JSON.stringify(brakeCheckSteps);
        if (correct) {
  list.nextElementSibling.innerHTML = `<span style="color:limegreen;font-weight:bold;">✅ Correct!</span>`;
  list.style.background = "#133c19";
  await markDrillComplete("order");
} else {
  list.nextElementSibling.innerHTML = `<span style="color:#ffd700;font-weight:bold;">❌ Not quite! Try again.</span>`;
  list.style.animation = "shake 0.25s";
  setTimeout(() => { list.style.animation = ""; }, 300);
}

// Always log study minutes and session
await incrementStudentStudyMinutes(auth.currentUser.email, 2); // or any fair value
await logStudySession(auth.currentUser.email, 2, `Walkthrough Drill: order`);
      };
    }
    // Typing challenge
    if (type === "type") {
      drillsContainer.querySelector("#typing-challenge").onsubmit = async function(e) {
        e.preventDefault();
        const typed = drillsContainer.querySelector("textarea").value.trim().replace(/\s+/g," ");
        const target = brakeCheckFull[0].trim().replace(/\s+/g," ");
        if (typed.toLowerCase() === target.toLowerCase()) {
          drillsContainer.querySelector(".drill-result").innerHTML = `<span style="color:limegreen;font-weight:bold;">✅ Correct!</span>`;
          drillsContainer.querySelector("textarea").style.background = "#133c19";
          await markDrillComplete("type");
        } else {
          drillsContainer.querySelector(".drill-result").innerHTML = `<span style="color:#ffd700;font-weight:bold;">❌ Not exact. Review the phrase and try again.</span>`;
          drillsContainer.querySelector("textarea").style.animation = "shake 0.25s";
          setTimeout(() => { drillsContainer.querySelector("textarea").style.animation = ""; }, 300);
        }
      };
    }
    // Visual recall
    if (type === "visual") {
      drillsContainer.querySelector("#check-visual-btn").onclick = async () => {
        const val = drillsContainer.querySelector(".visual-answer").value.trim().toLowerCase();
        const ans = visualRecall[0].answer.toLowerCase();
        if (val.includes(ans)) {
  drillsContainer.querySelector(".drill-result").innerHTML = `<span style="color:limegreen;font-weight:bold;">✅ Correct!</span>`;
  await markDrillComplete("visual");
} else {
  drillsContainer.querySelector(".drill-result").innerHTML = `<span style="color:#ffd700;font-weight:bold;">❌ Not quite. Hint: Think PSI.</span>`;
  drillsContainer.querySelector(".visual-answer").style.animation = "shake 0.25s";
  setTimeout(() => { drillsContainer.querySelector(".visual-answer").style.animation = ""; }, 300);
}

// Always track study minutes and log the session:
await incrementStudentStudyMinutes(auth.currentUser.email, 2);
await logStudySession(auth.currentUser.email, 2, `Walkthrough Drill: visual`); 
      };
    }
  }

  // Init drills on load (default to first drill)
    if (drillsContainer && drillsNav) {
    renderDrill(currentDrill, drillsContainer);
    setupDrillsNav(drillsNav, drillsContainer);
    setupDrillEvents(currentDrill, drillsContainer);
  }

  setupNavigation();
}
// Render Profile
async function renderProfile(container = document.getElementById("app")) {
  if (!container) return;

  // Fetch user data from Firestore (as before)
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

  // PERMIT UPLOAD HANDLER -- milestone trigger
  container.querySelector('input[name="permitPhoto"]')?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `permits/${currentUserEmail}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Save to Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "users", snap.docs[0].id), { permitPhotoUrl: downloadURL });
      }

      // 🚨 Milestone trigger!
      await markStudentPermitUploaded(currentUserEmail);

      showToast("Permit uploaded and progress updated!");
    } catch (err) {
      showToast("Failed to upload permit: " + err.message);
    }
  });

  // VEHICLE DATA PLATE UPLOAD HANDLER -- milestone trigger
  let truckUploaded = false, trailerUploaded = false;

  container.querySelector('input[name="truckPlate"]')?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const storageRef = ref(storage, `vehicle-plates/${currentUserEmail}-truck`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "users", snap.docs[0].id), { truckPlateUrl: downloadURL });
        truckUploaded = true;
        if (truckUploaded && trailerUploaded) {
          await markStudentVehicleUploaded(currentUserEmail);
        }
      }
      showToast("Truck data plate uploaded!");
    } catch (err) {
      showToast("Failed to upload truck plate: " + err.message);
    }
  });

  container.querySelector('input[name="trailerPlate"]')?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const storageRef = ref(storage, `vehicle-plates/${currentUserEmail}-trailer`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "users", snap.docs[0].id), { trailerPlateUrl: downloadURL });
        trailerUploaded = true;
        if (truckUploaded && trailerUploaded) {
          await markStudentVehicleUploaded(currentUserEmail);
        }
      }
      showToast("Trailer data plate uploaded!");
    } catch (err) {
      showToast("Failed to upload trailer plate: " + err.message);
    }
  });

// PROFILE SAVE HANDLER (already includes milestone)
container.querySelector("#profile-form").onsubmit = async e => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);

  // 1. Pull out simple fields
  const name              = fd.get("name").trim();
  const dob               = fd.get("dob");
  const cdlClass          = fd.get("cdlClass");
  const cdlPermit         = fd.get("cdlPermit");
  const vehicleQualified  = fd.get("vehicleQualified");
  const experience        = fd.get("experience");

  // 2. (Optional) Upload a new profile picture if one was chosen
  let profilePicUrl = userData.profilePicUrl || "";
  const profilePicFile = fd.get("profilePic");
  if (profilePicFile && profilePicFile.size) {
    try {
      const storageRef = ref(storage, `profilePics/${currentUserEmail}`);
      await uploadBytes(storageRef, profilePicFile);
      profilePicUrl = await getDownloadURL(storageRef);
    } catch (err) {
      console.error("Failed to upload profile picture:", err);
      showToast("⚠️ Profile picture upload failed: " + err.message);
    }
  }

  // 3. Update Firestore user doc
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const userDocRef = snap.docs[0].ref;
      await updateDoc(userDocRef, {
        name,
        dob,
        cdlClass,
        cdlPermit,
        vehicleQualified,
        experience,
        profilePicUrl
      });

      // 4. Mark the profile‐complete milestone
      await markStudentProfileComplete(currentUserEmail);

      showToast("✅ Profile saved and progress updated!");
    } else {
      throw new Error("User document not found");
    }
  } catch (err) {
    console.error("Error saving profile:", err);
    showToast("❌ Error saving profile: " + err.message);
  }
};

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

    // --- Milestone: Mark test as passed if pct >= 80 ---
    if (pct >= 80) {
      // Optional: only show toast the first time they pass
      const progress = await getUserProgress(currentUserEmail);
      if (!progress.practiceTestPassed) {
        await markStudentTestPassed(currentUserEmail);
        showToast("🎉 Practice Test milestone complete! Progress updated.");
      }
    }
const minutes = latest?.durationMinutes || 5; // or your best guess/default
await incrementStudentStudyMinutes(currentUserEmail, minutes);
await logStudySession(currentUserEmail, minutes, `Practice Test: ${testName}`);

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

async function renderFlashcards(container = document.getElementById("app")) {
  if (!auth.currentUser || !auth.currentUser.email) {
    container.innerHTML = "<p>You must be logged in to view this page.</p>";
    return;
  }

  // --- Flashcards Data ---
  const flashcards = [
    { q: "What is the minimum tread depth for front tires?", a: "4/32 of an inch." },
    { q: "What do you check for on rims?", a: "Bent, damaged, or rust trails." },
    { q: "When must you use 3 points of contact?", a: "When entering and exiting the vehicle." },
    { q: "What triggers the spring brake pop-out?", a: "Low air pressure (between 20–45 PSI)." }
  ];

  // --- Shuffle option (uncomment if you want random order) ---
  // flashcards.sort(() => Math.random() - 0.5);

  let current = 0;
  let startedAt = Date.now();
  let completed = false;

  function renderCard() {
    if (completed) {
      // --- Session Complete UI ---
      const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      container.innerHTML = `
        <div class="screen-wrapper fade-in" style="max-width:420px;margin:0 auto;">
          <h2>🎉 Flashcard Session Complete!</h2>
          <p>You reviewed <b>${flashcards.length}</b> cards.</p>
          <p><b>${minutes}</b> study minute${minutes === 1 ? '' : 's'} logged!</p>
          <button id="restart-flashcards" class="btn primary" style="margin-top:18px;">🔄 Restart</button>
          <button id="back-to-dashboard-btn" class="btn outline" style="margin:26px 0 0 0;">⬅ Back to Dashboard</button>
        </div>
      `;

      // --- Log study minutes (always, even on restarts) ---
      await incrementStudentStudyMinutes(auth.currentUser.email, minutes);
      await logStudySession(auth.currentUser.email, minutes, "Flashcards");

      showToast("✅ Flashcard session logged!");

      document.getElementById("restart-flashcards")?.addEventListener("click", () => {
        current = 0;
        startedAt = Date.now();
        completed = false;
        renderCard();
      });

      document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
        renderDashboard();
      });

      setupNavigation();
      return;
    }

    // --- Main Flashcard UI ---
    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="max-width:420px;margin:0 auto;">
        <h2>🃏 CDL Flashcards</h2>
        <div style="margin-bottom:1rem;">
          <progress value="${current + 1}" max="${flashcards.length}" style="width:100%;"></progress>
          <div style="text-align:center;">Card ${current + 1} of ${flashcards.length}</div>
        </div>
        <div class="flashcard-card" id="flashcard" tabindex="0" aria-label="Flashcard: Press Enter or tap to flip">
          <div class="flashcard-card-inner">
            <div class="flashcard-front">Q: ${flashcards[current].q}</div>
            <div class="flashcard-back">A: ${flashcards[current].a}</div>
          </div>
        </div>
        <div style="display:flex;gap:1rem;justify-content:center;margin-top:10px;">
          <button id="prev-flash" class="btn outline" ${current === 0 ? "disabled" : ""}>&#8592; Prev</button>
          <button id="flip-flash" class="btn">🔄 Flip</button>
          <button id="next-flash" class="btn outline" ${current === flashcards.length - 1 ? "disabled" : ""}>Next &#8594;</button>
        </div>
        <button class="btn wide outline" id="end-session-btn" style="margin:24px 0 0 0;">✅ End Session</button>
        <button class="btn wide outline" id="back-to-dashboard-btn" style="margin:9px 0 0 0;">⬅ Back to Dashboard</button>
      </div>
    `;

    // --- Flip Logic ---
    let flipped = false;
    const flashcard = document.getElementById("flashcard");
    flashcard.onclick = flipCard;
    document.getElementById("flip-flash")?.addEventListener("click", flipCard);

    function flipCard() {
      flipped = !flipped;
      flashcard.classList.toggle("flipped", flipped);
      if (flipped) flashcard.focus();
    }

    // --- Keyboard Navigation (Enter to flip, arrows to nav) ---
    flashcard.onkeydown = (e) => {
      if (e.key === "Enter") flipCard();
      if (e.key === "ArrowRight" && current < flashcards.length - 1) {
        current++; flipped = false; renderCard();
      }
      if (e.key === "ArrowLeft" && current > 0) {
        current--; flipped = false; renderCard();
      }
    };

    // --- Navigation ---
    document.getElementById("prev-flash")?.addEventListener("click", () => {
      if (current > 0) {
        current--; flipped = false; renderCard();
      }
    });
    document.getElementById("next-flash")?.addEventListener("click", () => {
      if (current < flashcards.length - 1) {
        current++; flipped = false; renderCard();
      }
    });

    document.getElementById("end-session-btn")?.addEventListener("click", () => {
      completed = true; renderCard();
    });

    document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
      renderDashboard();
    });

    setupNavigation();
  }

  renderCard();
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
export { db, auth };