// login.js

// --- IMPORTS ---
import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import { showToast, setupNavigation } from "./ui-helpers.js";
import { renderSignup } from "./signup.js";
import { renderWelcome } from "./welcome.js";

// --- LOGIN RENDERER ---
export function renderLogin(container = document.getElementById("app")) {
  if (!container) return;

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

  // --- NAVIGATION: Go to Sign Up ---
  container.querySelector("#go-signup")?.addEventListener("click", () => {
    renderSignup(container);
  });

  // --- Password toggle ---
  const pwdInput = container.querySelector("#login-password");
  const togglePwd = container.querySelector("#toggle-password");
  if (pwdInput && togglePwd) {
    togglePwd.onclick = () => {
      pwdInput.type = pwdInput.type === "password" ? "text" : "password";
      togglePwd.textContent = pwdInput.type === "password" ? "👁" : "🙈";
    };
  }

  setupNavigation();

  // --- Email/password login ---
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
        // onAuthStateChanged in app.js will handle navigation
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

  // --- Google sign-in ---
  container.querySelector("#google-login")?.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      // UI will auto-redirect onAuthStateChanged
    } catch (err) {
      showToast("Google Sign-In failed: " + err.message);
    }
  });

  // --- Reset password ---
  container.querySelector("#reset-password")?.addEventListener("click", async e => {
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
  });

  // --- Back to welcome page ---
  container.querySelector("#back-to-welcome-btn")?.addEventListener("click", async () => {
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