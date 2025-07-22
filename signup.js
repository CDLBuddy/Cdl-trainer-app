// signup.js

import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { showToast } from "./ui-helpers.js";
import { renderLogin } from "./login.js";
import { renderWelcome } from "./welcome.js";

// --- SIGNUP RENDERER ---
export function renderSignup(container = document.getElementById("app")) {
  if (!container) return;

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
        <button class="btn primary" type="submit">Create Account</button>
        <div class="signup-footer" style="margin-top:1rem;">
          Already have an account? <button class="btn outline" type="button" id="go-login">Log In</button>
        </div>
        <button class="btn outline" id="back-to-welcome-btn" type="button" style="margin-top:0.8rem;width:100%;">⬅ Back</button>
      </form>
    </div>
  `;

  // Go to Log In page
  container.querySelector("#go-login")?.addEventListener("click", () => renderLogin(container));

  // Back to welcome page
  container.querySelector("#back-to-welcome-btn")?.addEventListener("click", () => renderWelcome());

  // --- Signup form handler ---
  container.querySelector("#signup-form").onsubmit = async (e) => {
    e.preventDefault();

    const form     = e.target;
    const name     = form.name.value.trim();
    const email    = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const confirm  = form.confirm.value;

    // Validation
    if (!name || !email || !password || !confirm) {
      showToast("Please fill out all fields.");
      return;
    }
    if (password !== confirm) {
      showToast("Passwords do not match.");
      return;
    }

    showToast("Creating your account...", 3000);

    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // Set displayName if possible (not always available on some emulators)
      if (user && user.updateProfile) {
        try {
          await user.updateProfile({ displayName: name });
        } catch (err) {
          // Not fatal
          console.warn("Could not update user displayName:", err);
        }
      }

      // Create Firestore profile (role student by default)
      await setDoc(doc(db, "users", user.email), {
        name,
        email,
        createdAt: serverTimestamp(),
        role: "student"
      });

      // UserRoles collection
      await setDoc(doc(db, "userRoles", user.email), {
        role: "student",
        assignedAt: serverTimestamp()
      });

      // LocalStorage for UI
      localStorage.setItem("fullName", name);
      localStorage.setItem("userRole", "student");

      showToast("Account created! Logging in…");
      // onAuthStateChanged will handle dashboard redirect

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