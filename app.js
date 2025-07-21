// ─── Global State ─────────────────────────────────────────────────────────────
let currentUserEmail = null;
let loaderShownAt = Date.now();
let loaderEl = document.getElementById("app-loader");
// Firebase core + custom helpers from firebase.js
import { db, auth, storage, getLatestUpdate } from "./firebase.js";

// Firestore methods
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Auth
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Storage
import {
  uploadBytes,
  getDownloadURL,
  ref
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

// UI Helpers
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
  adminChecklistFields,
  getNextChecklistAlert,
} from "./ui-helpers.js";

// (future) school branding helpers, etc
// import { getSchoolBranding, ... } from "./ui-helpers.js";

// ─── AUTH STATE LISTENER WITH DEFAULT ROLE ASSIGNMENT ───────────
onAuthStateChanged(auth, async user => {
  // Hide any error or static loading overlays
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
    currentUserEmail = user.email;
    let userRole = "student"; // Default role
    let schoolId = null;
    let userData = {};

    try {
      // Fetch role from userRoles collection (by email)
      const roleDocRef = doc(db, "userRoles", user.email);
      const roleDoc = await getDoc(roleDocRef);

      if (roleDoc.exists()) {
        const data = roleDoc.data();
        userRole = data.role || "student";
        schoolId = data.schoolId || null;
        if (!data.role) {
          showToast("⚠️ No role set in userRoles for: " + user.email, 4000);
        }
      } else {
        // If role doc missing, default to student and notify admin
        showToast("⚠️ No userRoles entry found for: " + user.email, 4000);
        console.warn("No userRoles entry found for:", user.email);
      }

      // Fetch user profile from users collection
      const usersRef = collection(db, "users");
      const snap = await getDocs(query(usersRef, where("email", "==", user.email)));

      if (!snap.empty) {
        userData = snap.docs[0].data();
        // Always sync role field
        if (!userData.role || userData.role !== userRole) {
          userData.role = userRole;
          await setDoc(doc(db, "users", user.email), { ...userData }, { merge: true });
        }
        if (userData.schoolId) schoolId = userData.schoolId;
        localStorage.setItem("fullName", userData.name || "CDL User");
      } else {
        // No user doc: create profile
        userData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || "CDL User",
          role: userRole,
          schoolId: schoolId,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "users", user.email), userData);
        localStorage.setItem("fullName", userData.name);
      }

      // Write role and schoolId for UI logic
      localStorage.setItem("userRole", userRole);
      if (schoolId) localStorage.setItem("schoolId", schoolId);
      else localStorage.removeItem("schoolId");

      // Route strictly by role (no longer blocked by schoolId)
      showPageTransitionLoader();
      setTimeout(() => {
        if (userRole === "admin") {
          renderAdminDashboard();
        } else if (userRole === "instructor") {
          renderInstructorDashboard();
        } else {
          renderDashboard(); // Always fallback to student dashboard
        }
        hidePageTransitionLoader();
      }, 350);

    } catch (err) {
      console.error("❌ Auth/profile error:", err);
      showToast("Error loading profile: " + (err.message || err), 4800);
      renderWelcome();
    }

  } else {
    // Signed out → welcome
    currentUserEmail = null;
    showPageTransitionLoader();
    setTimeout(() => {
      renderWelcome();
      hidePageTransitionLoader();
    }, 300);
  }

  // Hide loader after minimum time
  const elapsed = Date.now() - loaderShownAt;
  setTimeout(() => loaderEl?.classList.add("hide"), Math.max(0, 400 - elapsed));
});

// ─── 4. UTILITY FUNCTIONS ──────────────────────────────────────────────────────

// Show a modal overlay with HTML content
function showModal(html) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

// Close any open modal overlay
function closeModal() {
  document.querySelector(".modal-overlay")?.remove();
}

// Return a styled badge for user role (based on email)
function getRoleBadge(email) {
  if (!email) return "";
  if (email.includes("admin@"))        return `<span class="role-badge admin">Admin</span>`;
  else if (email.includes("instructor@")) return `<span class="role-badge instructor">Instructor</span>`;
  else                                   return `<span class="role-badge student">Student</span>`;
}

// (Async for future: could pull from Firestore if needed)
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
  if (!track || track.dataset.looped) return;   // already initialized

  // Duplicate for infinite scroll illusion
  track.innerHTML += track.innerHTML;
  track.dataset.looped = "true";

  // Seamlessly reset scroll position at loop ends
  track.addEventListener("scroll", () => {
    const max = track.scrollWidth / 2;
    if (track.scrollLeft >= max) {
      track.scrollLeft -= max;
    } else if (track.scrollLeft <= 0) {
      track.scrollLeft += max;
    }
  });
}

// Auto-scroll helper: seamless drift, pauses on hover/touch //
function initCarousel() {
  const track = document.querySelector(".features-inner");
  if (!track) return;
  const half = () => track.scrollWidth / 2;
  let isPaused = false;
  const speed  = 1.0; // px per frame

  // Pause on interaction
  ["mouseenter", "touchstart"].forEach(evt =>
    track.addEventListener(evt, () => isPaused = true)
  );
  ["mouseleave", "touchend"].forEach(evt =>
    track.addEventListener(evt, () => isPaused = false)
  );

  function drift() {
    if (!isPaused) {
      track.scrollLeft = (track.scrollLeft + speed) % half();
    }
    requestAnimationFrame(drift);
  }
  requestAnimationFrame(drift);
}

// Fetch most recent update from Firestore 'updates' collection
async function showLatestUpdate() {
  const updateEl = document.getElementById("latest-update-card");
  if (!updateEl) return;
  updateEl.innerHTML = `<div style="padding:18px;text-align:center;">Loading updates...</div>`;
  const update = await getLatestUpdate();
  if (!update) {
    updateEl.innerHTML = `<div class="update-empty">No recent updates.</div>`;
    return;
  }
  updateEl.innerHTML = `
    <div class="update-banner">
      <div class="update-title">📢 What's New</div>
      <div class="update-content">${update.content || "(No details)"}</div>
      <div class="update-date">${formatDate(update.date)}</div>
    </div>
  `;
}

