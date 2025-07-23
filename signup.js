// signup.js

import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import { showToast } from "./ui-helpers.js";
import { renderLogin } from "./login.js";
import { renderWelcome } from "./welcome.js";
import { getCurrentSchoolBranding, setCurrentSchool } from "./school-branding.js";

// Accepts opts: { schoolBrand, inviteToken, schoolId }
export function renderSignup(container = document.getElementById("app"), opts = {}) {
  if (!container) return;

  // --- School/branding context detection ---
  let schoolBrand = opts.schoolBrand || getCurrentSchoolBranding();
  let inviteToken = opts.inviteToken || null;
  let schoolId = opts.schoolId || localStorage.getItem("schoolId") || null;

  // --- Branding HTML ---
  const brandLogoHtml = schoolBrand?.logoUrl
    ? `<img src="${schoolBrand.logoUrl}" style="height:38px;max-width:96px;vertical-align:middle;margin-bottom:0.15em;border-radius:8px;">`
    : "✍";
  const brandTitle = schoolBrand?.schoolName || "CDL Trainer";

  // --- Dynamic School List (async, only if not locked) ---
  let schools = [];
  let showSchoolSelect = !schoolId;
  let schoolSelectHtml = "";

  async function fetchSchools() {
    try {
      const snap = await getDocs(collection(db, "schools"));
      schools = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => !s.disabled);
      if (schools.length > 0) {
        schoolSelectHtml = `
          <div class="form-group">
            <label for="signup-school">School/Brand</label>
            <select id="signup-school" name="school" required>
              <option value="">Select a School</option>
              ${schools.map(s => `<option value="${s.id}" ${s.id===schoolId?'selected':''}>${s.name}</option>`).join("")}
            </select>
          </div>
        `;
      }
    } catch (e) {
      schoolSelectHtml = `<div style="color:#ff6b6b;">Unable to load school list.</div>`;
    }
    renderForm(); // Re-render with dropdown
  }

  // --- Render Form (called twice if async schools) ---
  function renderForm() {
    container.innerHTML = `
      <div class="signup-card fade-in" style="max-width:480px;margin:34px auto;">
        <h2 style="text-align:center;">
          ${brandLogoHtml}
          Sign Up for ${brandTitle}
        </h2>
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
          ${showSchoolSelect ? schoolSelectHtml : ""}
          <div id="signup-error-msg" style="display:none;color:var(--error,#ff6b6b);margin-bottom:10px;font-weight:500;text-align:center;"></div>
          <button class="btn primary" type="submit" style="margin-top:0.7em;">Create Account</button>
          <div class="signup-footer" style="margin-top:1.1rem;">
            Already have an account?
            <button class="btn outline" type="button" id="go-login">Log In</button>
          </div>
          <button class="btn outline" id="back-to-welcome-btn" type="button" style="margin-top:0.8rem;width:100%;">⬅ Back</button>
        </form>
      </div>
    `;

    // Go to Log In page
    container.querySelector("#go-login")?.addEventListener("click", () => renderLogin(container, { schoolBrand }));

    // Back to welcome page
    container.querySelector("#back-to-welcome-btn")?.addEventListener("click", () => renderWelcome());

    // Password toggles
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

      let selectedSchoolId = schoolId;
      if (showSchoolSelect) {
        selectedSchoolId = form.school.value || "";
        if (!selectedSchoolId) {
          errD.textContent = "Please select a school.";
          errD.style.display = "block";
          return;
        }
        // Set current school and load branding for next pages
        setCurrentSchool(selectedSchoolId);
        schoolBrand = getCurrentSchoolBranding();
      }

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

        // Set displayName if possible
        if (user && user.updateProfile) {
          try { await user.updateProfile({ displayName: name }); } catch (err) {}
        }

        // Firestore profile: role/student, school, invite (if any)
        const profileDoc = {
          name,
          email,
          createdAt: serverTimestamp(),
          role: "student",
          schoolId: selectedSchoolId || undefined,
          joinedVia: selectedSchoolId || undefined,
        };
        if (inviteToken) profileDoc.invitedBy = inviteToken;

        await setDoc(doc(db, "users", user.email), profileDoc);

        // Permissions/userRoles
        const roleDoc = {
          role: "student",
          assignedAt: serverTimestamp(),
          schoolId: selectedSchoolId || undefined,
        };
        if (inviteToken) roleDoc.invitedBy = inviteToken;

        await setDoc(doc(db, "userRoles", user.email), roleDoc);

        // Store locally for UI
        localStorage.setItem("fullName", name);
        localStorage.setItem("userRole", "student");
        if (selectedSchoolId) localStorage.setItem("schoolId", selectedSchoolId);

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
  }

  // Async fetch schools if needed
  if (showSchoolSelect) {
    fetchSchools();
  } else {
    renderForm();
  }
}