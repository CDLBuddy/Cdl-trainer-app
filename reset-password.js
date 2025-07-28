// reset-password.js

import { auth } from './firebase.js';
import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { showToast, setupNavigation } from './ui-helpers.js';
import { renderLogin } from './login.js';
import { renderWelcome } from './welcome.js';

export function renderResetPassword(
  container = document.getElementById('app'),
  opts = {}
) {
  if (!container) return;

  // --- Branding (white label/ELDT school support) ---
  const schoolBrand =
    opts.schoolBrand ||
    JSON.parse(localStorage.getItem('schoolBrand') || '{}') ||
    {};
  const schoolLogo = schoolBrand.logo || 'logo-default.svg';
  const schoolName = schoolBrand.name || 'CDL Trainer';
  const accentColor = schoolBrand.accent || '#b48aff';
  const supportEmail = schoolBrand.supportEmail || 'support@cdltrainerapp.com';

  container.innerHTML = `
    <div class="login-card fade-in" role="main" aria-label="Reset Password Page" style="--accent:${accentColor};">
      <div style="text-align:center;">
        <img src="${schoolLogo}" alt="School Logo" style="height:52px;max-width:120px;margin-bottom:0.8rem;border-radius:10px;box-shadow:0 1px 8px #22115533;">
        <h2 style="margin:0 0 8px 0;">🔑 Reset Your Password</h2>
        <p style="font-size:1.1em;margin-bottom:1.1em;">Enter your email and we'll send you a reset link.</p>
      </div>
      <form id="reset-form" autocomplete="off" aria-label="Reset Password Form">
        <div class="form-group">
          <label for="reset-email">Email</label>
          <input id="reset-email" name="email" type="email" required autocomplete="username" autofocus />
        </div>
        <div id="reset-error-msg" role="alert" style="display:none;color:var(--error);margin-bottom:10px;font-weight:500;"></div>
        <button class="btn primary" id="reset-submit" type="submit" style="background:${accentColor};border:none;">Send Reset Link</button>
      </form>
      <div class="login-footer" style="margin-top:1.2rem;">
        <button class="btn outline" id="back-to-login-btn" type="button" style="width:99%;">⬅ Back to Login</button>
      </div>
      <div style="margin-top:1.1rem;text-align:center;font-size:0.98em;color:#aaa;">
        Need help? <a href="mailto:${supportEmail}" style="color:${accentColor};text-decoration:underline;">Contact Support</a>
      </div>
    </div>
  `;

  setupNavigation();

  // --- Form Handler ---
  const resetForm = container.querySelector('#reset-form');
  if (resetForm) {
    resetForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = container.querySelector('#reset-email').value.trim();
      const errD = container.querySelector('#reset-error-msg');
      const btn = container.querySelector('#reset-submit');
      errD.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Sending…';
      if (!email) {
        errD.textContent = 'Please enter your email.';
        errD.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Send Reset Link';
        return;
      }
      try {
        await sendPasswordResetEmail(auth, email);
        showToast('📬 Reset link sent!');
        setTimeout(() => renderLogin(container, { schoolBrand }), 1800);
      } catch (err) {
        errD.textContent = err.message || 'Error sending reset email.';
        errD.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Send Reset Link';
    };
  }

  // --- Back button ---
  container
    .querySelector('#back-to-login-btn')
    ?.addEventListener('click', () => {
      renderLogin(container, { schoolBrand });
    });

  // Accessibility: focus management
  container.querySelector('#reset-email')?.focus();
}
