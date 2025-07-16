// ui-helpers.js

// ─── 1. Toast Messages ──────────────────────────────────────────────
export function showToast(message, duration = 3000) {
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;

  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "#333";
  toast.style.color = "#fff";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "5px";
  toast.style.opacity = "1";
  toast.style.transition = "opacity 0.5s ease";
  toast.style.zIndex = "9999";

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 600);
  }, duration);
}

// ─── 2. Smart Navigation Setup ─────────────────────────────────────
export function setupNavigation() {
  console.log("🧭 setupNavigation() called");

  const buttons = document.querySelectorAll("[data-nav]");

  if (buttons.length === 0) {
    console.warn("⚠️ No navigation buttons found for setupNavigation()");
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      console.log(`🔗 Nav button clicked: ${target}`);

      if (target) {
        history.pushState({ page: target }, "", `#${target}`);
        window.dispatchEvent(new PopStateEvent("popstate", { state: { page: target } }));
      }
    });
  });
}

// ─── 3. Loader Overlay (Page Transition) ───────────────────────────
export function showPageTransitionLoader() {
  const overlay = document.getElementById("loader-overlay");
  if (overlay) overlay.classList.remove("hidden");
}

export function hidePageTransitionLoader() {
  const overlay = document.getElementById("loader-overlay");
  if (overlay) {
    setTimeout(() => overlay.classList.add("hidden"), 400);
  }
}

// ─── 4. AI Tip of the Day (Daily/Rotating) ────────────────────────
export function getRandomAITip() {
  const tips = [
    "Remember to verbally state 'three-point brake check' word-for-word during your walkthrough exam!",
    "Use three points of contact when entering and exiting the vehicle.",
    "Take time to walk around your vehicle and inspect all lights before every trip.",
    "Keep your study streak alive for better memory retention!",
    "Ask your instructor for feedback after each practice test.",
    "When practicing pre-trip, say each step out loud--it helps lock it in.",
    "Focus on sections that gave you trouble last quiz. Practice makes perfect!",
    "Have your permit and ID ready before every test session.",
    "Use your checklist to track what you’ve mastered and what needs more review."
  ];
  const day = new Date().getDay();
  return tips[day % tips.length];
}

// ─── 5. Fade-In on Scroll Animation ────────────────────────────────
export function initFadeInOnScroll() {
  const observer = new window.IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll(".fade-in-on-scroll").forEach((el) =>
    observer.observe(el)
  );
}

// ─── 6. Typewriter Headline Logic ──────────────────────────────────
const _headlines = [
  "CDL Buddy",
  "Your CDL Prep Coach",
  "Study Smarter, Not Harder"
];
let _hw = 0, _hc = 0;

export function startTypewriter() {
  const el = document.getElementById("headline");
  if (!el) return;
  if (_hc < _headlines[_hw].length) {
    el.textContent += _headlines[_hw][_hc++];
    setTimeout(startTypewriter, 100);
  } else {
    setTimeout(() => {
      el.textContent = "";
      _hc = 0;
      _hw = (_hw + 1) % _headlines.length;
      startTypewriter();
    }, 2000);
  }
}

// ─── 7. Utility: Debounce ──────────────────────────────────────────
export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}