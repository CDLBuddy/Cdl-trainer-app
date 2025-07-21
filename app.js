// app.js

// ─── Global State ─────────────────────────────────────────────────────────────
let currentUserEmail = null;
let loaderShownAt = Date.now();
let loaderEl = document.getElementById("app-loader");

// ─── Firebase Core/Helpers ────────────────────────────────────────────────────
import { db, auth, storage, getLatestUpdate } from "./firebase.js";

// ─── Firestore Methods ────────────────────────────────────────────────────────
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

// ─── Auth ─────────────────────────────────────────────────────────────────────
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// ─── Storage ──────────────────────────────────────────────────────────────────
import {
  uploadBytes,
  getDownloadURL,
  ref
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

// ─── UI Helpers (General + ELDT Progress/Checklist) ───────────────────────────
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
  showLatestUpdate,
  formatDate
} from "./ui-helpers.js";

// ─── Modularized Page Renders ────────────────────────────────────────────────
// Dashboard
import { renderDashboard } from './dashboard-student.js';

// Student Pages
import { renderProfile } from './profile.js';
import { renderAICoach } from './ai-coach.js';
import { renderWalkthrough } from './walkthrough.js';
import { renderChecklists } from './checklists.js';
import { renderPracticeTests, renderTestReview } from './practice-tests.js';
import { renderFlashcards } from './flashcards.js';
import { renderTestResults } from './test-results.js';

// (Instructor/Admin dashboards as you modularize them:)
// import { renderInstructorDashboard } from './dashboard-instructor.js';
// import { renderAdminDashboard } from './dashboard-admin.js';

// ─── End Imports ──────────────────────────────────────────────────────────────
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