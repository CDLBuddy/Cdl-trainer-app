
// === FINAL RESTORED VERSION: app.js ===
// Includes Firebase setup, auth routing, renderWelcome, renderLogin, full UI logic

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// ==== Firebase Config ====
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const appInstance = initializeApp(firebaseConfig);
const auth = getAuth(appInstance);
const db = getFirestore(appInstance);

// ==== UI Routing Logic ====
function renderWelcome() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="screen-wrapper fade-in" style="text-align:center;padding:2rem;">
      <h2 style="color:white;">👋 Welcome to CDL Trainer</h2>
      <p style="color:#ccc;">Start your journey below.</p>
      <button onclick="renderLogin()" style="padding:1rem 2rem;background:#007bff;color:white;border:none;border-radius:8px;">Login / Sign Up</button>
    </div>
  `;
}

function renderLogin() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="screen-wrapper fade-in" style="text-align:center;padding:2rem;">
      <h2 style="color:white;">🔐 Login to Your Account</h2>
      <input id="email" placeholder="Email" style="margin:0.5rem;" />
      <input id="password" type="password" placeholder="Password" style="margin:0.5rem;" />
      <button onclick="handleLogin()" style="padding:0.75rem 2rem;margin-top:1rem;">Login</button>
    </div>
  `;
}

window.handleLogin = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
};

// ==== Dashboards ====
async function renderStudentDashboard() {
  const app = document.getElementById("app");
  app.innerHTML = `<div class="screen-wrapper"><h2>🎓 Student Dashboard</h2></div>`;
}
async function renderInstructorDashboard() {
  const app = document.getElementById("app");
  app.innerHTML = `<div class="screen-wrapper"><h2>📘 Instructor Dashboard</h2></div>`;
}
async function renderAdminDashboard() {
  const app = document.getElementById("app");
  app.innerHTML = `<div class="screen-wrapper"><h2>🛠️ Admin Panel</h2></div>`;
}

// ==== Auth Routing on Load ====
onAuthStateChanged(auth, async (user) => {
  const app = document.getElementById("app");
  if (!user) return renderWelcome();

  const userDoc = await getDoc(doc(db, "users", user.uid));
  let role = "student";
  if (userDoc.exists() && userDoc.data().role) {
    role = userDoc.data().role;
  }

  if (role === "student") return renderStudentDashboard();
  if (role === "instructor") return renderInstructorDashboard();
  if (role === "admin") return renderAdminDashboard();
});

// ==== Initial Fallback Loader ====
window.onload = () => {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="screen-wrapper" style="text-align:center;padding:2rem;">
      <div class="loading-spinner" style="margin:40px auto;"></div>
      <p>Loading CDL Trainer...</p>
    </div>
  `;
  setTimeout(() => {
    if (!auth.currentUser) renderWelcome();
  }, 4000);
};
