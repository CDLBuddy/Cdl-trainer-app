// app.js

import { setupNavigation, showToast } from './ui-helpers.js';

// ------------------------------------------------------------------------------------------
// 1️⃣ Your Firebase config
const firebaseConfig = {
  apiKey:            "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain:        "cdltrainerapp.firebaseapp.com",
  projectId:         "cdltrainerapp",
  storageBucket:     "cdltrainerapp.appspot.com",
  messagingSenderId: "977549527480",
  appId:             "1:977549527480:web:e959926bb02a4cef65674d",
  measurementId:     "G-MJ22BD2J1J"
};

// ------------------------------------------------------------------------------------------
// 2️⃣ Import & initialize Firebase App, Auth & Firestore
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db   = getFirestore(firebaseApp);

// ------------------------------------------------------------------------------------------
// 3️⃣ Your full renderLogin() implementation
function renderLogin() {
  // (Optional) Visual debug border -- remove when stable
  document.body.style.border = "4px solid magenta";

  const appEl = document.getElementById("app");
  if (!appEl) return;

  // 1) Inject login HTML
  appEl.innerHTML = `
    <div class="login-card fade-in">
      <h2>🚀 Login or Signup</h2>
      <form id="login-form">
        <input id="email" type="email" placeholder="Email" required />
        <div class="password-wrapper">
          <input id="password" type="password" placeholder="Password" required />
          <button type="button" id="toggle-password" class="toggle-password">👁️</button>
        </div>
        <div id="error-msg" class="error-message" style="display:none;"></div>
        <button id="login-submit" type="submit">Login / Signup</button>
      </form>
      <div class="alt-login-buttons">
        <button id="google-login" class="btn-google">Continue with Google</button>
        <button id="apple-login" class="btn-apple"> Apple Login</button>
        <button id="sms-login" class="btn-sms">📱 SMS Login</button>
        <p><a href="#" id="reset-password">Forgot password?</a></p>
      </div>
    </div>
  `;

  // 2) Wire up navigation links on any [data-nav] buttons
  setupNavigation();

  // 3) Query DOM only _after_ the HTML is in place
  const loginForm     = document.getElementById("login-form");
  const emailInput    = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const toggleBtn     = document.getElementById("toggle-password");
  const errorMsg      = document.getElementById("error-msg");
  const submitBtn     = document.getElementById("login-submit");
  const googleBtn     = document.getElementById("google-login");
  const appleBtn      = document.getElementById("apple-login");
  const smsBtn        = document.getElementById("sms-login");
  const resetLink     = document.getElementById("reset-password");

  // 👁️ Toggle password visibility
  toggleBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    toggleBtn.textContent = isHidden ? "🙈" : "👁️";
  });

  // 🔑 Login / Signup Handler
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const pwd   = passwordInput.value;
    errorMsg.style.display = "none";

    if (!email || !pwd) {
      errorMsg.textContent = "Please enter both email and password.";
      errorMsg.style.display = "block";
      return;
    }

    submitBtn.disabled = true;
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
          errorMsg.textContent = suErr.message;
          errorMsg.style.display = "block";
        }
      } else {
        errorMsg.textContent = err.message;
        errorMsg.style.display = "block";
      }
    } finally {
      submitBtn.disabled = false;
    }
  });

  // 📬 Reset Password Handler
  resetLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
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
  });

  // 🌐 Google Sign-In
  googleBtn.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      alert("Google Sign-In failed: " + err.message);
    }
  });

  // 🚧 Placeholder for unimplemented flows
  appleBtn.addEventListener("click", () => alert("🚧 Apple Login coming soon."));
  smsBtn.addEventListener("click",   () => alert("🚧 SMS Login coming soon."));
}

// ------------------------------------------------------------------------------------------
// 4️⃣ Auth‐state listener: shows login if signed out,
//    or your post-login welcome/home screen if signed in.
onAuthStateChanged(auth, (user) => {
  setupNavigation();

  if (user) {
    document.getElementById('app').innerHTML = `
      <div class="card">
        <h2>Hi, ${user.displayName || user.email}!</h2>
        <p>You’re logged in. (Replace this stub with your real dashboard.)</p>
      </div>
    `;
  } else {
    renderLogin();
  }
});

// ------------------------------------------------------------------------------------------
// 5️⃣ Fallback for initial page load
window.addEventListener('DOMContentLoaded', () => {
  // onAuthStateChanged will immediately fire with the current user (or null)
});