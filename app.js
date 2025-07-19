// ─── Global State ─────────────────────────────────────────────────────────────
let currentUserEmail = null;
let loaderShownAt = Date.now();
let loaderEl = document.getElementById("app-loader");

// ─── 1. MODULE IMPORTS ─────────────────────────────────────────────────────────

// Firebase core
import { db, auth, storage } from "./firebase.js";

// Firestore methods
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
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

      console.log("DEBUG: Checking userRoles for:", user.email);

      if (roleDoc.exists()) {
        const data = roleDoc.data();
        console.log("DEBUG: userRoles data for", user.email, ":", data);
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
          console.log("DEBUG: User profile role updated to", userRole);
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
        console.log("DEBUG: Created new user profile for:", user.email);
      }

      // Write role and schoolId for UI logic
      localStorage.setItem("userRole", userRole);
      if (schoolId) localStorage.setItem("schoolId", schoolId);
      else localStorage.removeItem("schoolId");

      // Route by role (expandable for future)
      showPageTransitionLoader();
      setTimeout(() => {
        if (!schoolId) {
          renderProfile();
        } else if (userRole === "admin") {
          renderAdminDashboard();
        } else if (userRole === "instructor") {
          renderInstructorDashboard();
        } else {
          renderDashboard();
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

// ── Welcome screen with infinite carousel, bokeh, typewriter, etc. ── //
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

// ─── 4. SMART NAVIGATION ───────────────────────────────────────────────────────

// Route and transition handler
function handleNavigation(page) {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  const currentScreen = appEl.querySelector(".screen-wrapper");
  if (currentScreen) {
    currentScreen.classList.add("fade-out");
    currentScreen.addEventListener("transitionend", function onFade() {
      currentScreen.removeEventListener("transitionend", onFade);
      doNavigation(page, appEl);
    }, { once: true });
    showPageTransitionLoader();
  } else {
    doNavigation(page, appEl);
  }
}

// Main switch for routing pages
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
  case "checklists":
    renderChecklists(appEl);
    break;
  case "practiceTests":
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
  // Only update URL hash if needed
  if (page !== location.hash.replace("#", "")) {
    history.pushState({}, "", "#" + page);
  }
  hidePageTransitionLoader();
}

// Global event handler for nav buttons (delegated)
document.body.addEventListener("click", (e) => {
  const target = e.target.closest("[data-nav]");
  if (target) {
    const page = target.getAttribute("data-nav");
    if (page) {
      handleNavigation(page);
    }
  }
});

// Browser back/forward support
window.addEventListener("popstate", () => {
  const page = location.hash.replace("#", "") || "home";
  handleNavigation(page);
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

  // --- Checklist Progress ---
  let checklistPct = 0;
  try {
    const snap = await getDocs(
      query(collection(db, "eldtProgress"), where("studentId", "==", currentUserEmail))
    );
    let total = 0, done = 0;
    snap.forEach((d) => {
      const prog = d.data().progress || {};
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

  // --- RENDER DASHBOARD LAYOUT ---------------------------------------
  const name = localStorage.getItem("fullName") || "CDL User";
  const roleBadge = `<span class="role-badge student">Student</span>`;

  container.innerHTML = `
    <h2 class="dash-head">Welcome back, ${name}! ${roleBadge}</h2>
    <button class="btn" id="edit-student-profile-btn" style="margin-bottom:1.2rem;max-width:260px;">👤 View/Edit My Profile</button>
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
          <!-- AI Coach -->
          <button class="rail-btn coach" data-nav="coach" aria-label="AI Coach">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="7" stroke="#68e3c4" stroke-width="2"/>
              <circle cx="10" cy="10" r="1.2" stroke="#68e3c4" stroke-width="2" fill="none"/>
              <circle cx="14" cy="10" r="1.2" stroke="#68e3c4" stroke-width="2" fill="none"/>
              <path d="M10 15c1-.7 3-.7 4 0" stroke="#68e3c4" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="label">AI<br>Coach</span>
          </button>
        </aside>
      </div>
      <!-- Logout (rectangle) -->
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

  // --- View/Edit My Profile (Student) ---
  document.getElementById("edit-student-profile-btn")?.addEventListener("click", () => {
    renderProfile();
  });

  // --- Logout ---
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await signOut(auth);
    localStorage.removeItem("fullName");
    localStorage.removeItem("userRole");
    renderWelcome();
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

// ─── RENDER PROFILE (Student, Instructor, Admin) ─────────────────────────────
async function renderProfile(container = document.getElementById("app")) {
  if (!container) return;

  if (!currentUserEmail) {
    showToast("No user found. Please log in again.");
    renderWelcome();
    return;
  }

  // Defensive: only show for logged-in users (students, instructors, admin)
  let userData = {};
  let userRole = localStorage.getItem("userRole") || "student";
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", currentUserEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      userData = snap.docs[0].data();
      userRole = userData.role || userRole || "student";
      localStorage.setItem("userRole", userRole);
      if (userData.name) localStorage.setItem("fullName", userData.name);
    } else {
      showToast("Profile not found. Please contact support or re-register.");
      renderWelcome();
      return;
    }
  } catch (e) {
    userData = {};
  }

  // Default fields
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
    experience = "",
    assignedInstructor = "",
    role = userRole
  } = userData;

  // Profile header for each role
  let title = "👤 My Profile";
  if (userRole === "instructor") title = "👤 Instructor Profile";
  else if (userRole === "admin") title = "👤 Admin Profile";

  // Only students get all CDL/permit fields
  let cdlFields = "";
  if (userRole === "student") {
    cdlFields = `
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
    `;
  }

  container.innerHTML = `
    <div class="screen-wrapper fade-in profile-page" style="max-width: 480px; margin: 0 auto;">
      <h2>${title} <span class="role-badge ${userRole}">${userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span></h2>
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
        ${cdlFields}
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
        ${
          userRole === "instructor" && assignedInstructor
            ? `<div class="profile-info">Assigned by Admin: ${assignedInstructor}</div>`
            : ""
        }
        <button class="btn primary wide" type="submit">Save Profile</button>
        <button class="btn outline" id="back-to-dashboard-btn" type="button" style="margin-top:0.5rem;">⬅ Dashboard</button>
      </form>
    </div>
  `;

  // Show/hide student-specific sections based on select fields
  if (userRole === "student") {
    container.querySelector('select[name="cdlPermit"]').addEventListener('change', function() {
      document.getElementById('permit-photo-section').style.display = this.value === "yes" ? "" : "none";
    });
    container.querySelector('select[name="vehicleQualified"]').addEventListener('change', function() {
      document.getElementById('vehicle-photos-section').style.display = this.value === "yes" ? "" : "none";
    });
  }

  // Context-aware back navigation (role-sensitive)
  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    if (userRole === "admin") renderAdminDashboard();
    else if (userRole === "instructor") renderInstructorDashboard();
    else renderDashboard();
  });

  setupNavigation();

  // PERMIT UPLOAD HANDLER (students only)
  if (userRole === "student") {
    container.querySelector('input[name="permitPhoto"]')?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const storageRef = ref(storage, `permits/${currentUserEmail}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", currentUserEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(doc(db, "users", snap.docs[0].id), { permitPhotoUrl: downloadURL });
        }
        await markStudentPermitUploaded(currentUserEmail);
        showToast("Permit uploaded and progress updated!");
      } catch (err) {
        showToast("Failed to upload permit: " + err.message);
      }
    });

    // VEHICLE DATA PLATE UPLOAD HANDLER (students only)
    let truckUploaded = !!truckPlateUrl, trailerUploaded = !!trailerPlateUrl;

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
  }

  // PROFILE SAVE HANDLER (all roles)
  container.querySelector("#profile-form").onsubmit = async e => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);

    // Simple fields
    const name             = fd.get("name").trim();
    const dob              = fd.get("dob");
    const experience       = fd.get("experience");
    let updates = { name, dob, experience };

    // Role-specific fields
    if (userRole === "student") {
      updates.cdlClass = fd.get("cdlClass");
      updates.cdlPermit = fd.get("cdlPermit");
      updates.vehicleQualified = fd.get("vehicleQualified");
    }

    // Upload profile picture if chosen
    let updatedProfilePicUrl = profilePicUrl;
    const profilePicFile = fd.get("profilePic");
    if (profilePicFile && profilePicFile.size) {
      try {
        const storageRef = ref(storage, `profilePics/${currentUserEmail}`);
        await uploadBytes(storageRef, profilePicFile);
        updatedProfilePicUrl = await getDownloadURL(storageRef);
        updates.profilePicUrl = updatedProfilePicUrl;
      } catch (err) {
        showToast("⚠️ Profile picture upload failed: " + err.message);
      }
    }

    // Update Firestore user doc
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userDocRef = snap.docs[0].ref;
        await updateDoc(userDocRef, updates);
        if (userRole === "student") await markStudentProfileComplete(currentUserEmail);
        showToast("✅ Profile saved and progress updated!");
      } else {
        throw new Error("User document not found");
      }
    } catch (err) {
      showToast("❌ Error saving profile: " + err.message);
    }
  };
}