function formatDate(d) {
  if (!d) return "";
  try {
    const date = d.seconds ? new Date(d.seconds * 1000) : new Date(d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return "";
  }
}

// ── Welcome screen ── //

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
    </div>
  `;

  // Init effects
  initInfiniteCarousel?.();
  initCarousel?.();
  initFadeInOnScroll?.();
  startTypewriter();

  // Login button handler
  document.getElementById("login-btn")?.addEventListener("click", () => {
    handleNavigation('login');
  });

  // Optionally, add handler for floating AI Coach button
  document.querySelector(".fab")?.addEventListener("click", () => {
    handleNavigation('coach');
  });
}

// ─── 4. SMART HYBRID NAVIGATION ───────────────────────────────────────────────

// Helper: Detect mobile (touch device)
function isMobile() {
  return ("ontouchstart" in window) || (window.innerWidth < 900);
}

// Route and transition handler (handles fade or slide)
function handleNavigation(page, direction = "forward") {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  const currentScreen = appEl.querySelector(".screen-wrapper");
  const mobile = isMobile();
  let outClass = mobile
    ? (direction === "forward" ? "slide-out-left" : "slide-out-right")
    : "fade-out";

  if (currentScreen) {
    currentScreen.classList.add(outClass);

    currentScreen.addEventListener("transitionend", function onFade() {
      currentScreen.removeEventListener("transitionend", onFade);
      doNavigation(page, appEl, direction);
    }, { once: true });

    showPageTransitionLoader();
  } else {
    doNavigation(page, appEl, direction);
  }
}

// Navigation switcher (with direction for mobile slide effect)
function doNavigation(page, appEl, direction = "forward") {
  // For browser history: set direction by hash
  let lastHash = window.__lastPageHash || "home";
  window.__lastPageHash = page;
  let navDir = "forward";
  if (window.__navHistory && window.__navHistory.length) {
    const last = window.__navHistory[window.__navHistory.length - 1];
    navDir = last === page ? "back" : "forward";
  }
  if (!window.__navHistory) window.__navHistory = [];
  window.__navHistory.push(page);

  // Render correct page
  switch (page) {
    case "dashboard":      renderDashboard(appEl); break;
    case "instructor":     renderInstructorDashboard(appEl); break;
    case "admin":          renderAdminDashboard(appEl); break;
    case "checklists":     renderChecklists(appEl); break;
    case "practiceTests":  renderPracticeTests(appEl); break;
    case "flashcards":     renderFlashcards(appEl); break;
    case "results":        renderTestResults(appEl); break;
    case "coach":          renderAICoach(appEl); break;
    case "profile":        renderProfile(appEl); break;
    case "walkthrough":    renderWalkthrough(appEl); break;
    case "login":          renderLogin(appEl); break;
    case "home": default:  renderHome(appEl); break;
  }

  // Add incoming animation for new screen
  setTimeout(() => {
    const newScreen = appEl.querySelector(".screen-wrapper");
    if (!newScreen) return;
    const mobile = isMobile();
    newScreen.classList.remove("fade-out", "slide-out-left", "slide-out-right", "fade-in", "slide-in-right", "slide-in-left");
    if (mobile) {
      if (navDir === "back") {
        newScreen.classList.add("slide-in-right");
      } else {
        newScreen.classList.add("slide-in-left");
      }
    } else {
      newScreen.classList.add("fade-in");
    }
    hidePageTransitionLoader();
  }, 10);

  // Only update URL hash if needed
  if (page !== location.hash.replace("#", "")) {
    history.pushState({}, "", "#" + page);
  }
}

// Global event handler for nav buttons (delegated)
document.body.addEventListener("click", (e) => {
  const target = e.target.closest("[data-nav]");
  if (target) {
    const page = target.getAttribute("data-nav");
    if (page) {
      // Smart direction: always forward (unless back)
      let dir = "forward";
      if (window.location.hash.replace("#", "") === page) dir = "back";
      handleNavigation(page, dir);
    }
  }
});

// Browser back/forward support
window.addEventListener("popstate", () => {
  const page = location.hash.replace("#", "") || "home";
  handleNavigation(page, "back");
});

// Render login
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
        // UI will auto-redirect onAuthStateChanged
      } catch (err) {
        if (err.code === "auth/user-not-found") {
          errD.textContent = "No user found. Please sign up first!";
        } else if (err.code === "auth/wrong-password") {
          errD.textContent = "Incorrect password. Try again or reset.";
        } else {
          errD.textContent = err.message || "Login failed. Try again.";
        }
        errD.style.display = "block";
      }
    };
  }

  // Google sign-in
  const googleBtn = container.querySelector("#google-login");
  if (googleBtn) {
    googleBtn.onclick = async () => {
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
        // UI will auto-redirect onAuthStateChanged
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
      renderWelcome();
    });
  }
}

//Render Signup
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

  // Role toggle: show access code only for instructor/admin
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

  // Back to welcome
  document.getElementById("back-to-welcome-btn")?.addEventListener("click", () => renderWelcome());

  // --- Signup form handler ---
  container.querySelector("#signup-form").onsubmit = async (e) => {
    e.preventDefault();

    const form      = e.target;
    const name      = form.name.value.trim();
    const email     = form.email.value.trim().toLowerCase();
    const password  = form.password.value;
    const confirm   = form.confirm.value;
    const role      = form.role.value;
    const accessCode = form.accessCode ? form.accessCode.value.trim() : "";

    // Basic validation
    if (!name || !email || !password || !confirm) {
      showToast("Please fill out all fields.");
      return;
    }
    if (password !== confirm) {
      showToast("Passwords do not match.");
      return;
    }

    // Role/Access Code logic
    let allowed = true;
    const validInstructorCode = "ELDT2024"; // CHANGE FOR PROD
    const validAdminCode = "CDLADMIN"; // CHANGE FOR PROD
    if (role === "instructor" && accessCode !== validInstructorCode) {
      allowed = false;
      showToast("Instructor access code invalid.");
    }
    if (role === "admin" && accessCode !== validAdminCode) {
      allowed = false;
      showToast("Admin access code invalid.");
    }
    if (!allowed) return;

    // Create user with Firebase Auth
    showToast("Creating your account...", 3000);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // Optional: set display name for the current session (Firebase Auth)
      if (user && user.updateProfile) {
        try {
          await user.updateProfile({ displayName: name });
        } catch (err) {
          // Not fatal
          console.warn("Could not update user displayName:", err);
        }
      }

      // Firestore profile
      await setDoc(doc(db, "users", user.email), {
        name,
        email,
        createdAt: serverTimestamp(),
        role
      });

      // UserRoles
      await setDoc(doc(db, "userRoles", user.email), {
        role,
        assignedAt: serverTimestamp()
      });

      // LocalStorage for UI
      localStorage.setItem("fullName", name);
      localStorage.setItem("userRole", role);

      showToast("Account created! Logging in…");
      // Optionally, direct to dashboard, or rely on auth listener to route
      setTimeout(() => renderDashboard(), 1000);

    } catch (err) {
      console.error("Signup error:", err);
      if (err.code === "auth/email-already-in-use") {
        showToast("Email already in use. Try logging in.");
      } else {
        showToast("Signup failed: " + (err.message || err));
      }
    }
  };
}

// ─── 9. STUDENT DASHBOARD ────────────────────────────────────────────────
async function renderDashboard(container = document.getElementById("app")) {
  if (!container) return;
  if (!currentUserEmail) {
    showToast("No user found. Please log in again.");
    renderWelcome();
    return;
  }

  // --- 1. FETCH DATA ---------------------------------------------------
  let userData = {};
  let userRole = localStorage.getItem("userRole") || "student"; // fallback

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      // Prefer Firestore profile role if set
      userRole = userData.role || userRole || "student";
      localStorage.setItem("userRole", userRole);
    }
  } catch (e) {
    userData = {};
  }

  // --- Defensive: only students allowed ---
  if (userRole !== "student") {
    showToast("Access denied: Student dashboard only.");
    renderDashboard(); // Or send to role-based dashboard
    return;
  }

  // --- Checklist Progress (from profileProgress) ---
  let checklistPct = userData.profileProgress || 0;

  // --- Last-test summary (optional card/alert) ---
  let lastTestStr = "No tests taken yet.";
  try {
    const snap = await getDocs(
      query(collection(db, "testResults"), where("studentId", "==", currentUserEmail))
    );
    let latest = null;
    snap.forEach((d) => {
      const t = d.data();
      if (
        !latest ||
        (t.timestamp?.toDate
          ? t.timestamp.toDate()
          : new Date(t.timestamp)) >
          (latest?.timestamp?.toDate
            ? latest.timestamp.toDate()
            : new Date(latest?.timestamp))
      ) {
        latest = t;
      }
    });
    if (latest) {
      const pct = Math.round((latest.correct / latest.total) * 100);
      const dateStr = latest.timestamp?.toDate
        ? latest.timestamp.toDate().toLocaleDateString()
        : new Date(latest.timestamp).toLocaleDateString();
      lastTestStr = `${latest.testName} – ${pct}% on ${dateStr}`;
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

  // --- Student Name & Badge ---
  const name = localStorage.getItem("fullName") || "CDL User";
  const roleBadge = `<span class="role-badge student">Student</span>`;

  // --- Dashboard Layout (HTML) -----------------------------------------
  container.innerHTML = `
    <h2 class="dash-head">Welcome back, ${name}! ${roleBadge}</h2>
    <button class="btn" id="edit-student-profile-btn" style="margin-bottom:1.2rem;max-width:260px;">👤 View/Edit My Profile</button>
    <div class="dash-layout">
      <section class="dash-metrics">

        <!-- --- NEW: "What’s New" Card --- -->
        <div id="latest-update-card" class="dashboard-card update-area"></div>

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

        <div class="dashboard-card ai-tip-card">
          <div class="ai-tip-title" style="font-weight:600; font-size:1.12em; color:var(--accent); margin-bottom:0.5em;">
            🤖 AI Tip of the Day
          </div>
          <div class="ai-tip-content" style="margin-bottom:0.8em; font-size:1.03em;">
            ${getRandomAITip()}
          </div>
          <button class="btn ai-tip" id="ai-tip-btn" aria-label="Open AI Coach">
            <span style="font-size:1.1em;">💬</span> Ask AI Coach
          </button>
        </div>

        <div class="dashboard-card last-test-card">
          <h3>🧪 Last Test Score</h3>
          <p>${lastTestStr}</p>
          <button class="btn" data-nav="practiceTests">Take a Test</button>
        </div>
      </section>

      <div class="dash-rail-wrapper">
        <aside class="dash-rail">
          <!-- My Profile -->
          <button class="rail-btn profile" data-nav="profile" aria-label="My Profile">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#b48aff" stroke-width="2"/>
              <path d="M4 20c0-2.8 3.6-4.2 8-4.2s8 1.4 8 4.2" stroke="#b48aff" stroke-width="2"/>
            </svg>
            <span class="label">My Profile</span>
          </button>
          <!-- My Checklist -->
          <button class="rail-btn checklist" data-nav="checklists" aria-label="My Checklist">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4" width="16" height="16" rx="3" stroke="#a8e063" stroke-width="2"/>
              <path d="M8 13l3 3 5-5" stroke="#a8e063" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="label">My<br>Checklist</span>
          </button>
          <!-- Testing -->
          <button class="rail-btn testing" data-nav="practiceTests" aria-label="Testing">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4" width="16" height="16" rx="3" stroke="#61aeee" stroke-width="2"/>
              <path d="M8 8h8M8 12h8M8 16h8" stroke="#61aeee" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="label">Testing<br>&nbsp;</span>
          </button>
          <!-- Flashcards -->
          <button class="rail-btn flashcards" data-nav="flashcards" aria-label="Flashcards">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="7" width="14" height="10" rx="2" stroke="#ffdb70" stroke-width="2"/>
              <rect x="7" y="9" width="10" height="6" rx="1" stroke="#ffdb70" stroke-width="2"/>
            </svg>
            <span class="label">Flash<br>cards</span>
          </button>
        </aside>
      </div>
      <button class="rail-btn logout wide-logout" id="logout-btn" aria-label="Logout">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="12" height="16" rx="2" stroke="#ff8080" stroke-width="2"/>
          <path d="M17 15l4-3-4-3m4 3H10" stroke="#ff8080" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="label">Logout</span>
      </button>
    </div>
    <button id="ai-coach-fab" aria-label="Ask AI Coach">
      <span class="ai-coach-mascot-wrapper">
        <!-- SVG mascot here (same as before) -->
        <svg id="ai-coach-mascot" viewBox="0 0 64 64" width="46" height="46" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Retro mascot SVG code (see below) -->
          <rect x="5" y="10" width="54" height="38" rx="10" fill="url(#grad1)" stroke="#2b4253" stroke-width="2"/>
          <ellipse cx="32" cy="39" rx="22" ry="9" fill="#253b4e" opacity="0.16"/>
          <rect x="20" y="17" width="24" height="18" rx="7" fill="#fff" fill-opacity="0.09"/>
          <rect x="8" y="13" width="48" height="32" rx="9.5" fill="none" stroke="#82eefd" stroke-width="1.3"/>
          <circle cx="20" cy="28" r="3" fill="#6de090"/>
          <circle cx="44" cy="28" r="3" fill="#6de090"/>
          <ellipse cx="32" cy="34" rx="8" ry="4" fill="#6de090" opacity="0.36"/>
          <rect x="22" y="13" width="20" height="7" rx="3.5" fill="#253b4e"/>
          <text x="32" y="19" text-anchor="middle" fill="#ffe688" font-size="5.5" font-weight="bold" font-family="Verdana">COACH</text>
          <rect x="17" y="42" width="8" height="6" rx="3" fill="#d4eaf7"/>
          <rect x="39" y="42" width="8" height="6" rx="3" fill="#d4eaf7"/>
          <defs>
            <linearGradient id="grad1" x1="0" y1="10" x2="64" y2="48" gradientUnits="userSpaceOnUse">
              <stop stop-color="#a9e6ff"/>
              <stop offset="1" stop-color="#4e91ad"/>
            </linearGradient>
          </defs>
        </svg>
      </span>
    </button>
  `;

  // --- After render: load and display the latest "What’s New" update card ---
  showLatestUpdate(); // This will fill #latest-update-card with the dynamic update

  setupNavigation();

  // --- View/Edit My Profile (Student) ---
  document.getElementById("edit-student-profile-btn")?.addEventListener("click", () => {
    renderProfile();
  });

  document.getElementById("ai-tip-btn")?.addEventListener("click", () => {
    renderAICoach();
  });

  // --- Logout ---
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.removeItem("fullName");
    localStorage.removeItem("userRole");
    renderWelcome();
  });

  // --- Floating FAB Handler (Ask AI Coach) ---
  document.getElementById("ai-coach-fab")?.addEventListener("click", () => {
    renderAICoach();
  });
}

// ─── WALKTHROUGH PAGE ─────────────────────────────────────────────────────────
async function renderWalkthrough(container = document.getElementById("app")) {
  if (!container) return;
  if (!auth.currentUser || !auth.currentUser.email) {
    container.innerHTML = "<p>You must be logged in to view this page.</p>";
    return;
  }

  // --- Fetch user profile (CDL class) ---
  let userData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", auth.currentUser.email));
    const snap = await getDocs(q);
    userData = snap.empty ? {} : snap.docs[0].data();
  } catch (e) {
    container.innerHTML = "<p>Error loading user profile.</p>";
    return;
  }
  const cdlClass = userData?.cdlClass || null;

  // --- Fetch Drill Progress ---
  let progress = {};
  try {
    progress = await getUserProgress(auth.currentUser.email) || {};
  } catch (e) { progress = {}; }
  const completedDrills = {
    fill: !!progress.drills?.fill,
    order: !!progress.drills?.order,
    type: !!progress.drills?.type,
    visual: !!progress.drills?.visual
  };

  // --- Drill Data (for easy updates/expansion) ---
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
      img: "brake-gauge.png", // update path as needed
      question: "At what PSI should the low air warning activate?",
      answer: "before 60"
    }
  ];

  let currentDrill = "fill"; // default

  // --- Walkthrough Main HTML ------------------------------------------
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
      <p>Study the following walkthrough to prepare for your in-person vehicle inspection test. <span style="color:var(--accent);font-weight:bold;">Critical sections will be highlighted.</span></p>

      <div class="walkthrough-script">
        <h3>🚨 Three-Point Brake Check <span style="color:var(--accent);">(Must Memorize Word-for-Word)</span></h3>
        <div class="highlight-section">
          <p>"With the engine off and key on, I will release the parking brake, hold the service brake pedal for 1 minute, and check for air loss no more than 3 PSI."</p>
          <p>"Then I will perform a low air warning check, fan the brakes to make sure the warning activates before 60 PSI."</p>
          <p>"Finally, I will fan the brakes to trigger the spring brake pop-out between 20–45 PSI."</p>
        </div>
        <h3>✅ Entering the Vehicle</h3>
        <p>Say: <strong>"Getting in using three points of contact."</strong></p>
        <h3>✅ Exiting the Vehicle</h3>
        <p>Say: <strong>"Getting out using three points of contact."</strong></p>
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
      <canvas id="drill-confetti" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:100;"></canvas>
    `;
  }

  content += `
    <button id="back-to-dashboard-btn" class="btn outline" style="margin-top:2rem;">⬅ Dashboard</button>
    </div>
  `;
  container.innerHTML = content;

  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderDashboard();
  });
  container.querySelector('[data-nav="profile"]')?.addEventListener("click", () => {
    renderProfile();
  });

  // Drills
  const drillsContainer = document.getElementById("drills-container");
  const drillsNav = document.querySelector(".drills-nav");
  let updatedDrills = {...completedDrills};

  function showConfetti() {
    const canvas = document.getElementById('drill-confetti');
    if (!canvas) return;
    canvas.style.display = "block";
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
    await updateELDTProgress(auth.currentUser.email, {
      [`drills.${type}`]: true,
      [`drills.${type}CompletedAt`]: new Date().toISOString()
    });
    const completedCount = Object.values(updatedDrills).filter(Boolean).length;
    document.querySelector("progress").value = completedCount;
    document.querySelector("progress").nextElementSibling.textContent = `${completedCount}/4 drills completed`;
    drillsNav.querySelector(`[data-drill='${type}']`).innerHTML += " ✅";
    drillsNav.querySelector(`[data-drill='${type}']`).classList.add("drill-done");
    if (Object.values(updatedDrills).every(Boolean)) {
      showConfetti();
      showToast("🎉 All drills complete! Walkthrough milestone saved.");
      await markStudentWalkthroughComplete(auth.currentUser.email);
    }
  }

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
          await incrementStudentStudyMinutes(auth.currentUser.email, 2);
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
        await incrementStudentStudyMinutes(auth.currentUser.email, 2);
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
        await incrementStudentStudyMinutes(auth.currentUser.email, 2);
        await logStudySession(auth.currentUser.email, 2, `Walkthrough Drill: type`);
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
          setTimeout(() => { drillsContainer.querySelector(".visual-answer").style.animation
           = ""; }, 300);
        }
        await incrementStudentStudyMinutes(auth.currentUser.email, 2);
        await logStudySession(auth.currentUser.email, 2, `Walkthrough Drill: visual`);
      };
    }
  }

  // --- Init drills on load (default to first drill) ---
  if (drillsContainer && drillsNav) {
    renderDrill(currentDrill, drillsContainer);
    setupDrillsNav(drillsNav, drillsContainer);
    setupDrillEvents(currentDrill, drillsContainer);
  }

  setupNavigation();
}

