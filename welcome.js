// welcome.js

import {
  initInfiniteCarousel,
  initCarousel,
  initFadeInOnScroll,
  startTypewriter
} from "./ui-helpers.js";
import { handleNavigation } from "./navigation.js";

// Accepts optional config for custom branding/headlines/etc.
export function renderWelcome(container = document.getElementById("app"), opts = {}) {
  alert("🟣 renderWelcome() called!"); // Debug
  if (!container) return;

  // Customizable for future white-label/school branding:
  const subHeadline = opts.subHeadline || "Your all-in-one CDL prep coach. Scroll down to get started!";

  container.innerHTML = `
    <div class="welcome-screen" tabindex="0" aria-label="Welcome screen">
      <div class="bokeh-layer" aria-hidden="true">
        <div class="bokeh-dot parallax-float" style="top:10%; left:15%; animation-delay:0s;"></div>
        <div class="bokeh-dot parallax-float" style="top:30%; left:70%; animation-delay:2s;"></div>
        <div class="bokeh-dot parallax-float" style="top:60%; left:25%; animation-delay:4s;"></div>
        <div class="bokeh-dot parallax-float" style="top:80%; left:80%; animation-delay:6s;"></div>
      </div>
      <div class="welcome-content shimmer-glow fade-in" role="main">
        <h1 class="typewriter" aria-live="polite" aria-atomic="true">
          <span id="headline"></span><span class="cursor" aria-hidden="true">|</span>
        </h1>
        <p>${subHeadline}</p>
        <div style="display:flex; gap:1rem; flex-wrap:wrap; justify-content:center;">
          <button id="login-btn" class="btn pulse" data-nav="login" aria-label="Login">
            <span class="icon">🚀</span> Login
          </button>
          <button id="demo-btn" class="btn outline" data-nav="demo" aria-label="Request a Demo">
            <span class="icon">📞</span> Request Demo
          </button>
          <button id="contact-btn" class="btn outline" data-nav="contact" aria-label="Contact Support">
            <span class="icon">✉️</span> Contact
          </button>
        </div>
        <div class="features" tabindex="0" aria-label="Feature highlights">
          <div class="features-inner" role="list">
            <div class="feat" role="listitem"><i>🧪</i><p>Practice Tests</p></div>
            <div class="feat" role="listitem"><i>✅</i><p>Checklists</p></div>
            <div class="feat" role="listitem"><i>📊</i><p>Results</p></div>
            <div class="feat" role="listitem"><i>🎧</i><p>AI Coach</p></div>
            <div class="feat" role="listitem"><i>🏫</i><p>Multi-School Support</p></div>
            <div class="feat" role="listitem"><i>🗺️</i><p>State-Specific Compliance</p></div>
            <div class="feat" role="listitem"><i>🕒</i><p>Progress Tracking</p></div>
            <div class="feat" role="listitem"><i>🔒</i><p>Secure Records</p></div>
            <div class="feat" role="listitem"><i>📈</i><p>Performance Analytics</p></div>
          </div>
        </div>
        <div class="welcome-footer" style="margin-top:2.5rem;text-align:center;">
          <small>
            Need help? <a href="mailto:support@cdltrainerapp.com" style="color:#b48aff;text-decoration:underline;">Email Support</a> &bull;
            <a href="https://fmcsa.dot.gov" target="_blank" rel="noopener">FMCSA ELDT Info</a>
          </small>
        </div>
      </div>
    </div>
  `;

  // --- Effects and Animation ---
  if (!container._welcomeInit) {
    initInfiniteCarousel?.();
    initCarousel?.();
    initFadeInOnScroll?.();
    startTypewriter();
    container._welcomeInit = true;
  }

  // --- Navigation Handlers (always use handleNavigation) ---
  document.getElementById("login-btn")?.addEventListener("click", () => {
    handleNavigation("login");
  });
  document.getElementById("demo-btn")?.addEventListener("click", () => {
    handleNavigation("demo");
  });
  document.getElementById("contact-btn")?.addEventListener("click", () => {
    handleNavigation("contact");
  });

  // Keyboard accessibility
  ["login-btn", "demo-btn", "contact-btn"].forEach(id => {
    document.getElementById(id)?.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") handleNavigation(e.target.getAttribute("data-nav"));
    });
  });

  // Mobile swipe (optional, for carousels)
  let touchStartX = 0, touchEndX = 0;
  const featuresTrack = document.querySelector(".features-inner");
  if (featuresTrack) {
    featuresTrack.addEventListener("touchstart", e => touchStartX = e.changedTouches[0].screenX, {passive:true});
    featuresTrack.addEventListener("touchend", e => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 40) featuresTrack.scrollLeft += 120;
      if (touchEndX - touchStartX > 40) featuresTrack.scrollLeft -= 120;
    }, {passive:true});
  }
}