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

// ─── 3. AUTH STATE LISTENER ─────────────────────────────────────────────────────
alert("🔔 Attaching auth listener");
onAuthStateChanged(auth, user => {
  alert("🔔 Auth state changed: user=" + (user?.email || "null"));
  if (user) {
    appEl.innerHTML = `<div style="padding:20px;text-align:center;"><h1>Signed in as ${user.email}</h1></div>`;
  } else {
    alert("🏁 No user signed in, showing welcome");
    renderWelcome();
  }
});

  alert("✅ Auth listener attached");

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

  // 1) Bind the click _directly_ to the button
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      alert("🛠️ [DEBUG] Direct click on login-btn");
      handleNavigation("login", true);
    });
  }

  // 2) (Optional) still wire up any other nav items generically
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
// ─── 7. CORE NAVIGATION HANDLER & RENDERER (DEBUG) ─────────────────────────────
async function handleNavigation(targetPage, pushToHistory = false) {
  alert(`🧭 handleNavigation→ ${targetPage}`);   // debug

  const appEl = document.getElementById("app");
  if (!appEl) return;

  // fade-out stub
  appEl.classList.remove("fade-in");
  appEl.classList.add("fade-out");
  await new Promise(r => setTimeout(r, 150));

  // history
  if (pushToHistory) {
    history.pushState({ page: targetPage }, "", `#${targetPage}`);
  }

  // route
  renderPage(targetPage);

  // fade-in stub
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

function renderLogin(container) {
  alert("🚪 renderLogin() called");  // debug
  container.innerHTML = `
    <div style="padding:20px; text-align:center;">
      <h2>🚪 Login Screen</h2>
      <p>(Coming soon…)</p>
      <button data-nav="home">⬅️ Back</button>
    </div>
  `;
  setupNavigation();
}

// kick it off
renderWelcome();