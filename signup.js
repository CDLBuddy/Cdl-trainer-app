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

export function renderSignup(container = document.getElementById("app")) {
  if (!container) return;

  container.innerHTML = `
    <div class="signup-card fade-in">
      <h2>✍ Sign Up for CDL Trainer</h2>
      <form id="signup-form" autocomplete="off">
        <div class="form-group">
          <label for="signup-name">Name</label>
          <input id="signup-name" name="name" type="text" required autocomplete="name" />
        </div>
        <div class="form-group">
          <label for="signup-email">Email</label>
          <input id="signup-email" name="email" type="email" required autocomplete="username" />
        </div>
        <div class="form-group password-group">
          <label for="signup-password">Password</label>
          <div style="position:relative;">
            <input id="signup-password" name="password" type="password" required minlength="6" autocomplete="new-password" style="padding-right:2.3rem;">
            <button type="button" id="toggle-signup-password" style="position:absolute;right:7px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--accent);font-size:1.14em;cursor:pointer;">👁</button>
          </div>
        </div>
        <div class="form-group password-group">
          <label for="signup-confirm">Confirm Password</label>
          <div style="position:relative;">
            <input id="signup-confirm" name="confirm" type="password" required minlength="6" autocomplete="new-password" style="padding-right:2.3rem;">
            <button type="button" id="toggle-signup-confirm" style="position:absolute;right:7px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--accent);font-size:1.14em;cursor:pointer;">👁</button>
          </div>
        </div>
        <div id="signup-error-msg" style="display:none;color:var(--error,#ff6b6b);margin-bottom:10px;font-weight:500;text-align:center;"></div>
        <button class="btn primary" type="submit" style="margin-top:0.7em;">Create Account</button>
        <div class="signup-footer" style="margin-top:1.1rem;">
          Already have an account?
          <button class="btn outline" type="button" id="go-login">Log In</button>
        </div>
        <button class="btn outline" id="back-to-welcome-btn" type="button" style="margin-top:0.8rem;width:100%;">⬅ Back</button>
      </form>
      <!-- Demo only: can remove after dev phase
      <button class="btn" id="demo-signup" style="width:100%;margin-top:1.2rem;">Quick Fill Demo</button>
      -->
    </div>
  `;

  // Go to Log In page
  container.querySelector("#go-login")?.addEventListener("click", () => renderLogin(container));

  // Back to welcome page
  container.querySelector("#back-to-welcome-btn")?.addEventListener("click", () => renderWelcome());

  // Password toggle
  const pwdInput     = container.querySelector("#signup-password");
  const togglePwd    = container.querySelector("#toggle-signup-password");
  const confirmInput = container.querySelector("#signup-confirm");
  const toggleConf   = container.querySelector("#toggle-signup-confirm");

  if (pwdInput && togglePwd) {
    togglePwd.onclick = () => {
      pwdInput.type = pwdInput.type === "password" ? "text" : "password";
      togglePwd.textContent = pwdInput.type === "password" ? "👁" : "🙈";
    };
  }
  if (confirmInput && toggleConf) {
    toggleConf.onclick = () => {
      confirmInput.type = confirmInput.type === "password" ? "text" : "password";
      toggleConf.textContent = confirmInput.type === "password" ? "👁" : "🙈";
    };
  }

  // Signup form handler
  container.querySelector("#signup-form").onsubmit = async (e) => {
    e.preventDefault();

    const form     = e.target;
    const name     = form.name.value.trim();
    const email    = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const confirm  = form.confirm.value;
    const errD     = container.querySelector("#signup-error-msg");

    errD.style.display = "none";
    errD.textContent = "";

    // --- Validation ---
    if (!name || !email || !password || !confirm) {
      errD.textContent = "Please fill out all fields.";
      errD.style.display = "block";
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errD.textContent = "Please enter a valid email address.";
      errD.style.display = "block";
      return;
    }
    if (password !== confirm) {
      errD.textContent = "Passwords do not match.";
      errD.style.display = "block";
      return;
    }
    if (password.length < 6) {
      errD.textContent = "Password must be at least 6 characters.";
      errD.style.display = "block";
      return;
    }

    showToast("Creating your account...", 2500);

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
        errD.textContent = "Email already in use. Try logging in.";
      } else if (err.code === "auth/invalid-email") {
        errD.textContent = "Invalid email address.";
      } else {
        errD.textContent = "Signup failed: " + (err.message || err);
      }
      errD.style.display = "block";
    }
  };

  // Demo quick fill (optional, dev only)
  /*
  container.querySelector("#demo-signup")?.addEventListener("click", () => {
    container.querySelector("#signup-name").value = "Demo User";
    container.querySelector("#signup-email").value = "demouser" + Math.floor(Math.random()*1000) + "@test.com";
    container.querySelector("#signup-password").value = "demopass";
    container.querySelector("#signup-confirm").value = "demopass";
  });
  */
}