// ─── RENDER PROFILE (STUDENT) ─────────────────────────────────────────────
async function renderProfile(container = document.getElementById("app")) {
  if (!container) return;
  if (!currentUserEmail) {
    showToast("No user found. Please log in again."); renderWelcome(); return;
  }

  // Fetch user data
  let userData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) userData = snap.docs[0].data();
    else { showToast("Profile not found."); renderWelcome(); return; }
  } catch { userData = {}; }

  // Fields & defaults
  const {
    name = "", dob = "", profilePicUrl = "",
    cdlClass = "", endorsements = [], restrictions = [],
    experience = "", prevEmployer = "", assignedCompany = "",
    assignedInstructor = "", cdlPermit = "", permitPhotoUrl = "",
    permitExpiry = "", driverLicenseUrl = "", licenseExpiry = "",
    medicalCardUrl = "", medCardExpiry = "",
    vehicleQualified = "", truckPlateUrl = "", trailerPlateUrl = "",
    emergencyName = "", emergencyPhone = "", emergencyRelation = "",
    waiverSigned = false, waiverSignature = "",
    course = "", schedulePref = "", scheduleNotes = "",
    paymentStatus = "", paymentProofUrl = "",
    accommodation = "", studentNotes = "",
    profileProgress = 0
  } = userData;

  // Endorsement & restriction options
  const endorsementOptions = [
    { val: "H", label: "Hazmat (H)" },
    { val: "N", label: "Tanker (N)" },
    { val: "T", label: "Double/Triple Trailers (T)" },
    { val: "P", label: "Passenger (P)" },
    { val: "S", label: "School Bus (S)" },
    { val: "AirBrakes", label: "Air Brakes" },
    { val: "Other", label: "Other" }
  ];
  const restrictionOptions = [
    { val: "auto", label: "Remove Automatic Restriction" },
    { val: "airbrake", label: "Remove Air Brake Restriction" },
    { val: "refresher", label: "One-day Refresher" },
    { val: "roadtest", label: "Road Test Prep" }
  ];

  // Profile completion progress (same logic as your checklist)
  function calcProgress(fd) {
    let total = 15, filled = 0;
    if (fd.get("name")) filled++;
    if (fd.get("dob")) filled++;
    if (profilePicUrl || fd.get("profilePic")?.size) filled++;
    if (fd.get("cdlClass")) filled++;
    if (fd.getAll("endorsements[]").length) filled++;
    if (fd.getAll("restrictions[]").length) filled++;
    if (fd.get("experience")) filled++;
    if (fd.get("cdlPermit")) filled++;
    if (permitPhotoUrl || fd.get("permitPhoto")?.size) filled++;
    if (driverLicenseUrl || fd.get("driverLicense")?.size) filled++;
    if (medicalCardUrl || fd.get("medicalCard")?.size) filled++;
    if (vehicleQualified) filled++;
    if (truckPlateUrl || fd.get("truckPlate")?.size) filled++;
    if (emergencyName && emergencyPhone) filled++;
    if (fd.get("waiver")) filled++;
    return Math.round((filled / total) * 100);
  }

  // HTML
  container.innerHTML = `
    <div class="screen-wrapper fade-in profile-page" style="max-width:480px;margin:0 auto;">
      <h2>👤 Student Profile <span class="role-badge student">Student</span></h2>
      <div class="progress-bar" style="margin-bottom:1.4rem;">
        <div class="progress" style="width:${profileProgress||0}%;"></div>
        <span class="progress-label">${profileProgress||0}% Complete</span>
      </div>
      <form id="profile-form" autocomplete="off" style="display:flex;flex-direction:column;gap:1.1rem;">
        <label>Name: <input type="text" name="name" value="${name}" required /></label>
        <label>Date of Birth: <input type="date" name="dob" value="${dob}" required /></label>
        <label>Profile Picture: <input type="file" name="profilePic" accept="image/*" />${profilePicUrl ? `<img src="${profilePicUrl}" style="max-width:90px;border-radius:10px;display:block;margin:7px 0;">` : ""}</label>
        <label>CDL Class:
          <select name="cdlClass" required>
            <option value="">Select</option>
            <option value="A" ${cdlClass==="A"?"selected":""}>Class A</option>
            <option value="B" ${cdlClass==="B"?"selected":""}>Class B</option>
            <option value="C" ${cdlClass==="C"?"selected":""}>Class C</option>
          </select>
        </label>
        <label>Endorsements:
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${endorsementOptions.map(opt => `
              <label style="font-weight:400;">
                <input type="checkbox" name="endorsements[]" value="${opt.val}" ${endorsements.includes(opt.val) ? "checked" : ""}/> ${opt.label}
              </label>
            `).join("")}
          </div>
        </label>
        <label>Restrictions/Upgrades:
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${restrictionOptions.map(opt => `
              <label style="font-weight:400;">
                <input type="checkbox" name="restrictions[]" value="${opt.val}" ${restrictions.includes(opt.val) ? "checked" : ""}/> ${opt.label}
              </label>
            `).join("")}
          </div>
        </label>
        <label>Experience:
          <select name="experience" required>
            <option value="">Select</option>
            <option value="none" ${experience==="none"?"selected":""}>No experience</option>
            <option value="1-2" ${experience==="1-2"?"selected":""}>1–2 years</option>
            <option value="3-5" ${experience==="3-5"?"selected":""}>3–5 years</option>
            <option value="6-10" ${experience==="6-10"?"selected":""}>6–10 years</option>
            <option value="10+" ${experience==="10+"?"selected":""}>10+ years</option>
          </select>
        </label>
        <label>Previous Employer: <input type="text" name="prevEmployer" value="${prevEmployer}" /></label>
        <label>Assigned Company: <input type="text" name="assignedCompany" value="${assignedCompany}" /></label>
        <label>Assigned Instructor: <input type="text" name="assignedInstructor" value="${assignedInstructor}" /></label>
        <label>CDL Permit?
          <select name="cdlPermit" required>
            <option value="">Select</option>
            <option value="yes" ${cdlPermit==="yes"?"selected":""}>Yes</option>
            <option value="no" ${cdlPermit==="no"?"selected":""}>No</option>
          </select>
        </label>
        <div id="permit-photo-section" style="${cdlPermit==="yes"?"":"display:none"}">
          <label>Permit Expiry: <input type="date" name="permitExpiry" value="${permitExpiry||""}" /></label>
          <label>Permit Photo: <input type="file" name="permitPhoto" accept="image/*" />${permitPhotoUrl ? `<img src="${permitPhotoUrl}" style="max-width:70px;margin:7px 0;">` : ""}</label>
        </div>
        <label>Driver License: <input type="file" name="driverLicense" accept="image/*,application/pdf" />${driverLicenseUrl ? `<a href="${driverLicenseUrl}" target="_blank">View</a>` : ""}</label>
        <label>License Expiry: <input type="date" name="licenseExpiry" value="${licenseExpiry||""}" /></label>
        <label>Medical Card: <input type="file" name="medicalCard" accept="image/*,application/pdf" />${medicalCardUrl ? `<a href="${medicalCardUrl}" target="_blank">View</a>` : ""}</label>
        <label>Medical Card Expiry: <input type="date" name="medCardExpiry" value="${medCardExpiry||""}" /></label>
        <label>Does your training/testing vehicle qualify?
          <select name="vehicleQualified" required>
            <option value="">Select</option>
            <option value="yes" ${vehicleQualified==="yes"?"selected":""}>Yes</option>
            <option value="no" ${vehicleQualified==="no"?"selected":""}>No</option>
          </select>
        </label>
        <div id="vehicle-photos-section" style="${vehicleQualified==="yes"?"":"display:none"}">
          <label>Truck Data Plate: <input type="file" name="truckPlate" accept="image/*" />${truckPlateUrl ? `<img src="${truckPlateUrl}" style="max-width:70px;margin:7px 0;">` : ""}</label>
          <label>Trailer Data Plate: <input type="file" name="trailerPlate" accept="image/*" />${trailerPlateUrl ? `<img src="${trailerPlateUrl}" style="max-width:70px;margin:7px 0;">` : ""}</label>
        </div>
        <label>Emergency Contact Name: <input type="text" name="emergencyName" value="${emergencyName}" /></label>
        <label>Emergency Contact Phone: <input type="tel" name="emergencyPhone" value="${emergencyPhone}" /></label>
        <label>Relationship: <input type="text" name="emergencyRelation" value="${emergencyRelation}" /></label>
        <label>Course Selected: <input type="text" name="course" value="${course}" /></label>
        <label>Schedule Preference: <input type="text" name="schedulePref" value="${schedulePref}" /></label>
        <label>Scheduling Notes: <textarea name="scheduleNotes">${scheduleNotes||""}</textarea></label>
        <label>Payment Status:
          <select name="paymentStatus">
            <option value="">Select</option>
            <option value="paid" ${paymentStatus==="paid"?"selected":""}>Paid in Full</option>
            <option value="deposit" ${paymentStatus==="deposit"?"selected":""}>Deposit Paid</option>
            <option value="balance" ${paymentStatus==="balance"?"selected":""}>Balance Due</option>
          </select>
        </label>
        <label>Payment Proof: <input type="file" name="paymentProof" accept="image/*,application/pdf" />${paymentProofUrl ? `<a href="${paymentProofUrl}" target="_blank">View</a>` : ""}</label>
        <label>Accommodation Requests: <textarea name="accommodation">${accommodation||""}</textarea></label>
        <label>Student Notes: <textarea name="studentNotes">${studentNotes||""}</textarea></label>
        <label><input type="checkbox" name="waiver" ${waiverSigned ? "checked" : ""} required /> I have read and agree to the liability waiver.</label>
        <label>Digital Signature: <input type="text" name="waiverSignature" value="${waiverSignature||""}" /></label>
        <button class="btn primary wide" type="submit">Save Profile</button>
        <button class="btn outline" id="back-to-dashboard-btn" type="button">⬅ Dashboard</button>
      </form>
    </div>
  `;

  // Show/hide dynamic sections
  container.querySelector('select[name="cdlPermit"]').addEventListener('change', function() {
    document.getElementById('permit-photo-section').style.display = this.value === "yes" ? "" : "none";
  });
  container.querySelector('select[name="vehicleQualified"]').addEventListener('change', function() {
    document.getElementById('vehicle-photos-section').style.display = this.value === "yes" ? "" : "none";
  });

  // Back to dashboard
  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderDashboard();
  });

  // --- FILE UPLOAD HELPERS (with checklist marking) ---
  async function handleFileInput(inputName, storagePath, updateField, checklistFn = null) {
    const input = container.querySelector(`input[name="${inputName}"]`);
    if (!input) return;
    input.addEventListener("change", async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const storageRef = ref(storage, `${storagePath}/${currentUserEmail}-${Date.now()}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        // Update Firestore
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", currentUserEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(doc(db, "users", snap.docs[0].id), { [updateField]: downloadURL });
          showToast(`${updateField.replace(/Url$/,"")} uploaded!`);
          if (typeof checklistFn === "function") await checklistFn(currentUserEmail);
          renderProfile(container); // refresh to show
        }
      } catch (err) {
        showToast(`Failed to upload ${updateField}: ` + err.message);
      }
    });
  }

  // All uploads with checklist logic
  handleFileInput("profilePic", "profilePics", "profilePicUrl", markStudentProfileComplete); // Profile pic
  handleFileInput("permitPhoto", "permits", "permitPhotoUrl", markStudentPermitUploaded);   // Permit
  handleFileInput("driverLicense", "licenses", "driverLicenseUrl");                         // DL
  handleFileInput("medicalCard", "medCards", "medicalCardUrl");                             // Medical Card

  // Data plates (when both uploaded, mark vehicle uploaded)
  let truckUploaded = !!truckPlateUrl, trailerUploaded = !!trailerPlateUrl;
  handleFileInput("truckPlate", "vehicle-plates", "truckPlateUrl", async (email) => {
    truckUploaded = true;
    if (truckUploaded && trailerUploaded) await markStudentVehicleUploaded(email);
  });
  handleFileInput("trailerPlate", "vehicle-plates", "trailerPlateUrl", async (email) => {
    trailerUploaded = true;
    if (truckUploaded && trailerUploaded) await markStudentVehicleUploaded(email);
  });
  handleFileInput("paymentProof", "payments", "paymentProofUrl"); // Payment proof

  // --- SAVE PROFILE HANDLER (also marks profile complete) ---
  container.querySelector("#profile-form").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);

    // Build profile update object
    const updateObj = {
      name: fd.get("name"), dob: fd.get("dob"), cdlClass: fd.get("cdlClass"),
      endorsements: fd.getAll("endorsements[]"),
      restrictions: fd.getAll("restrictions[]"),
      experience: fd.get("experience"),
      prevEmployer: fd.get("prevEmployer"), assignedCompany: fd.get("assignedCompany"),
      assignedInstructor: fd.get("assignedInstructor"),
      cdlPermit: fd.get("cdlPermit"), permitExpiry: fd.get("permitExpiry"),
      licenseExpiry: fd.get("licenseExpiry"), medCardExpiry: fd.get("medCardExpiry"),
      vehicleQualified: fd.get("vehicleQualified"),
      emergencyName: fd.get("emergencyName"), emergencyPhone: fd.get("emergencyPhone"),
      emergencyRelation: fd.get("emergencyRelation"),
      course: fd.get("course"), schedulePref: fd.get("schedulePref"),
      scheduleNotes: fd.get("scheduleNotes"), paymentStatus: fd.get("paymentStatus"),
      accommodation: fd.get("accommodation"), studentNotes: fd.get("studentNotes"),
      waiverSigned: !!fd.get("waiver"), waiverSignature: fd.get("waiverSignature"),
      profileProgress: calcProgress(fd)
    };

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, updateObj);
        await markStudentProfileComplete(currentUserEmail); // <-- CHECKLIST progress!
        showToast("✅ Profile saved!");
        renderProfile(container); // re-render for progress update
      } else throw new Error("User document not found.");
    } catch (err) {
      showToast("❌ Error saving: " + err.message);
    }
  };

  setupNavigation();
}

// ─── RENDER CHECKLIST (Student) ──────────────────────────────────────────────
async function renderChecklists(container = document.getElementById("app")) {
  if (!container) return;

  // User context
  const email = currentUserEmail || (auth.currentUser && auth.currentUser.email);
  if (!email) {
    container.innerHTML = "<p>You must be logged in to view this page.</p>";
    return;
  }

  // Fetch data
  let userData = {};
  let userRole = localStorage.getItem("userRole") || "student";
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || userRole || "student";
      localStorage.setItem("userRole", userRole);
    }
  } catch (e) {
    userData = {};
  }

  if (userRole !== "student") {
    container.innerHTML = "<p>This checklist is only available for students.</p>";
    return;
  }

  // Extract progress fields
  const {
    cdlClass = "", cdlPermit = "", permitPhotoUrl = "",
    vehicleQualified = "", truckPlateUrl = "", trailerPlateUrl = "",
    experience = "", lastTestScore = 0, walkthroughProgress = 0,
    walkthroughComplete = false,  // Optionally set in Firestore by instructor
  } = userData;

  // Main checklist logic (grouped)
  const checklistSections = [
    {
      header: "Personal Info",
      items: [
        {
          label: "Profile Complete",
          done: !!(cdlClass && cdlPermit && experience),
          link: "profile",
          notify: !(cdlClass && cdlPermit && experience),
          details: "Complete all required fields in your student profile.",
        },
      ]
    },
    {
      header: "Permit & Docs",
      items: [
        {
          label: "Permit Uploaded",
          done: cdlPermit === "yes" && !!permitPhotoUrl,
          link: "profile",
          notify: cdlPermit === "yes" && !permitPhotoUrl,
          details: "Upload a clear photo of your CDL permit.",
        },
        {
          label: "Vehicle Data Plates Uploaded",
          done: vehicleQualified === "yes" && !!truckPlateUrl && !!trailerPlateUrl,
          link: "profile",
          notify: vehicleQualified === "yes" && (!truckPlateUrl || !trailerPlateUrl),
          details: "Upload photos of both your truck and trailer data plates.",
          substeps: [
            { label: "Truck Plate", done: !!truckPlateUrl },
            { label: "Trailer Plate", done: !!trailerPlateUrl }
          ]
        },
      ]
    },
    {
      header: "Testing & Study",
      items: [
        {
          label: "Practice Test Passed",
          done: lastTestScore >= 80,
          link: "practiceTests",
          notify: lastTestScore < 80,
          details: "Score at least 80% on any practice test to unlock the next step.",
        },
        {
          label: "Walkthrough Progress",
          done: walkthroughProgress >= 1,
          link: "walkthrough",
          notify: walkthroughProgress < 1,
          details: "Start and complete your CDL vehicle inspection walkthrough.",
        },
      ]
    },
    {
      header: "Final Certification",
      items: [
        {
          label: "Complete in-person walkthrough and driving portion",
          done: !!walkthroughComplete,
          link: "",
          notify: !walkthroughComplete,
          details: "This final step must be marked complete by your instructor.",
          readonly: true
        }
      ]
    }
  ];

  // Flat checklist for progress calc
  const flatChecklist = checklistSections.flatMap(sec => sec.items);
  const complete = flatChecklist.filter(x => x.done).length;
  const percent = Math.round((complete / flatChecklist.length) * 100);

  // Confetti on 100%
  if (percent === 100) {
    setTimeout(() => {
      if (window.confetti) window.confetti();
      // Otherwise add a simple confetti animation (or show a badge)
      const badge = document.createElement("div");
      badge.className = "completion-badge";
      badge.innerHTML = "🎉 All steps complete! Ready for certification.";
      document.body.appendChild(badge);
      setTimeout(() => badge.remove(), 3200);
    }, 600);
  }

// Render Checklist Page
container.innerHTML = `
  <div class="screen-wrapper fade-in checklist-page" style="max-width:480px;margin:0 auto;">
    <h2 style="display:flex;align-items:center;gap:9px;">📋 Student Checklist</h2>
    <div class="progress-track" style="margin-bottom:18px;">
      <div class="progress-fill" style="width:${percent}%;transition:width 0.6s cubic-bezier(.45,1.4,.5,1.02);"></div>
      <span class="progress-label">${percent}% Complete</span>
    </div>
    ${checklistSections.map(section => `
      <div class="checklist-section">
        <h3 class="checklist-section-header">${section.header}</h3>
        <ul class="checklist-list">
          ${section.items.map((item, idx) => `
            <li class="checklist-item ${item.done ? "done" : ""} ${item.readonly ? "readonly" : ""}">
              ${item.notify && !item.done && !item.readonly
                ? `<span class="notify-bubble" aria-label="Incomplete Step" title="This step needs attention">!</span>`
                : ""
              }
              <div class="checklist-item-main">
                <span class="checklist-label" style="${item.done ? 'text-decoration:line-through;color:#9fdcb7;' : ''}">
                  ${item.label}
                </span>
                ${item.done 
                  ? `<span class="badge badge-success" style="animation:popCheck .28s cubic-bezier(.42,1.85,.5,1.03);">✔</span>` 
                  : item.readonly
                    ? `<span class="badge badge-waiting" title="Instructor must complete" aria-label="Instructor Only">🔒</span>`
                    : `<button class="btn outline btn-sm" data-nav="${item.link}">Complete</button>`
                }
              </div>
              <div class="checklist-details" style="display:none;">
                ${item.details || ""}
                ${item.substeps ? `
                  <ul class="substeps">
                    ${item.substeps.map(ss => `
                      <li${ss.done ? ' class="done"' : ''}>
                        ${ss.done ? "✅" : "<span style='color:#ff6565;font-size:1.18em;font-weight:900;vertical-align:middle;'>!</span>"} ${ss.label}
                      </li>
                    `).join("")}
                  </ul>
                ` : ""}
              </div>
            </li>
          `).join("")}
        </ul>
      </div>
    `).join("")}
     <button class="btn wide" id="back-to-dashboard-btn" style="margin-top:24px;">⬅ Back to Dashboard</button>
  </div>

`;

// ------- Event Listeners and logic -------

// Animate progress bar on mount
setTimeout(() => {
  const bar = container.querySelector('.progress-fill');
  if (bar) bar.style.width = percent + "%";
}, 25);

// Expand/collapse checklist details and label
container.querySelectorAll('.checklist-item-main').forEach(main => {
  main.addEventListener("click", function() {
    const li = this.closest('.checklist-item');
    const details = li.querySelector('.checklist-details');
    const label = li.querySelector('.checklist-label');
    if (!details) return;

    const expanded = li.classList.toggle('expanded');
    details.style.display = expanded ? "block" : "none";
    // Hide the label ONLY when expanded (handled by CSS, but set here too for safety)
    if (expanded) {
      label.style.display = "none";
    } else {
      label.style.display = "";
    }
  });
});

// Navigation for checklist actions
container.querySelectorAll('.btn[data-nav]').forEach(btn => {
  btn.addEventListener('click', e => {
    const target = btn.getAttribute('data-nav');
    if (target === "profile") return renderProfile();
    if (target === "walkthrough") return renderWalkthrough();
    if (target === "practiceTests") return renderPracticeTests();
    setupNavigation();
  });
});

// Back button
document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
  renderDashboard();
});

setupNavigation();
}

// ─── RENDER PRACTICE TESTS ──────────────────────────────────────────────
async function renderPracticeTests(container = document.getElementById("app")) {
  container = container || document.getElementById("app");
  if (!container) return;

  if (!currentUserEmail || !auth.currentUser) {
    container.innerHTML = "<p>You must be logged in to view this page.</p>";
    return;
  }

  // Defensive: Only students can access practice tests
  let userRole = localStorage.getItem("userRole") || "student";
  let userData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || userRole || "student";
      localStorage.setItem("userRole", userRole);
    }
  } catch (e) { userData = {}; }

  if (userRole !== "student") {
    container.innerHTML = "<p>This page is only available for students.</p>";
    return;
  }

  // --- TEST DATA ---
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

  container.innerHTML = `
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

  // Add listeners after DOM is rendered
  setTimeout(() => {
    container.querySelectorAll(".retake-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const test = btn.dataset.test;
        showToast(`Restarting "${test}" test…`);
        renderTestEngine(container, test);
      });
    });
    container.querySelectorAll(".review-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const test = btn.dataset.test;
        showToast(`Loading your last "${test}" result…`);
        renderTestReview(container, test);
      });
    });
  }, 0);
}