// ─── RENDER CHECKLIST (Student) ──────────────────────────────────────────────
async function renderChecklists(container = document.getElementById("app")) {
  if (!container) return;

  // Use consistent user context
  const email = currentUserEmail || (auth.currentUser && auth.currentUser.email);
  if (!email) {
    container.innerHTML = "<p>You must be logged in to view this page.</p>";
    return;
  }

  // --- Load student data (from Firestore) ---
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

  // Defensive: Only students see the student checklist
  if (userRole !== "student") {
    container.innerHTML = "<p>This checklist is only available for students.</p>";
    return;
  }

  // Extract progress-related fields safely
  const {
    cdlClass = "",
    cdlPermit = "",
    permitPhotoUrl = "",
    vehicleQualified = "",
    truckPlateUrl = "",
    trailerPlateUrl = "",
    experience = "",
    lastTestScore = 0,
    walkthroughProgress = 0,
    studyMinutes = 0,
  } = userData;

  // Build checklist state
  const checklist = [
    {
      label: "Profile Complete",
      done: !!(cdlClass && cdlPermit && experience),
      link: "profile",
      notify: !(cdlClass && cdlPermit && experience),
    },
    {
      label: "Permit Uploaded",
      done: cdlPermit === "yes" && !!permitPhotoUrl,
      link: "profile",
      notify: cdlPermit === "yes" && !permitPhotoUrl,
    },
    {
      label: "Vehicle Data Plates Uploaded",
      done: vehicleQualified === "yes" && !!truckPlateUrl && !!trailerPlateUrl,
      link: "profile",
      notify: vehicleQualified === "yes" && (!truckPlateUrl || !trailerPlateUrl),
    },
    {
      label: "Practice Test Passed",
      done: lastTestScore >= 80,
      link: "practiceTests",
      notify: lastTestScore < 80,
    },
    {
      label: "Walkthrough Progress",
      done: walkthroughProgress >= 1,
      link: "walkthrough",
      notify: walkthroughProgress < 1,
    },
  ];
  const complete = checklist.filter(x => x.done).length;
  const percent = Math.round((complete / checklist.length) * 100);

  // Render page
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

  // Checklist completion nav (for 'Complete' buttons)
  container.querySelectorAll('.btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', e => {
      const target = btn.getAttribute('data-nav');
      if (target === "profile") return renderProfile();
      if (target === "walkthrough") return renderWalkthrough();
      if (target === "practiceTests") return renderPracticeTests();
      setupNavigation();
    });
  });

  // Explicit back button (always works)
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

