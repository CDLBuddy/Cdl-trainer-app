// navigation.js

// === PAGE RENDERERS ===
import { renderDashboard }      from "./dashboard-student.js";
import { renderInstructorDashboard } from "./dashboard-instructor.js"; // Only if you have this
import { renderAdminDashboard } from "./dashboard-admin.js";           // Only if you have this
import { renderChecklists }     from "./checklist.js";
import { renderPracticeTests }  from "./practice-tests.js";
import { renderFlashcards }     from "./flashcards.js";
import { renderTestResults }    from "./test-results.js";
import { renderAICoach }        from "./ai-coach.js";
import { renderProfile }        from "./profile.js";
import { renderWalkthrough }    from "./walkthrough.js";
import { renderLogin }          from "./login.js";
import { renderHome }           from "./home.js";
import { showPageTransitionLoader, hidePageTransitionLoader } from "./ui-helpers.js";

// === DEVICE HELPER ===
function isMobile() {
  return ("ontouchstart" in window) || (window.innerWidth < 900);
}

// === MAIN NAVIGATION FUNCTION ===
function handleNavigation(page, direction = "forward") {
  const appEl = document.getElementById("app");
  if (!appEl) return;

  const currentScreen = appEl.querySelector(".screen-wrapper");
  const mobile = isMobile();
  let outClass = mobile
    ? (direction === "forward" ? "slide-out-left" : "slide-out-right")
    : "fade-out";

  if (currentScreen) {
    currentScreen.classList.add(outClass);
    currentScreen.addEventListener("transitionend", function onFade() {
      currentScreen.removeEventListener("transitionend", onFade);
      doNavigation(page, appEl, direction);
    }, { once: true });

    showPageTransitionLoader();
  } else {
    doNavigation(page, appEl, direction);
  }
}

// === PAGE SWITCHER ===
function doNavigation(page, appEl, direction = "forward") {
  let lastHash = window.__lastPageHash || "home";
  window.__lastPageHash = page;
  let navDir = "forward";
  if (window.__navHistory && window.__navHistory.length) {
    const last = window.__navHistory[window.__navHistory.length - 1];
    navDir = last === page ? "back" : "forward";
  }
  if (!window.__navHistory) window.__navHistory = [];
  window.__navHistory.push(page);

  // Render correct page
  switch (page) {
    case "dashboard":      renderDashboard(appEl); break;
    case "instructor":     renderInstructorDashboard?.(appEl); break;
    case "admin":          renderAdminDashboard?.(appEl); break;
    case "checklists":     renderChecklists(appEl); break;
    case "practiceTests":  renderPracticeTests(appEl); break;
    case "flashcards":     renderFlashcards(appEl); break;
    case "results":        renderTestResults(appEl); break;
    case "coach":          renderAICoach(appEl); break;
    case "profile":        renderProfile(appEl); break;
    case "walkthrough":    renderWalkthrough(appEl); break;
    case "login":          renderLogin(appEl); break;
    case "home": default:  renderHome(appEl); break;
  }

  // Add incoming animation for new screen
  setTimeout(() => {
    const newScreen = appEl.querySelector(".screen-wrapper");
    if (!newScreen) return;
    const mobile = isMobile();
    newScreen.classList.remove("fade-out", "slide-out-left", "slide-out-right", "fade-in", "slide-in-right", "slide-in-left");
    if (mobile) {
      if (navDir === "back") {
        newScreen.classList.add("slide-in-right");
      } else {
        newScreen.classList.add("slide-in-left");
      }
    } else {
      newScreen.classList.add("fade-in");
    }
    hidePageTransitionLoader();
  }, 10);

  // Only update URL hash if needed
  if (page !== location.hash.replace("#", "")) {
    history.pushState({}, "", "#" + page);
  }
}

// === EXPORTS ===
export { handleNavigation, isMobile };