// ─── REVIEW A SPECIFIC TEST RESULT ────────────────────────────────────────────
async function renderTestReview(container, testName) {
  container = container || document.getElementById("app");
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

    // Always log study minutes and session
    const minutes = latest?.durationMinutes || 5; // sensible default
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

    container.querySelector('[data-nav="practiceTests"]')?.addEventListener("click", () => {
      renderPracticeTests(container);
    });

  } catch (e) {
    console.error("❌ Review fetch error:", e);
    container.innerHTML = `<p>Failed to load review data.</p>`;
  }
}

// ─── RENDER FLASHCARDS ──────────────────────────────────────────────────
async function renderFlashcards(container = document.getElementById("app")) {
  container = container || document.getElementById("app");
  if (!container) return;

  if (!auth.currentUser || !auth.currentUser.email) {
    container.innerHTML = "<p>You must be logged in to view this page.</p>";
    return;
  }

  // Optional: Only allow students (if you wish to restrict)
  let userRole = localStorage.getItem("userRole") || "student";
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", auth.currentUser.email));
    const snap = await getDocs(q);
    if (!snap.empty) userRole = snap.docs[0].data().role || userRole;
  } catch (e) {}
  if (userRole !== "student") {
    container.innerHTML = "<p>Flashcards are only available for students.</p>";
    return;
  }

  // --- Flashcards Data ---
  const flashcards = [
    { q: "What is the minimum tread depth for front tires?", a: "4/32 of an inch." },
    { q: "What do you check for on rims?", a: "Bent, damaged, or rust trails." },
    { q: "When must you use 3 points of contact?", a: "When entering and exiting the vehicle." },
    { q: "What triggers the spring brake pop-out?", a: "Low air pressure (between 20–45 PSI)." }
  ];

  let current = 0;
  let startedAt = Date.now();
  let completed = false;

  async function renderCard() {
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

  await renderCard();
}
// Returns user initials for avatar bubble
function getUserInitials() {
  const fullName = localStorage.getItem("fullName") || "";
  if (!fullName) return "U";
  return fullName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
// ─── AI COACH PAGE (Premium Modal, Avatar, Typing Dots, Fun, Responsive) ────
function renderAICoach(container = document.getElementById("app")) {
  // Remove any existing modal overlays
  document.querySelectorAll(".ai-coach-modal").forEach(el => el.remove());

  const context = (window.location.hash || "dashboard").replace("#", "");
  const name = localStorage.getItem("fullName") || "Driver";
  const isFirstTime = !localStorage.getItem("aiCoachWelcomed");

  const starterPrompts = {
    dashboard: [
      "What should I work on next?",
      "How do I finish my checklist?",
      "Explain ELDT in simple terms.",
      "Give me a CDL study tip."
    ],
    profile: [
      "How do I complete my profile?",
      "How do I upload my permit?",
      "What is a DOT medical card?",
      "What are endorsements?"
    ],
    checklists: [
      "What does this checklist step mean?",
      "How do I know if my checklist is done?",
      "Why is this checklist important?"
    ],
    walkthrough: [
      "Help me memorize the walkthrough.",
      "How do I do the three-point brake check?",
      "Show me a memory drill for air brakes."
    ],
    practiceTests: [
      "How do I prepare for the general knowledge test?",
      "Give me a practice question.",
      "Tips for passing air brakes."
    ]
  };
  const suggestions = starterPrompts[context] || starterPrompts.dashboard;

  // Modal structure
  const modal = document.createElement("div");
  modal.className = "ai-coach-modal modal-overlay fade-in";
  modal.innerHTML = `
    <div class="modal-glass-bg"></div>
    <div class="modal-card ai-coach-card glass">
      <div class="ai-coach-modal-header">
        <div class="coach-avatar" style="display:flex; align-items:center; justify-content:center; margin-bottom: 12px; animation: floatMascot 2.6s ease-in-out infinite;">
          <!-- Retro Monitor Coach SVG -->
          <svg id="ai-coach-mascot" viewBox="0 0 88 88" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="face-bg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#b8ecff" />
                <stop offset="100%" stop-color="#4e91ad" />
              </radialGradient>
              <linearGradient id="screen-glass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#e6f6ff" stop-opacity="0.72" />
                <stop offset="100%" stop-color="#4e91ad" stop-opacity="0.17" />
              </linearGradient>
            </defs>
            <!-- Computer base -->
            <rect x="8" y="16" width="72" height="54" rx="16" fill="url(#face-bg)" stroke="#242c42" stroke-width="3"/>
            <!-- Screen glass reflection -->
            <rect x="12" y="22" width="64" height="42" rx="12" fill="url(#screen-glass)" />
            <!-- Face -->
            <ellipse cx="44" cy="44" rx="22" ry="18" fill="#eaf9ff" fill-opacity="0.92"/>
            <!-- Eyes -->
            <ellipse cx="34" cy="44" rx="3.5" ry="4" fill="#232345"/>
            <ellipse cx="54" cy="44" rx="3.5" ry="4" fill="#232345"/>
            <!-- Smile -->
            <path d="M38,52 Q44,56 50,52" stroke="#3db278" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <!-- Headband -->
            <rect x="24" y="11" width="40" height="14" rx="7" fill="#3db278" stroke="#242c42" stroke-width="2"/>
            <text x="44" y="22.5" text-anchor="middle" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-size="9" fill="#fff" font-weight="bold" letter-spacing="1.2">COACH</text>
            <!-- Ears -->
            <ellipse cx="8" cy="43" rx="3" ry="7" fill="#ea5d5d" stroke="#232345" stroke-width="1.5"/>
            <ellipse cx="80" cy="43" rx="3" ry="7" fill="#ea5d5d" stroke="#232345" stroke-width="1.5"/>
            <!-- Glow shadow -->
            <ellipse cx="44" cy="75" rx="22" ry="4" fill="#4e91ad" fill-opacity="0.21"/>
          </svg>
        </div>
        <span class="ai-coach-title" style="font-size: 1.25rem; font-weight: 700; color: var(--accent, #b6f0f7); margin-bottom: 4px;">AI Coach</span>
        <button class="modal-close" aria-label="Close" style="margin-left:auto;">&times;</button>
      </div>
      <div class="ai-coach-modal-body">
        <div class="ai-coach-intro">
          👋 Hi${name ? `, ${name}` : ""}! I’m your AI CDL Coach.<br>
          <span class="ai-coach-intro-small">
            ${isFirstTime
              ? `<b>Let’s get started! I can answer your CDL questions, help with profile steps, explain checklists, and guide you through the walkthrough. Try a suggestion below, or ask anything related to your CDL training.</b>`
              : `Ask me anything about your CDL process!`}
          </span>
        </div>
        <div class="ai-coach-suggestions">
          ${suggestions.map(txt => `<button type="button" class="ai-suggestion">${txt}</button>`).join("")}
        </div>
        <div id="ai-chat-history" class="ai-chat-history"></div>
      </div>
      <form class="ai-coach-input-row" id="ai-coach-form" autocomplete="off">
        <input type="text" class="ai-coach-input" id="ai-coach-input"
          placeholder="Type your CDL question..." autofocus />
        <button type="submit" class="btn ai-coach-send">Send</button>
      </form>
    </div>
  `;

  // Modal display
  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  // --- Conversation State
  const chatHistoryEl = modal.querySelector("#ai-chat-history");
  let conversation = JSON.parse(sessionStorage.getItem("aiCoachHistory") || "[]");
  if (!conversation.length) {
    conversation.push({
      role: "assistant",
      content: `
        👋 Hi${name ? `, ${name}` : ""}! I’m your AI CDL Coach.
        <br>
        ${isFirstTime ? `<b>Let’s get started! I can answer your CDL questions, help with profile steps, explain checklists, and guide you through the walkthrough. Try a suggestion below, or ask anything related to your CDL training.</b>` : `Ask me anything about your CDL process!`}
      `
    });
    localStorage.setItem("aiCoachWelcomed", "yes");
  }

  // --- Helper to render history with avatars, source tags, and FMCSA handoff style
  function renderHistory() {
    chatHistoryEl.innerHTML = conversation.map(
      msg => `
        <div class="ai-msg ai-msg--${msg.role}">
          ${
            msg.role === "user"
              ? `<div class="ai-user-avatar">${getUserInitials()}</div>`
              : `<div class="ai-coach-avatar-mini">
                  <svg viewBox="0 0 32 32" width="28" height="28">
                    <rect x="2" y="5" width="28" height="18" rx="5" fill="#3f1784" stroke="#b6f0f7" stroke-width="2" />
                    <rect x="5" y="8" width="22" height="12" rx="3" fill="#4e91ad" fill-opacity="0.93" stroke="#c4dbe8" stroke-width="1"/>
                    <ellipse cx="11" cy="14" rx="1.3" ry="1.5" fill="#fff" />
                    <ellipse cx="21" cy="14" rx="1.3" ry="1.5" fill="#fff" />
                    <path d="M13,18 Q16,21 19,18" stroke="#fff" stroke-width="0.9" fill="none" stroke-linecap="round"/>
                  </svg>
                </div>`
          }
          <div class="ai-msg-bubble">${msg.content}
            ${msg.role === "assistant" && msg.fmcsatag ? `<div class="ai-source-tag">${msg.fmcsatag}</div>` : ""}
          </div>
        </div>
      `
    ).join("");
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
  }
  renderHistory();

  // Suggestion buttons autofill input
  modal.querySelectorAll(".ai-suggestion").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = modal.querySelector("#ai-coach-input");
      input.value = btn.textContent;
      input.focus();
    });
  });

  // AI Chat Handler
  modal.querySelector("#ai-coach-form").onsubmit = async (e) => {
    e.preventDefault();
    const input = modal.querySelector("#ai-coach-input");
    const question = input.value.trim();
    if (!question) return;
    conversation.push({ role: "user", content: question });
    renderHistory();
    input.value = "";
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    // --- Typing Loading Dots
    const loadingBubble = document.createElement("div");
    loadingBubble.className = "ai-msg ai-msg--assistant";
    loadingBubble.innerHTML = `<div class="ai-msg-bubble"><span class="typing-dots"><span>.</span><span>.</span><span>.</span></span></div>`;
    chatHistoryEl.appendChild(loadingBubble);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    // --- CALL AI (OpenAI API, replace with your backend if needed)
    let reply = "";
    try {
      reply = await askCDLAI(question, conversation.slice(-10));
    } catch (err) {
      reply = "Sorry, I couldn't reach the AI right now.";
    }

    let fmcsatag = "Based on FMCSA regulations, updated 2024";
    if (reply.match(/ask your instructor|official FMCSA manual|not allowed|outside of CDL/i))
      fmcsatag = "";

    if (/i (don'?t|cannot|can't) know|i am not sure|as an ai/i.test(reply)) {
      reply += `<br><span class="ai-handoff">[View the <a href="https://www.fmcsa.dot.gov/regulations/title49/section/393.1" target="_blank" rel="noopener">official FMCSA manual</a> or ask your instructor for help]</span>`;
    }

    // Remove loading dots before showing reply
    const loadingMsg = chatHistoryEl.querySelector(".typing-dots")?.closest(".ai-msg");
    if (loadingMsg) loadingMsg.remove();

    conversation.push({ role: "assistant", content: reply, fmcsatag });
    sessionStorage.setItem("aiCoachHistory", JSON.stringify(conversation));
    renderHistory();

    // Easter Egg after every 10 user questions!
    if (conversation.filter(m => m.role === "user").length % 10 === 0) {
      setTimeout(() => {
        const funFacts = [
          "🚛 Did you know? The average 18-wheeler travels over 100,000 miles per year!",
          "💡 Tip: Reviewing checklists before every drive helps you pass real-world inspections.",
          "🎉 Keep going! Every question you ask gets you closer to that CDL.",
          "🛣️ CDL Fact: Federal law requires drivers to pass a skills test for each class of vehicle.",
          "👀 Coach’s wisdom: Don't forget your three-point brake check--it's a must-pass step!"
        ];
        const fun = funFacts[Math.floor(Math.random() * funFacts.length)];
        conversation.push({ role: "assistant", content: fun });
        sessionStorage.setItem("aiCoachHistory", JSON.stringify(conversation));
        renderHistory();
      }, 700);
    }
  };

  // --- Close Modal Handler
  modal.querySelector(".modal-close")?.addEventListener("click", () => {
    modal.remove();
    document.body.style.overflow = "";
  });

  // Optional: esc key closes modal
  window.addEventListener("keydown", function escClose(e) {
    if (e.key === "Escape") {
      modal.remove();
      document.body.style.overflow = "";
      window.removeEventListener("keydown", escClose);
    }
  });
}

