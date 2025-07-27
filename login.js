// login.js

import { auth } from './firebase.js';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { showToast, setupNavigation } from './ui-helpers.js';
import { renderSignup } from './signup.js';
import { renderWelcome } from './welcome.js';
import {
  getCurrentSchoolBranding,
  setCurrentSchool,
} from './school-branding.js';

export function renderLogin(
  container = document.getElementById('app'),
  opts = {}
) {
  if (!container) return;

  // --- Branding ---
  const schoolBrand = getCurrentSchoolBranding();
  const schoolLogo = schoolBrand.logoUrl || '/default-logo.svg';
  const schoolName = schoolBrand.schoolName || 'CDL Trainer';
  const accentColor = schoolBrand.primaryColor || '#b48aff';
  const supportEmail = schoolBrand.contactEmail || 'support@cdltrainerapp.com';
  document.documentElement.style.setProperty('--brand-primary', accentColor);

  container.innerHTML = `
    <div class="login-card fade-in" role="main" aria-label="Login Page" style="--accent:${accentColor};">
      <div style="text-align:center;">
        <img src="${schoolLogo}" alt="School Logo" style="height:52px;max-width:120px;margin-bottom:0.8rem;border-radius:10px;box-shadow:0 1px 8px #22115533;">
        <h2 tabindex="0" style="margin:0 0 8px 0;">🚛 ${schoolName} Login</h2>
      </div>
      <form id="login-form" autocomplete="off" aria-label="Login form">
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" required autocomplete="username" autofocus />
        </div>
        <div class="form-group password-group">
          <label for="login-password">Password</label>
          <div style="position:relative;">
            <input id="login-password" name="password" type="password" required autocomplete="current-password" style="padding-right:2.3rem;">
            <button type="button" id="toggle-password"
              aria-label="Show/hide password"
              style="position:absolute;right:7px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--accent);font-size:1.17em;cursor:pointer;">
              👁
            </button>
          </div>
        </div>
        <div id="error-msg" role="alert" style="display:none;color:var(--error);margin-bottom:10px;font-weight:500;"></div>
        <button class="btn primary" id="login-submit" type="submit" aria-label="Sign in" style="background:${accentColor};border:none;">Log In</button>
        <button type="button" class="btn" id="google-login" style="margin-top:0.8rem;display:flex;align-items:center;justify-content:center;gap:0.5em;">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" style="height:1.1em;width:1.1em;vertical-align:middle;"> Sign in with Google
        </button>
        <button type="button" class="btn outline" id="reset-password" style="margin-top:0.6rem;">Forgot Password?</button>
        <button type="button" class="btn outline" id="demo-login" style="margin-top:0.7rem;">🔑 Demo/Test Account</button>
      </form>
      <div class="login-footer" style="margin-top:1.2rem;">
        New? <button class="btn outline" type="button" id="go-signup">Sign Up</button>
      </div>
      <div style="text-align:center;margin-top:0.7rem;">
        <button class="btn outline" id="back-to-welcome-btn" type="button" style="width:99%;">⬅ Back</button>
        <button class="btn text" id="switch-school-btn" type="button" style="margin-top:0.3rem;width:99%;color:${accentColor};background:none;border:none;font-size:1.02em;">🏫 Switch School</button>
      </div>
      <div style="margin-top:1.1rem;text-align:center;font-size:0.98em;color:#aaa;">
        Need help? <a href="mailto:${supportEmail}" style="color:${accentColor};text-decoration:underline;">Contact Support</a>
      </div>
    </div>
  `;

  // Go to Sign Up
  container.querySelector('#go-signup')?.addEventListener('click', () => {
    renderSignup(container, { schoolBrand });
  });

  // Password toggle
  const pwdInput = container.querySelector('#login-password');
  const togglePwd = container.querySelector('#toggle-password');
  if (pwdInput && togglePwd) {
    togglePwd.onclick = () => {
      pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
      togglePwd.textContent = pwdInput.type === 'password' ? '👁' : '🙈';
    };
    togglePwd.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') togglePwd.click();
    };
  }

  setupNavigation();

  // Email/password login
  const loginForm = container.querySelector('#login-form');
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = container.querySelector('#email').value.trim();
      const pwd = pwdInput.value;
      const errD = container.querySelector('#error-msg');
      const btn = container.querySelector('#login-submit');
      errD.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Logging in…';
      if (!email || !pwd) {
        errD.textContent = 'Please enter both email and password.';
        errD.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Log In';
        return;
      }
      try {
        await signInWithEmailAndPassword(auth, email, pwd);
        // onAuthStateChanged in app.js will handle navigation
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          errD.textContent = 'No user found. Please sign up first!';
        } else if (err.code === 'auth/wrong-password') {
          errD.textContent = 'Incorrect password. Try again or reset.';
        } else {
          errD.textContent = err.message || 'Login failed. Try again.';
        }
        errD.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Log In';
    };
  }

  // Google sign-in
  container
    .querySelector('#google-login')
    ?.addEventListener('click', async () => {
      try {
        await signInWithPopup(auth, new GoogleAuthProvider());
        // UI will auto-redirect onAuthStateChanged
      } catch (err) {
        showToast('Google Sign-In failed: ' + err.message, 3200, 'error');
      }
    });

  // Reset password
  container
    .querySelector('#reset-password')
    ?.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = container.querySelector('#email').value.trim();
      if (!email) {
        showToast('Enter your email to receive a reset link.', 3200, 'error');
        return;
      }
      try {
        await sendPasswordResetEmail(auth, email);
        showToast('📬 Reset link sent!');
      } catch (err) {
        showToast('Error: ' + err.message, 4000, 'error');
      }
    });

  // Demo/Test login
  container
    .querySelector('#demo-login')
    ?.addEventListener('click', async () => {
      try {
        await signInWithEmailAndPassword(
          auth,
          'demo@cdltrainerapp.com',
          'test1234'
        );
      } catch (err) {
        showToast('Demo login unavailable.', 3000, 'error');
      }
    });

  // Back to welcome page
  container
    .querySelector('#back-to-welcome-btn')
    ?.addEventListener('click', async () => {
      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (err) {
          /* ignore */
        }
      }
      renderWelcome();
    });

  // School Switch Logic
  container
    .querySelector('#switch-school-btn')
    ?.addEventListener('click', () => {
      localStorage.removeItem('schoolId');
      renderWelcome();
    });

  // Accessibility: focus management
  container.querySelector('#email')?.focus();
}