// ─── AI COACH PAGE ─────────────────────────────────────────────────────────
async function renderAICoach(container = document.getElementById("app")) {
  if (!container) return;
  container.innerHTML = `
    <div class="screen-wrapper ai-coach-page fade-in" style="max-width: 480px; margin:0 auto; display:flex; flex-direction:column; height:100vh;">
      <header style="text-align:center; margin-bottom:1rem;">
        <h2 style="margin-bottom: 0.3em;">🤖 CDL AI Coach</h2>
        <div class="subtitle" style="font-size:1.1em;color:var(--accent);margin-bottom:0.2em;">
          Get quick CDL answers, anytime--based on real FMCSA guidelines.
        </div>
        <div style="font-size:0.93em;opacity:0.85;">
          Try asking:<br>
          <span class="sample-qs">"What are the air brake check steps?"</span> • 
          <span class="sample-qs">"How many hours can I drive in a day?"</span> • 
          <span class="sample-qs">"What is the three-point brake check?"</span>
        </div>
      </header>
      <div id="ai-chat-history" class="ai-chat-history" style="flex:1; overflow-y:auto; background:rgba(30,27,54,0.15); border-radius:12px; padding:13px 11px; margin-bottom:1.1em;"></div>
      <form id="ai-chat-form" class="ai-chat-form" style="display:flex;gap:7px;align-items:center;">
        <input id="ai-input" autocomplete="off" type="text" placeholder="Type your CDL question..." class="ai-input" style="flex:1; padding:13px 12px; border-radius:9px; border:1px solid #333; font-size:1.07em;" />
        <button class="btn" style="padding:10px 20px;">Send</button>
      </form>
      <button class="btn wide outline" id="back-to-dashboard-btn" style="margin:1.3rem 0 0 0;">⬅ Back to Dashboard</button>
    </div>
  `;

  setupNavigation();

  document.getElementById("back-to-dashboard-btn")?.addEventListener("click", () => {
    renderDashboard();
  });

  // -- AI State
  const chatHistoryEl = container.querySelector("#ai-chat-history");
  let conversation = JSON.parse(sessionStorage.getItem("aiCoachHistory") || "[]");

  function renderHistory() {
    chatHistoryEl.innerHTML = conversation.map(
      msg => `
        <div class="ai-msg ai-msg--${msg.role}">
          <div class="ai-msg-bubble">${msg.content}
            ${msg.role === "assistant" && msg.fmcsatag ? `<div class="ai-source-tag">(${msg.fmcsatag})</div>` : ""}
          </div>
        </div>
      `
    ).join("") || `<div class="ai-msg ai-msg--assistant"><div class="ai-msg-bubble">Hi! I’m your CDL AI Coach. How can I help?</div></div>`;
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
  }
  renderHistory();

  // --- AI Chat Handler
  container.querySelector("#ai-chat-form").onsubmit = async (e) => {
    e.preventDefault();
    const input = container.querySelector("#ai-input");
    const question = input.value.trim();
    if (!question) return;
    // Add user Q
    conversation.push({ role: "user", content: question });
    renderHistory();
    input.value = "";
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    // Show loading
    chatHistoryEl.innerHTML += `<div class="ai-msg ai-msg--assistant"><div class="ai-msg-bubble">Thinking...</div></div>`;
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

    // --- CALL AI (OpenAI API)
    let reply = "";
    try {
      reply = await askCDLAI(question, conversation.slice(-10));
    } catch (err) {
      reply = "Sorry, I couldn't reach the AI right now.";
    }

    // FMCSA tag
    let fmcsatag = "Based on FMCSA regulations, updated 2024";
    if (reply.includes("ask your instructor") || reply.includes("official FMCSA manual"))
      fmcsatag = "";

    // Hand-off if AI can’t help
    if (/i (don'?t|cannot|can't) know|i am not sure|as an ai/i.test(reply)) {
      reply += `<br><span class="ai-handoff">[View the <a href="https://www.fmcsa.dot.gov/regulations/title49/section/393.1" target="_blank" rel="noopener">official FMCSA manual</a> or ask your instructor for help]</span>`;
    }

    conversation.push({ role: "assistant", content: reply, fmcsatag });
    sessionStorage.setItem("aiCoachHistory", JSON.stringify(conversation));
    renderHistory();
  };
}