// ─── INSTRUCTOR DASHBOARD ────────────────────────────────────────────────
async function renderInstructorDashboard(container = document.getElementById("app")) {
  if (!container) return;
  if (!currentUserEmail) {
    showToast("No user found. Please log in again.");
    renderWelcome();
    return;
  }

  // Defensive role fallback
  let userData = {};
  let userRole = localStorage.getItem("userRole") || "instructor";
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || userRole || "instructor";
      localStorage.setItem("userRole", userRole);
    }
  } catch (e) {
    userData = {};
  }
  if (userRole !== "instructor") {
    showToast("Access denied: Instructor role required.");
    renderDashboard();
    return;
  }

  // ---- Fetch Assigned Students (admin-appoints these) ----
  let assignedStudents = [];
  try {
    const assignSnap = await getDocs(
      query(collection(db, "users"), where("assignedInstructor", "==", currentUserEmail))
    );
    assignSnap.forEach(doc => {
      const d = doc.data();
      assignedStudents.push({
        name: d.name || "Student",
        email: d.email,
        cdlClass: d.cdlClass || "Not set",
        experience: d.experience || "Unknown",
        cdlPermit: d.cdlPermit || "no",
        permitPhotoUrl: d.permitPhotoUrl || "",
        medicalCardUrl: d.medicalCardUrl || "",
        profileProgress: d.profileProgress || 0,
        checklistAlerts: getNextChecklistAlert(d),
        id: doc.id,
      });
    });
  } catch (e) {
    assignedStudents = [];
    console.error("Assigned students fetch error", e);
  }

  // ---- Fetch Latest Test Results for Assigned Students ----
  let testResultsByStudent = {};
  try {
    for (const student of assignedStudents) {
      const testsSnap = await getDocs(
        query(collection(db, "testResults"), where("studentId", "==", student.email))
      );
      let latest = null;
      testsSnap.forEach(doc => {
        const t = doc.data();
        if (
          !latest ||
          (t.timestamp?.toDate
            ? t.timestamp.toDate()
            : new Date(t.timestamp)) >
            (latest?.timestamp?.toDate
              ? latest.timestamp.toDate()
              : new Date(latest?.timestamp))
        ) {
          latest = t;
        }
      });
      if (latest) {
        testResultsByStudent[student.email] = {
          testName: latest.testName,
          pct: Math.round((latest.correct / latest.total) * 100),
          date: latest.timestamp?.toDate
            ? latest.timestamp.toDate().toLocaleDateString()
            : new Date(latest.timestamp).toLocaleDateString(),
        };
      }
    }
  } catch (e) {
    testResultsByStudent = {};
    console.error("Instructor test results error", e);
  }

  // ---- Render Instructor Dashboard Layout ----
  container.innerHTML = `
    <h2 class="dash-head">Welcome, Instructor! <span class="role-badge instructor">Instructor</span></h2>
    <button class="btn" id="edit-instructor-profile-btn" style="margin-bottom:1.2rem;max-width:260px;">👤 View/Edit My Profile</button>
    <div class="dash-layout">
      <section class="dash-metrics">
        <div class="dashboard-card">
          <h3>📋 Assigned Students</h3>
          ${
            assignedStudents.length === 0
              ? `<p>No students assigned to you yet.</p>`
              : `<div class="assigned-students-list">
                  ${assignedStudents
                    .map(
                      (student) => `
                      <div class="student-list-card">
                        <strong>${student.name}</strong>
                        <div>Email: ${student.email}</div>
                        <div>CDL Class: ${student.cdlClass}</div>
                        <div>Experience: ${student.experience}</div>
                        <div>Permit: ${student.cdlPermit === "yes" && student.permitPhotoUrl ? "✔️ Uploaded" : "❌ Not Uploaded"}</div>
                        <div>Med Card: ${student.medicalCardUrl ? "✔️ Uploaded" : "❌ Not Uploaded"}</div>
                        <div>
                          Profile Completion:
                          <div class="progress-bar" style="width:120px;display:inline-block;">
                            <div class="progress" style="width:${student.profileProgress}%;"></div>
                          </div>
                          <span style="font-size:.95em;">${student.profileProgress}%</span>
                        </div>
                        <div style="color:#f47373;min-height:20px;">
                          ${student.checklistAlerts !== "All required steps complete! 🎉"
                            ? `⚠️ ${student.checklistAlerts}`
                            : `<span style="color:#56b870">✔️ All requirements met</span>`}
                        </div>
                        <div>
                          Last Test: ${
                            testResultsByStudent[student.email]
                              ? `${testResultsByStudent[student.email].testName} – ${testResultsByStudent[student.email].pct}% on ${testResultsByStudent[student.email].date}`
                              : "No recent test"
                          }
                        </div>
                        <button class="btn" data-student="${student.email}" data-nav="viewStudentProfile">View Profile</button>
                        <button class="btn outline" data-student="${student.email}" data-nav="reviewChecklist">Review Checklist</button>
                      </div>
                    `
                    )
                    .join("")}
                </div>`
          }
        </div>
        <div class="dashboard-card">
          <h3>✅ Review Checklists</h3>
          <p>Sign off on student milestones (permit, walkthrough, etc).</p>
          <p>Select a student above and click "Review Checklist".</p>
        </div>
        <div class="dashboard-card">
          <h3>🧾 Student Test Results</h3>
          <p>See latest practice and official test results for your assigned students above.</p>
        </div>
      </section>
      <button class="rail-btn logout wide-logout" id="logout-btn" aria-label="Logout">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="12" height="16" rx="2" stroke="#ff8080" stroke-width="2"/>
          <path d="M17 15l4-3-4-3m4 3H10" stroke="#ff8080" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="label">Logout</span>
      </button>
    </div>
  `;

  setupNavigation();

  // View/Edit My Profile button
  document.getElementById("edit-instructor-profile-btn")?.addEventListener("click", () => {
    renderInstructorProfile();
  });

  // Handle logout
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.clear();
    renderWelcome();
  });

  // View Student Profile modal
  container.querySelectorAll('button[data-nav="viewStudentProfile"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const studentEmail = btn.getAttribute("data-student");
      renderStudentProfileForInstructor(studentEmail);
    });
  });

  // Checklist Review modal
  container.querySelectorAll('button[data-nav="reviewChecklist"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const studentEmail = btn.getAttribute("data-student");
      renderChecklistReviewForInstructor(studentEmail);
    });
  });
}

