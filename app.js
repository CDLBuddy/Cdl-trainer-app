
// === HYBRID DEBUG VERSION: app.js ===
// Shows Firebase debug banners + renders welcome screen if no user

// ✅ Confirm script is executing
document.body.innerHTML = `
  <div style="background:black;color:#00ff99;padding:1rem;text-align:center;">
    ✅ app.js is executing...
  </div>
` + document.body.innerHTML;

// ==== Firebase Setup ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// ==== Firebase Config (PLACEHOLDER: replace with real config) ====
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const appInstance = initializeApp(firebaseConfig);
const db = getFirestore(appInstance);
const auth = getAuth(appInstance);

// Debug Banner for Firebase Init
document.body.innerHTML = `
  <div style="background:black;color:#ffd700;padding:1rem;text-align:center;">
    ✅ Firebase initialized...
  </div>
` + document.body.innerHTML;

// ==== Basic renderWelcome() for Debug Testing ====
function renderWelcome() {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div class="screen-wrapper fade-in" style="padding:2rem;text-align:center;">
      <h2 style="color:white;">👋 Welcome to CDL Trainer</h2>
      <p style="color:#ccc;">You're not signed in yet. Start your journey below.</p>
      <button style="padding:1rem 2rem;border:none;border-radius:8px;background:#007bff;color:white;font-size:1rem;margin-top:1rem;" onclick="alert('Login button clicked')">
        Login / Sign Up
      </button>
    </div>
  `;
}

// ==== Firebase Auth Listener ====
onAuthStateChanged(auth, async (user) => {
  document.body.innerHTML = `
    <div style="background:black;color:#66ccff;padding:1rem;text-align:center;">
      🔥 Firebase auth state changed: ${user ? "Signed In" : "Signed Out"}
    </div>
  ` + document.body.innerHTML;

  if (!user) {
    document.body.innerHTML = `
      <div style="background:black;color:red;padding:1rem;text-align:center;">
        🚫 No user detected — rendering welcome screen...
      </div>
    ` + document.body.innerHTML;

    renderWelcome();
  } else {
    document.body.innerHTML = `
      <div style="background:black;color:lime;padding:1rem;text-align:center;">
        ✅ Welcome back, ${user.email || "user"} — dashboard loading...
      </div>
    ` + document.body.innerHTML;
  }
});