// --- OpenAI Chat Call (Free tier, no backend needed) ---
async function askCDLAI(prompt, history = []) {
  const apiKey = "YOUR_OPENAI_API_KEY"; // <-- Replace with your test key!
  const systemMsg = {
    role: "system",
    content: "You are a CDL (commercial driver’s license) expert. Only answer CDL, truck driving, and FMCSA topics in clear, simple language for beginners. If a question is not about FMCSA/CDL, politely decline."
  };
  // Context: last 3 QAs + system prompt (OpenAI free tier is 4K tokens; don't overflow)
  const msgs = [systemMsg]
    .concat(history.slice(-3).map(msg => ({
      role: msg.role,
      content: msg.content.replace(/(<([^>]+)>)/gi, "") // strip tags for input
    })))
    .concat([{ role: "user", content: prompt }]);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: msgs,
      max_tokens: 220,
      temperature: 0.45,
    })
  });
  if (!res.ok) throw new Error("OpenAI API error");
  const data = await res.json();
  return (data.choices && data.choices[0] && data.choices[0].message.content) || "No answer available.";
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
        license: d.licenseType || "Not set",
        experience: d.experience || "Unknown",
        permit: d.permit || false,
        checklistComplete: d.checklistComplete || false,
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
                        <div>License: ${student.license}</div>
                        <div>Experience: ${student.experience}</div>
                        <div>Permit: ${student.permit ? "✔️" : "❌"}</div>
                        <div>Checklist: ${student.checklistComplete ? "✅ Complete" : "In Progress"}</div>
                        <div>Last Test: ${
                          testResultsByStudent[student.email]
                            ? `${testResultsByStudent[student.email].testName} – ${testResultsByStudent[student.email].pct}% on ${testResultsByStudent[student.email].date}`
                            : "No recent test"
                        }</div>
                        <button class="btn" data-student="${student.email}" data-nav="viewStudentProfile">View Profile</button>
                      </div>
                    `
                    )
                    .join("")}
                </div>`
          }
        </div>
        <div class="dashboard-card">
          <h3>✅ Review Checklists</h3>
          <p>Sign off on student milestones and walk-throughs.</p>
          <!-- Optionally, add checklist review tools here -->
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

  // Handle View Student Profile button
  container.querySelectorAll('button[data-nav="viewStudentProfile"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const studentEmail = btn.getAttribute("data-student");
      renderStudentProfileForInstructor(studentEmail);
    });
  });
}