// ─── REVIEW CHECKLIST FOR INSTRUCTOR ─────────────────────────────────────
// Instructor can verify key milestones for student, sign off, add notes, FINAL STEP included
async function renderChecklistReviewForInstructor(studentEmail, container = document.body) {
  if (!studentEmail) return showToast("No student selected.");

  // Fetch student profile and progress
  let studentData = {}, eldtData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", studentEmail));
    const snap = await getDocs(q);
    if (!snap.empty) studentData = snap.docs[0].data();
    const progressRef = doc(db, "eldtProgress", studentEmail);
    const progressSnap = await getDoc(progressRef);
    if (progressSnap.exists()) eldtData = progressSnap.data();
  } catch (e) { showToast("Checklist fetch error."); }

  // Render modal with checkboxes for instructor sign-off, FINAL STEP included
  let modal = document.createElement("div");
  modal.className = "modal-overlay fade-in";
  modal.innerHTML = `
    <div class="modal-card checklist-modal">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h2>Review Student Checklist</h2>
      <div class="profile-row"><strong>Name:</strong> ${studentData.name || "Unknown"}</div>
      <div class="profile-row"><strong>Email:</strong> ${studentData.email}</div>
      <form id="checklist-review-form" style="display:flex;flex-direction:column;gap:1em;">
        <label>
          <input type="checkbox" name="profileVerified" ${eldtData.profileVerified ? "checked" : ""} />
          Profile Approved
        </label>
        <label>
          <input type="checkbox" name="permitVerified" ${eldtData.permitVerified ? "checked" : ""} />
          Permit Verified
        </label>
        <label>
          <input type="checkbox" name="vehicleVerified" ${eldtData.vehicleVerified ? "checked" : ""} />
          Vehicle Verified
        </label>
        <label>
          <input type="checkbox" name="walkthroughReviewed" ${eldtData.walkthroughReviewed ? "checked" : ""} />
          Walkthrough Reviewed
        </label>
        <label>
          <input type="checkbox" name="finalStepCompleted" ${eldtData.finalStepCompleted ? "checked" : ""} />
          <strong>Final Step:</strong> In-person walkthrough &amp; driving portion completed
        </label>
        <label>
          Instructor Notes:
          <textarea name="instructorNotes" rows="2">${eldtData.instructorNotes || ""}</textarea>
        </label>
        <button type="submit" class="btn primary wide">Save Checklist Review</button>
        <button type="button" class="btn outline" id="close-checklist-modal">Close</button>
      </form>
    </div>
  `;
  document.querySelectorAll(".modal-overlay").forEach(el => el.remove());
  document.body.appendChild(modal);

  // Save checklist
  modal.querySelector("#checklist-review-form").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await updateDoc(doc(db, "eldtProgress", studentEmail), {
        profileVerified: !!fd.get("profileVerified"),
        permitVerified: !!fd.get("permitVerified"),
        vehicleVerified: !!fd.get("vehicleVerified"),
        walkthroughReviewed: !!fd.get("walkthroughReviewed"),
        finalStepCompleted: !!fd.get("finalStepCompleted"),
        instructorNotes: fd.get("instructorNotes") || ""
      });
      showToast("Checklist review saved.");
      modal.remove();
    } catch (err) {
      showToast("Failed to save checklist.");
    }
  };

  modal.querySelector(".modal-close")?.addEventListener("click", () => modal.remove());
  modal.querySelector("#close-checklist-modal")?.addEventListener("click", () => modal.remove());

  document.body.style.overflow = "hidden";
  modal.addEventListener("transitionend", () => {
    if (!document.body.contains(modal)) {
      document.body.style.overflow = "";
    }
  });
}

