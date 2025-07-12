// app.js

alert("🚀 app.js loaded – imports start");

// ─── 1. MODULE IMPORTS ─────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
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
import { showToast as importedShowToast } from "./ui-helpers.js";

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

alert("✅ Imports & config OK");

// ─── 3. AUTH STATE LISTENER (FULL) ─────────────────────────────────────────────
alert("🔔 Attaching full auth listener");
onAuthStateChanged(auth, async user => {
  console.log("🔥 Firebase auth state changed", user);
  
  // Hide any loading overlays (if you have them)
  document.getElementById("js-error")?.classList.add("hidden");
  document.getElementById("loading-screen")?.classList.add("hidden");

  const appEl = document.getElementById("app");
  if (appEl) {
    // Show a loading placeholder
    appEl.innerHTML = `
      <div class="screen-wrapper fade-in" style="text-align:center">
        <div class="loading-spinner" style="margin:40px auto;"></div>
        <p>Checking your credentials…</p>
      </div>
    `;
  }

  if (user) {
    // User is signed in
    const email = user.email;
    currentUserEmail = email;

    // 1) Fetch or create profile in Firestore
    let userData;
    try {
      const userRef   = collection(db, "users");
      const userQuery = query(userRef, where("email", "==", email));
      const snap      = await getDocs(userQuery);
      if (!snap.empty) {
        userData = snap.docs[0].data();
      } else {
        const newUser = {
          uid:       user.uid,
          email,
          name:      user.displayName || "CDL User",
          role:      "student",
          verified:  false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        await addDoc(userRef, newUser);
        userData = newUser;
      }
      // 2) Save to localStorage
      localStorage.setItem("userRole",    userData.role    || "student");
      localStorage.setItem("fullName",    userData.name    || "CDL User");
    } catch (err) {
      console.error("❌ User profile error:", err);
      showToast("Error loading profile");
      return;
    }

    // 3) Route to dashboard based on role
    const role = localStorage.getItem("userRole");
    if (role === "admin") {
      renderAdminDashboard();
    } else if (role === "instructor") {
      renderInstructorDashboard();
    } else {
      renderDashboard();
    }

  } else {
    // No user signed in → show welcome screen
    currentUserEmail = null;
    renderWelcome();
  }
});
alert("✅ Full auth listener attached");

// ─── 4. UTILITY FUNCTIONS ──────────────────────────────────────────────────────
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

alert("✅ Utilities OK");

// ─── 5. SIMPLE RENDER & TEST UI ────────────────────────────────────────────────
function renderWelcome() {
  const appEl = document.getElementById("app");
  if (!appEl) {
    alert("❌ #app not found");
    return;
  }
  appEl.innerHTML = `
    <div style="padding:20px; text-align:center;">
      <h1>Welcome!</h1>
      <button id="login-btn">🚀 Login</button>
    </div>
  `;

  // 1) Direct click binding for Login
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      alert("🛠️ [DEBUG] Direct click on login-btn");
      handleNavigation("login", true);
    });
  }

  // 2) Wire up any other data-nav elements
  setupNavigation();
}

// ─── 6. NAVIGATION SETUP (OPTIONAL) ────────────────────────────────────────────
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
  alert(`🧭 handleNavigation→ ${targetPage}`);   // debug

  const appEl = document.getElementById("app");
  if (!appEl) return;

  // Fade‐out stub
  appEl.classList.remove("fade-in");
  appEl.classList.add("fade-out");
  await new Promise(r => setTimeout(r, 150));

  // Push history
  if (pushToHistory) {
    history.pushState({ page: targetPage }, "", `#${targetPage}`);
  }

  // Route
  renderPage(targetPage);

  // Fade‐in stub
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

  // 1) Back button and any other nav
  setupNavigation();

  // 2) Toggle password visibility
  const passwordInput = document.getElementById("password");
  document.getElementById("toggle-password").onclick = () => {
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  };

  // 3) Login / Signup handler
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
          alert("🎉 Account created and signed in!");
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

  // 4) Google Sign-In
  document.getElementById("google-login").onclick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      alert("Google Sign-In failed: " + err.message);
    }
  };

  // 5) Reset password
  document.getElementById("reset-password").onclick = async e => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
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
  };
}

// ─── Kick everything off ───────────────────────────────────────────────────────
renderWelcome();