// ─── RENDER STUDENT PROFILE FOR INSTRUCTOR ─────────────────────────────
async function renderStudentProfileForInstructor(studentEmail, container = document.getElementById("app")) {
  if (!studentEmail) {
    showToast("No student selected.");
    return;
  }

  // 1. Fetch student user profile
  let studentData = {};
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", studentEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      studentData = snap.docs[0].data();
    }
  } catch (e) {
    showToast("Failed to load student profile.");
    return;
  }

  // 2. Fetch license & experience info
  let license = "Not selected", experience = "Unknown";
  try {
    const licSnap = await getDocs(query(collection(db, "licenseSelection"), where("studentId", "==", studentEmail)));
    licSnap.forEach((d) => (license = d.data().licenseType || license));
    const expSnap = await getDocs(query(collection(db, "experienceResponses"), where("studentId", "==", studentEmail)));
    expSnap.forEach((d) => (experience = d.data().experience || experience));
  } catch (e) {}

  // 3. Fetch permit, checklist, and test info (optional - show if available)
  let permitStatus = "Not uploaded";
  try {
    permitStatus = studentData.permit ? "Uploaded" : "Not uploaded";
  } catch (e) {}

  // Checklist percent (use your existing ELDT logic)
  let checklistPct = 0;
  try {
    const snap = await getDocs(
      query(collection(db, "eldtProgress"), where("studentId", "==", studentEmail))
    );
    let total = 0, done = 0;
    snap.forEach((d) => {
      const prog = d.data().progress || {};
      Object.values(prog).forEach((sec) =>
        Object.values(sec).forEach((val) => {
          total++;
          if (val) done++;
        })
      );
    });
    checklistPct = total ? Math.round((done / total) * 100) : 0;
  } catch (e) {}

  // Last test
  let lastTestStr = "No tests taken yet.";
  try {
    const snap = await getDocs(
      query(collection(db, "testResults"), where("studentId", "==", studentEmail))
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
  } catch (e) {}

  // 4. Render modal or inline profile (modal recommended)
  let modal = document.createElement("div");
  modal.className = "modal-overlay fade-in";
  modal.innerHTML = `
    <div class="modal-card student-profile-modal">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h2>Student Profile</h2>
      <div class="profile-row">
        <strong>Name:</strong> <span>${studentData.name || "Unknown"}</span>
      </div>
      <div class="profile-row">
        <strong>Email:</strong> <span>${studentData.email}</span>
      </div>
      <div class="profile-row">
        <strong>License:</strong> <span>${license}</span>
      </div>
      <div class="profile-row">
        <strong>Experience:</strong> <span>${experience}</span>
      </div>
      <div class="profile-row">
        <strong>Permit:</strong> <span>${permitStatus}</span>
      </div>
      <div class="profile-row">
        <strong>Checklist:</strong> 
        <span><div class="progress-bar" style="display:inline-block;width:120px;">
          <div class="progress-fill" style="width:${checklistPct}%;"></div>
        </div> ${checklistPct}%</span>
      </div>
      <div class="profile-row">
        <strong>Last Test:</strong> <span>${lastTestStr}</span>
      </div>
      <button class="btn outline" id="close-profile-modal" style="margin-top:1.2em;width:100%;">Close</button>
    </div>
  `;

  // Remove old modals first
  document.querySelectorAll(".modal-overlay").forEach(el => el.remove());
  document.body.appendChild(modal);

  // Close handlers
  modal.querySelector(".modal-close")?.addEventListener("click", () => modal.remove());
  modal.querySelector("#close-profile-modal")?.addEventListener("click", () => modal.remove());

  // Optional: block background scroll while modal open
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

  const {
    name = "",
    email = currentUserEmail,
    profilePicUrl = "",
    experience = "",
    phone = ""
    // Add other instructor fields as needed
  } = userData;

  container.innerHTML = `
    <div class="screen-wrapper fade-in profile-page" style="max-width: 480px; margin: 0 auto;">
      <h2>👤 Instructor Profile <span class="role-badge instructor">Instructor</span></h2>
      <form id="instructor-profile-form" style="display:flex;flex-direction:column;gap:1.3rem;">
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
        <label>
          Phone:
          <input type="tel" name="phone" value="${phone}" placeholder="(Optional)" />
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

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userDocRef = snap.docs[0].ref;
        await updateDoc(userDocRef, {
          name,
          experience,
          phone
        });
        localStorage.setItem("fullName", name);
        showToast("✅ Profile saved!");
      } else {
        throw new Error("User document not found");
      }
    } catch (err) {
      showToast("❌ Error saving profile: " + err.message);
    }
  };
}

// ─── ADMIN DASHBOARD ────────────────────────────────────────────────────
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
        id: doc.id,
      });
    });
  } catch (e) {
    allUsers = [];
    console.error("Admin user fetch error", e);
  }

  // --- Fetch Instructor List (for assignments) ---
  const instructorList = allUsers.filter(u => u.role === "instructor");

  // --- Render Admin Dashboard Layout ---
  container.innerHTML = `
    <h2 class="dash-head">Welcome, Admin! <span class="role-badge admin">Admin</span></h2>
    <button class="btn" id="edit-admin-profile-btn" style="margin-bottom:1.2rem;max-width:260px;">👤 View/Edit My Profile</button>
    <div class="dash-layout">
      <section class="dash-metrics">

        <div class="dashboard-card">
          <h3>👥 Manage Users</h3>
          <div class="user-table-scroll">
            <table class="user-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Assigned Instructor</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${
                  allUsers
                    .map(
                      user => `
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
                            <select class="instructor-select" data-user="${user.email}">
                              <option value="">(None)</option>
                              ${instructorList
                                .map(
                                  inst => `<option value="${inst.email}" ${
                                    user.assignedInstructor === inst.email ? "selected" : ""
                                  }>${inst.name}</option>`
                                )
                                .join("")}
                            </select>
                          </td>
                          <td>
                            <button class="btn outline btn-remove-user" data-user="${user.email}">Remove</button>
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="dashboard-card">
          <h3>🏫 School & Branding</h3>
          <p>Edit school info, manage branding, view analytics.<br><em>(Coming soon)</em></p>
        </div>
        <div class="dashboard-card">
          <h3>📝 Reports</h3>
          <p>Download activity and progress reports for all users.<br><em>(Coming soon)</em></p>
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

  const {
    name = "",
    email = currentUserEmail,
    profilePicUrl = "",
    phone = ""
    // Add other admin fields if needed
  } = userData;

  container.innerHTML = `
    <div class="screen-wrapper fade-in profile-page" style="max-width: 480px; margin: 0 auto;">
      <h2>👤 Admin Profile <span class="role-badge admin">Admin</span></h2>
      <form id="admin-profile-form" style="display:flex;flex-direction:column;gap:1.3rem;">
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
        <button class="btn primary wide" type="submit">Save Profile</button>
        <button class="btn outline" id="back-to-admin-dashboard-btn" type="button" style="margin-top:0.5rem;">⬅ Dashboard</button>
      </form>
    </div>
  `;

  // Back button handler
  document.getElementById("back-to-admin-dashboard-btn")?.addEventListener("click", () => {
    renderAdminDashboard();
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
      renderAdminProfile(container); // Refresh
    } catch (err) {
      showToast("Failed to upload profile picture: " + err.message);
    }
  });

  // Save handler
  container.querySelector("#admin-profile-form").onsubmit = async e => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);

    const name = fd.get("name").trim();
    const phone = fd.get("phone")?.trim() || "";

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", currentUserEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userDocRef = snap.docs[0].ref;
        await updateDoc(userDocRef, {
          name,
          phone
        });
        localStorage.setItem("fullName", name);
        showToast("✅ Profile saved!");
      } else {
        throw new Error("User document not found");
      }
    } catch (err) {
      showToast("❌ Error saving profile: " + err.message);
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