// ─── RENDER INSTRUCTOR PROFILE ────────────────────────────────────────────────
async function renderInstructorProfile(container = document.getElementById("app")) {
  if (!container) return;

  if (!currentUserEmail) {
    showToast("No user found. Please log in again.");
    renderWelcome();
    return;
  }

  // Fetch instructor data
  let userData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) userData = snap.docs[0].data();
  } catch (e) {
    userData = {};
  }
  if ((userData.role || "student") !== "instructor") {
    showToast("Access denied: Instructor profile only.");
    renderDashboard();
    return;
  }

  // Fields
  const {
    name = "",
    email = currentUserEmail,
    profilePicUrl = "",
    experience = "",
    phone = "",
    availability = "",
    licenseClass = "",
    licenseNumber = "",
    licenseExp = "",
    preferredContact = "",
    sessionLog = [],
    feedback = "",
    complianceChecked = false,
    adminNotes = "",
    active = true,
    assignedStudents = []
  } = userData;

  // Compliance alert
  const complianceMissing = (!licenseClass || !licenseNumber || !licenseExp);
  let complianceAlert = complianceMissing
    ? `<div class="alert warning" style="margin-bottom:1em;">⚠️ Please complete your instructor license info below.</div>`
    : `<div class="alert success" style="margin-bottom:1em;">✅ All required compliance info current!</div>`;

  // Assigned students display (read only)
  const assignedStudentsHtml = Array.isArray(assignedStudents) && assignedStudents.length
    ? assignedStudents.map((s, i) => `<div>#${i+1}: ${s.name || s.email}</div>`).join("")
    : "<i>No students assigned yet.</i>";

  container.innerHTML = `
    <div class="screen-wrapper fade-in profile-page" style="max-width: 540px; margin: 0 auto;">
      <h2>👤 Instructor Profile <span class="role-badge instructor">Instructor</span></h2>
      ${complianceAlert}
      <form id="instructor-profile-form" style="display:flex;flex-direction:column;gap:1.3rem;">
        <label>Name:<input type="text" name="name" value="${name}" required /></label>
        <label>Email:<span style="user-select:all;">${email}</span></label>
        <label>Profile Picture:
          <input type="file" name="profilePic" accept="image/*" />
          ${profilePicUrl ? `<img src="${profilePicUrl}" alt="Profile Picture" style="max-width:90px;border-radius:12px;display:block;margin-top:7px;" />` : ""}
        </label>
        <label>Phone:<input type="tel" name="phone" value="${phone}" placeholder="(Optional)" /></label>
        <label>Experience:
          <select name="experience" required>
            <option value="">Select</option>
            <option value="none" ${experience==="none"?"selected":""}>No experience</option>
            <option value="1-2" ${experience==="1-2"?"selected":""}>1–2 years</option>
            <option value="3-5" ${experience==="3-5"?"selected":""}>3–5 years</option>
            <option value="6-10" ${experience==="6-10"?"selected":""}>6–10 years</option>
            <option value="10+" ${experience==="10+"?"selected":""}>10+ years</option>
          </select>
        </label>
        <details>
          <summary><strong>Availability & Schedule</strong></summary>
          <label>Days/Times Available:<br>
            <input type="text" name="availability" value="${availability}" placeholder="e.g. Mon-Fri, 8am-4pm" />
          </label>
        </details>
        <details>
          <summary><strong>Instructor License Info</strong> ${complianceMissing ? '<span style="color:#e67c7c;">(Required)</span>' : ''}</summary>
          <label>CDL Class:
            <select name="licenseClass">
              <option value="">Select</option>
              <option value="A" ${licenseClass==="A"?"selected":""}>A</option>
              <option value="B" ${licenseClass==="B"?"selected":""}>B</option>
              <option value="C" ${licenseClass==="C"?"selected":""}>C</option>
            </select>
          </label>
          <label>CDL License #:
            <input type="text" name="licenseNumber" value="${licenseNumber}" />
          </label>
          <label>License Expiration:
            <input type="date" name="licenseExp" value="${licenseExp}" />
          </label>
        </details>
        <label>Preferred Contact Method:
          <select name="preferredContact">
            <option value="">Select</option>
            <option value="email" ${preferredContact==="email"?"selected":""}>Email</option>
            <option value="phone" ${preferredContact==="phone"?"selected":""}>Phone</option>
            <option value="sms" ${preferredContact==="sms"?"selected":""}>SMS/Text</option>
          </select>
        </label>
                <details>
          <summary><strong>Session Log</strong> (Auto-generated, read-only)</summary>
          <div style="font-size:0.96em;">
            ${Array.isArray(sessionLog) && sessionLog.length
              ? sessionLog.map((s, i) => `<div>#${i+1}: ${s.date || "--"} &mdash; ${s.type || "Session"} &mdash; ${s.student || ""}</div>`).join("")
              : "<i>No sessions logged yet.</i>"}
          </div>
        </details>
        <details>
          <summary><strong>Feedback (optional)</strong></summary>
          <textarea name="feedback" rows="3" placeholder="Feedback, notes, or suggestions...">${feedback}</textarea>
        </details>
        <details>
          <summary><strong>Assigned Students</strong> (readonly)</summary>
          <div style="font-size:0.96em;">${assignedStudentsHtml}</div>
        </details>
        <details>
          <summary><strong>Admin Notes</strong> (staff only)</summary>
          <textarea name="adminNotes" rows="2" disabled placeholder="Visible to staff/admin only">${adminNotes}</textarea>
        </details>
        <label>
          <input type="checkbox" name="active" ${active ? "checked" : ""} disabled />
          Active Instructor <span style="font-size:0.98em;color:#888;">(Set by admin)</span>
        </label>
        <button class="btn primary wide" type="submit">Save Profile</button>
        <button class="btn outline" id="back-to-instructor-dashboard-btn" type="button" style="margin-top:0.5rem;">⬅ Dashboard</button>
      </form>
    </div>
  `;

  // Back button handler
  document.getElementById("back-to-instructor-dashboard-btn")?.addEventListener("click", () => {
    renderInstructorDashboard();
  });

  setupNavigation();

  // Profile picture upload
  container.querySelector('input[name="profilePic"]')?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const storageRef = ref(storage, `profilePics/${currentUserEmail}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      // Save to Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "users", snap.docs[0].id), { profilePicUrl: downloadURL });
      }
      showToast("Profile picture uploaded!");
      renderInstructorProfile(container); // Refresh
    } catch (err) {
      showToast("Failed to upload profile picture: " + err.message);
    }
  });

  // Save handler
  container.querySelector("#instructor-profile-form").onsubmit = async e => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);

    const name = fd.get("name").trim();
    const experience = fd.get("experience");
    const phone = fd.get("phone")?.trim() || "";
    const availability = fd.get("availability")?.trim() || "";
    const licenseClass = fd.get("licenseClass") || "";
    const licenseNumber = fd.get("licenseNumber")?.trim() || "";
    const licenseExp = fd.get("licenseExp") || "";
    const preferredContact = fd.get("preferredContact") || "";
    const feedback = fd.get("feedback")?.trim() || "";

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userDocRef = snap.docs[0].ref;
        await updateDoc(userDocRef, {
          name,
          experience,
          phone,
          availability,
          licenseClass,
          licenseNumber,
          licenseExp,
          preferredContact,
          feedback
        });
        localStorage.setItem("fullName", name);
        
        showToast("✅ Profile saved!");
        renderInstructorProfile(container); // Refresh for compliance check
      } else {
        throw new Error("User document not found");
      }
    } catch (err) {
      showToast("❌ Error saving profile: " + err.message);
    }
  };
}

// ─── RENDER ADMIN DASHBOARD ────────────────────────────────────────────────
async function renderAdminDashboard(container = document.getElementById("app")) {
  if (!container) return;
  if (!currentUserEmail) {
    showToast("No user found. Please log in again.");
    renderWelcome();
    return;
  }

  // Defensive role fallback
  let userData = {};
  let userRole = localStorage.getItem("userRole") || "admin";
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || userRole || "admin";
      localStorage.setItem("userRole", userRole);
    }
  } catch (e) {
    userData = {};
  }
  if (userRole !== "admin") {
    showToast("Access denied: Admin role required.");
    renderDashboard();
    return;
  }

  // --- Fetch All Users ---
  let allUsers = [];
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    usersSnap.forEach(doc => {
      const d = doc.data();
      allUsers.push({
        name: d.name || "User",
        email: d.email,
        role: d.role || "student",
        assignedInstructor: d.assignedInstructor || "",
        assignedCompany: d.assignedCompany || "",
        id: doc.id,
        profileProgress: d.profileProgress || 0,
        permitExpiry: d.permitExpiry || "",
        medCardExpiry: d.medCardExpiry || "",
        paymentStatus: d.paymentStatus || "",
        compliance: d.compliance || "",
      });
    });
  } catch (e) {
    allUsers = [];
    console.error("Admin user fetch error", e);
  }

  // --- Fetch Instructor List (for assignments) ---
  const instructorList = allUsers.filter(u => u.role === "instructor");
  // --- Fetch Company List (future feature, supports client companies) ---
  const companyList = Array.from(new Set(allUsers.map(u => u.assignedCompany).filter(Boolean)));

  // --- Render Admin Dashboard Layout ---
  container.innerHTML = `
    <h2 class="dash-head">Welcome, Admin! <span class="role-badge admin">Admin</span></h2>
    <button class="btn" id="edit-admin-profile-btn" style="margin-bottom:1.2rem;max-width:260px;">👤 View/Edit My Profile</button>
    <div class="dash-layout">
      <section class="dash-metrics">

        <div class="dashboard-card">
          <h3>👥 Manage Users</h3>
          <div style="margin-bottom:1em;">
            <label>Filter by Role:
              <select id="user-role-filter">
                <option value="">All</option>
                <option value="student">Students</option>
                <option value="instructor">Instructors</option>
                <option value="admin">Admins</option>
              </select>
            </label>
            <label style="margin-left:1em;">Company:
              <select id="user-company-filter">
                <option value="">All</option>
                ${companyList.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="user-table-scroll">
            <table class="user-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Assigned Instructor</th>
                  <th>Profile %</th>
                  <th>Permit Exp.</th>
                  <th>MedCard Exp.</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="user-table-body">
                ${allUsers.map(user => `
                  <tr data-user="${user.email}">
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>
                      <select class="role-select" data-user="${user.email}">
                        <option value="student" ${user.role === "student" ? "selected" : ""}>Student</option>
                        <option value="instructor" ${user.role === "instructor" ? "selected" : ""}>Instructor</option>
                        <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
                      </select>
                    </td>
                    <td>
                      <input type="text" class="company-input" data-user="${user.email}" value="${user.assignedCompany || ""}" placeholder="(Company)" style="width:100px;"/>
                    </td>
                    <td>
                      <select class="instructor-select" data-user="${user.email}">
                        <option value="">(None)</option>
                        ${instructorList.map(inst => `
                          <option value="${inst.email}" ${user.assignedInstructor === inst.email ? "selected" : ""}>${inst.name}</option>
                        `).join("")}
                      </select>
                    </td>
                    <td>${user.profileProgress || 0}%</td>
                    <td>${user.permitExpiry || ""}</td>
                    <td>${user.medCardExpiry || ""}</td>
                    <td>${user.paymentStatus || ""}</td>
                    <td>
                      <button class="btn outline btn-remove-user" data-user="${user.email}">Remove</button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="dashboard-card">
          <h3>🏢 Manage Companies</h3>
          <p>Create, edit, and view all companies who send students to your school. (Coming soon)</p>
          <button class="btn" id="add-company-btn" style="margin-top:10px;">+ Add Company</button>
        </div>

        <div class="dashboard-card">
          <h3>📝 Reports & Batch Messaging</h3>
          <p>
            Download user data, filter for missing docs, and message all students or instructors with one click.<br>
            <em>(Coming soon: Download/export, batch reminders, activity logs...)</em>
          </p>
        </div>
      </section>
      <button class="rail-btn logout wide-logout" id="logout-btn" aria-label="Logout">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="12" height="16" rx="2" stroke="#ff8080" stroke-width="2"/>
          <path d="M17 15l4-3-4-3m4 3H10" stroke="#ff8080" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="label">Logout</span>
      </button>
    </div>
  `;

  setupNavigation();

  // --- View/Edit My Profile (Admin) ---
  document.getElementById("edit-admin-profile-btn")?.addEventListener("click", () => {
    renderAdminProfile();
  });

  // --- Filter Logic (role/company) ---
  const roleFilter = container.querySelector("#user-role-filter");
  const companyFilter = container.querySelector("#user-company-filter");
  roleFilter?.addEventListener("change", filterUserTable);
  companyFilter?.addEventListener("change", filterUserTable);

  function filterUserTable() {
    const roleVal = roleFilter.value;
    const companyVal = companyFilter.value;
    const rows = container.querySelectorAll("#user-table-body tr");
    rows.forEach(row => {
      const roleCell = row.querySelector(".role-select")?.value || "";
      const companyCell = row.querySelector(".company-input")?.value || "";
      let show = true;
      if (roleVal && roleCell !== roleVal) show = false;
      if (companyVal && companyCell !== companyVal) show = false;
      row.style.display = show ? "" : "none";
    });
  }

  // --- Role Change Handler ---
  container.querySelectorAll(".role-select").forEach(select => {
    select.addEventListener("change", async (e) => {
      const userEmail = select.getAttribute("data-user");
      const newRole = select.value;
      try {
        await setDoc(doc(db, "users", userEmail), { role: newRole }, { merge: true });
        await setDoc(doc(db, "userRoles", userEmail), { role: newRole }, { merge: true });
        showToast(`Role updated for ${userEmail}`);
        renderAdminDashboard(container);
      } catch (err) {
        showToast("Failed to update role.");
      }
    });
  });

  // --- Company Assignment Handler ---
  container.querySelectorAll(".company-input").forEach(input => {
    input.addEventListener("blur", async () => {
      const userEmail = input.getAttribute("data-user");
      const newCompany = input.value.trim();
      try {
        await setDoc(doc(db, "users", userEmail), { assignedCompany: newCompany }, { merge: true });
        showToast(`Company assigned to ${userEmail}`);
      } catch (err) {
        showToast("Failed to assign company.");
      }
    });
  });

  // --- Instructor Assignment Handler ---
  container.querySelectorAll(".instructor-select").forEach(select => {
    select.addEventListener("change", async (e) => {
      const userEmail = select.getAttribute("data-user");
      const newInstructor = select.value;
      try {
        await setDoc(doc(db, "users", userEmail), { assignedInstructor: newInstructor }, { merge: true });
        showToast(`Instructor assigned to ${userEmail}`);
        renderAdminDashboard(container);
      } catch (err) {
        showToast("Failed to assign instructor.");
      }
    });
  });

  // --- Remove User Handler ---
  container.querySelectorAll(".btn-remove-user").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const userEmail = btn.getAttribute("data-user");
      if (!confirm(`Remove user: ${userEmail}? This cannot be undone.`)) return;
      try {
        await deleteDoc(doc(db, "users", userEmail));
        await deleteDoc(doc(db, "userRoles", userEmail));
        showToast(`User ${userEmail} removed`);
        renderAdminDashboard(container);
      } catch (err) {
        showToast("Failed to remove user.");
      }
    });
  });

  // --- Add Company Button (future) ---
  document.getElementById("add-company-btn")?.addEventListener("click", () => {
    showToast("Add company: Coming soon!");
    // TODO: Open company creation modal/form
  });

  // --- Logout ---
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.clear();
    renderWelcome();
  });
}

// ─── RENDER ADMIN PROFILE ────────────────────────────────────────────────
async function renderAdminProfile(container = document.getElementById("app")) {
  if (!container) return;

  if (!currentUserEmail) {
    showToast("No user found. Please log in again.");
    renderWelcome();
    return;
  }

  // Fetch admin data
  let userData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) userData = snap.docs[0].data();
  } catch (e) {
    userData = {};
  }
  if ((userData.role || "student") !== "admin") {
    showToast("Access denied: Admin profile only.");
    renderDashboard();
    return;
  }

  // --- Fields and Defaults ---
  const {
    name = "",
    email = currentUserEmail,
    profilePicUrl = "",
    phone = "",
    companyName = "",
    companyAddress = "",
    companyLogoUrl = "",
    adminNotes = "",
    emergencyContactName = "",
    emergencyContactPhone = "",
    emergencyContactRelation = "",
    complianceDocsUrl = "",
    adminWaiverSigned = false,
    adminSignature = ""
  } = userData;

  // MAIN ADMIN PROFILE FORM
  container.innerHTML = `
    <div class="screen-wrapper fade-in profile-page" style="max-width:520px;margin:0 auto;">
      <h2>👤 Admin Profile <span class="role-badge admin">Admin</span></h2>
      <form id="admin-profile-form" style="display:flex;flex-direction:column;gap:1.1rem;">
        <label>
          Name:
          <input type="text" name="name" value="${name}" required />
        </label>
        <label>
          Email:
          <span style="user-select:all;">${email}</span>
        </label>
        <label>
          Profile Picture:
          <input type="file" name="profilePic" accept="image/*" />
          ${profilePicUrl ? `<img src="${profilePicUrl}" alt="Profile Picture" style="max-width:90px;border-radius:12px;display:block;margin-top:7px;" />` : ""}
        </label>
        <label>
          Phone:
          <input type="tel" name="phone" value="${phone}" placeholder="(Optional)" />
        </label>
        <label>
          School / Company Name:
          <input type="text" name="companyName" value="${companyName}" />
        </label>
        <label>
          School Address:
          <input type="text" name="companyAddress" value="${companyAddress}" />
        </label>
        <label>
          Company Logo:
          <input type="file" name="companyLogo" accept="image/*" />
          ${companyLogoUrl ? `<img src="${companyLogoUrl}" alt="Logo" style="max-width:80px;display:block;margin-top:7px;" />` : ""}
        </label>
        <label>
          Admin Notes / Memo:
          <textarea name="adminNotes" rows="2">${adminNotes || ""}</textarea>
        </label>
        <details>
          <summary><strong>Emergency Contact</strong></summary>
          <label>Name: <input type="text" name="emergencyContactName" value="${emergencyContactName}" /></label>
          <label>Phone: <input type="tel" name="emergencyContactPhone" value="${emergencyContactPhone}" /></label>
          <label>Relation: <input type="text" name="emergencyContactRelation" value="${emergencyContactRelation}" /></label>
        </details>
        <details>
          <summary><strong>Compliance Documents</strong> (Insurance, Bonding, etc.)</summary>
          <label>Upload Document(s):
            <input type="file" name="complianceDocs" accept="image/*,application/pdf" />
            ${complianceDocsUrl ? `<a href="${complianceDocsUrl}" target="_blank">View</a>` : ""}
          </label>
        </details>
        <label>
          <input type="checkbox" name="adminWaiverSigned" ${adminWaiverSigned ? "checked" : ""} />
          I acknowledge the code of conduct and compliance requirements.
        </label>
        <label>
          Digital Signature: <input type="text" name="adminSignature" value="${adminSignature || ""}" placeholder="Type or sign your name" />
        </label>
        <button class="btn primary wide" type="submit">Save Profile</button>
        <button class="btn outline" id="back-to-admin-dashboard-btn" type="button" style="margin-top:0.5rem;">⬅ Dashboard</button>
      </form>
    </div>
  `;

  // --- NAVIGATION ---
  document.getElementById("back-to-admin-dashboard-btn")?.addEventListener("click", () => {
    renderAdminDashboard();
  });

  setupNavigation();

  // --- FILE UPLOAD HELPERS (inline for clarity, could be moved to helpers.js) ---
  async function handleFileInput(inputName, storagePath, updateField) {
    const input = container.querySelector(`input[name="${inputName}"]`);
    if (!input) return;
    input.addEventListener("change", async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const storageRef = ref(storage, `${storagePath}/${currentUserEmail}-${Date.now()}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        // Update field in Firestore
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", currentUserEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(doc(db, "users", snap.docs[0].id), { [updateField]: downloadURL });
          showToast(`${updateField.replace(/Url$/,"")} uploaded!`);
        }
      } catch (err) {
        showToast(`Failed to upload ${updateField}: ` + err.message);
      }
    });
  }
  // Wire up all upload fields
  handleFileInput("profilePic", "profilePics", "profilePicUrl");
  handleFileInput("companyLogo", "schoolLogos", "companyLogoUrl");
  handleFileInput("complianceDocs", "complianceDocs", "complianceDocsUrl");

  // --- SAVE PROFILE HANDLER ---
  container.querySelector("#admin-profile-form").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);

    // Build profile update object
    const updateObj = {
      name: fd.get("name"),
      phone: fd.get("phone"),
      companyName: fd.get("companyName"),
      companyAddress: fd.get("companyAddress"),
      adminNotes: fd.get("adminNotes"),
      emergencyContactName: fd.get("emergencyContactName"),
      emergencyContactPhone: fd.get("emergencyContactPhone"),
      emergencyContactRelation: fd.get("emergencyContactRelation"),
      adminWaiverSigned: !!fd.get("adminWaiverSigned"),
      adminSignature: fd.get("adminSignature"),
    };

    // Save to Firestore
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, updateObj);
        localStorage.setItem("fullName", updateObj.name);
        showToast("✅ Profile saved!");
        renderAdminProfile(container); // re-render for changes
      } else throw new Error("User document not found.");
    } catch (err) {
      showToast("❌ Error saving: " + err.message);
    }
  };
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
async function renderTestResults(container = document.getElementById("app")) {
  if (!container) return;

  // 1. Show loading state
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
      <h2>📊 Test Results</h2>
      <p>Loading...</p>
    </div>
  `;

  // 2. Fetch test results for current user
  let results = [];
  try {
    const snap = await getDocs(
      query(
        collection(db, "testResults"),
        where("studentId", "==", currentUserEmail)
      )
    );

    // 3. Normalize timestamps (Firestore Timestamp or ISO string)
    results = snap.docs.map(d => {
      const data = d.data();
      const ts = data.timestamp;
      const date = ts?.toDate
        ? ts.toDate()        // Firestore Timestamp
        : new Date(ts);      // ISO string fallback
      return { ...data, timestamp: date };
    });

    // 4. Sort descending by date
    results.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error("❌ Error loading test results:", e);
    results = [];
  }

  // 5. Build results HTML
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
          <strong>${r.testName}</strong> -- <b>${pct}%</b> <span style="color:#888;">(${r.correct}/${r.total}) on ${date}</span>
        </li>
      `;
    });
  }

  html += `
      </ul>
      <div style="text-align:center; margin-top:20px;">
        <button class="btn outline" data-nav="dashboard" style="margin-right:8px;">⬅ Back to Dashboard</button>
        <button class="btn" data-nav="practiceTests">🔄 Retake a Test</button>
      </div>
    </div>
  `;

  // 6. Render and re-bind navigation
  container.innerHTML = html;
  setupNavigation();
}

// ─── 11. REAL TEST ENGINE ───────────────────────────────────────────────
async function renderTestEngine(container = document.getElementById("app"), testName) {
  if (!container || !testName) return;

  // 1. Question banks (expand as needed)
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

  const questions = questionBanks[testName] || [];
  let currentIdx = 0;
  let correctCount = 0;

  // --- Render a single question ---
  function showQuestion() {
    const { q, choices } = questions[currentIdx];
    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto;">
        <h2>🧪 ${testName} (${currentIdx + 1}/${questions.length})</h2>
        <p style="margin:16px 0;"><strong>${q}</strong></p>
        <ul style="list-style:none; padding:0;">
          ${choices
            .map((c, i) => `<li style="margin:8px 0;">
              <button class="choice-btn btn outline wide" data-choice="${i}" style="width:100%; padding:10px;">
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

  // --- Render Results Page ---
  async function showResults() {
    const total = questions.length;
    const pct   = total ? Math.round((correctCount / total) * 100) : 0;

    // Save result to Firestore
    try {
      await addDoc(collection(db, "testResults"), {
        studentId: currentUserEmail,
        testName,
        correct: correctCount,
        total,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("❌ Failed to save test result:", e);
      showToast("Error saving test result");
    }

    container.innerHTML = `
      <div class="screen-wrapper fade-in" style="padding:20px; max-width:600px; margin:0 auto; text-align:center;">
        <h2>📊 ${testName} Results</h2>
        <p style="font-size:1.2em; margin:16px 0;">
          You scored <strong>${correctCount}/${total}</strong> (${pct}%)
        </p>
        <button class="btn outline wide" data-nav="dashboard" style="margin-top:20px;">
          🏠 Back to Dashboard
        </button>
        <button class="btn wide" data-nav="practiceTests" style="margin-top:12px;">
          🔄 Try Again
        </button>
      </div>
    `;
    setupNavigation();
  }

  // --- Start quiz or show empty-state message ---
  if (questions.length === 0) {
    container.innerHTML = `<div class="screen-wrapper fade-in"><p>No questions found for "${testName}".</p></div>`;
    setupNavigation();
  } else {
    showQuestion();
  }
}

// ─── Kick everything off ────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUserEmail = user.email;

      try {
        const roleDoc = await getDoc(doc(db, "userRoles", currentUserEmail));
        const role = roleDoc.exists() ? roleDoc.data().role : "student";

        switch (role) {
          case "admin":
            renderAdminDashboard();
            break;
          case "instructor":
            renderInstructorDashboard();
            break;
          default:
            renderDashboard();
        }
      } catch (err) {
        console.error("Failed to fetch user role:", err);
        showToast("Failed to load user role");
        renderDashboard(); // fallback
      }
    } else {
      currentUserEmail = null; // ensure email state is cleared!
      renderWelcome();
    }
  });
});