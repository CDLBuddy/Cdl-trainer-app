// ======== DEBUG/DEV TRAP ========
console.log("✅ app.js loaded!");
window.onerror = function(msg, src, lineno, col, error) {
  alert("🚨 JS Error: " + msg + "\n" + src + " @ " + lineno + ":" + col);
};
window.addEventListener("unhandledrejection", function(event) {
  alert("🚨 Promise Rejection: " + (event.reason && event.reason.message ? event.reason.message : event.reason));
});
// =================================

// --- IMPORTS ---
import { db, auth, storage } from "./firebase.js";
import { showToast, showPageTransitionLoader, hidePageTransitionLoader } from "./ui-helpers.js";
import { handleNavigation } from "./navigation.js";
import { renderWelcome } from "./welcome.js";
import { renderLogin }   from "./login.js";
import { renderSignup }  from "./signup.js";
import * as studentPages    from "./student/index.js";
import * as instructorPages from "./instructor/index.js";
import * as adminPages      from "./admin/index.js";
import * as superadminPages from "./superadmin/index.js";

export let currentUserEmail = null;
let loaderShownAt = Date.now();
let loaderEl = document.getElementById("app-loader");

// --- NAV HANDLERS ---
document.body.addEventListener("click", (e) => {
  const target = e.target.closest("[data-nav]");
  if (target) {
    const page = target.getAttribute("data-nav");
    if (page) {
      let dir = "forward";
      if (window.location.hash.replace("#", "") === page) dir = "back";
      handleNavigation(page, dir);
    }
  }
});
window.addEventListener("popstate", () => {
  const page = location.hash.replace("#", "") || "dashboard";
  handleNavigation(page, "back");
});

// --- AUTH STATE LISTENER ---
import {
  doc, getDoc, setDoc, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

onAuthStateChanged(auth, async user => {
  console.log("🔔 Auth state changed! User:", user); // <--- Debug line added

  // Remove any loading overlays/errors
  document.getElementById("js-error")?.classList.add("hidden");
  document.getElementById("loading-screen")?.classList.add("hidden");

  // Feedback: Show loading spinner
  const appEl = document.getElementById("app");
  if (appEl) {
    appEl.innerHTML = `
      <div class="screen-wrapper fade-in" style="text-align:center">
        <div class="loading-spinner" style="margin:40px auto;"></div>
        <p>Checking your credentials…</p>
      </div>
    `;
  }

  if (user) {
    currentUserEmail = user.email;
    let userRole = "student";
    let schoolId = null;
    let userData = {};

    try {
      // Fetch user role
      const roleDoc = await getDoc(doc(db, "userRoles", user.email));
      if (roleDoc.exists()) {
        const data = roleDoc.data();
        userRole = data.role || "student";
        schoolId = data.schoolId || null;
      } else {
        showToast("⚠️ No userRoles entry found for: " + user.email, 4000);
      }

      // Fetch (or create) user profile
      const usersRef = collection(db, "users");
      const snap = await getDocs(query(usersRef, where("email", "==", user.email)));
      if (!snap.empty) {
        userData = snap.docs[0].data();
        // Sync userData role
        if (!userData.role || userData.role !== userRole) {
          userData.role = userRole;
          await setDoc(doc(db, "users", user.email), { ...userData }, { merge: true });
        }
        if (userData.schoolId) schoolId = userData.schoolId;
        localStorage.setItem("fullName", userData.name || "CDL User");
      } else {
        // Create user profile
        userData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || "CDL User",
          role: userRole,
          schoolId: schoolId,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "users", user.email), userData);
        localStorage.setItem("fullName", userData.name);
      }
      localStorage.setItem("userRole", userRole);
      if (schoolId) localStorage.setItem("schoolId", schoolId);
      else localStorage.removeItem("schoolId");
      if (userRole === "superadmin") localStorage.setItem("isSuperAdmin", "1");
      else localStorage.removeItem("isSuperAdmin");

      showPageTransitionLoader();
      setTimeout(() => {
        handleNavigation("dashboard");
        hidePageTransitionLoader();
      }, 350);

    } catch (err) {
      console.error("❌ Auth/profile error:", err);
      showToast("Error loading profile: " + (err.message || err), 4800);
      renderWelcome();
    }
  } else {
    // Not logged in
    currentUserEmail = null;
    localStorage.removeItem("userRole");
    localStorage.removeItem("schoolId");
    showPageTransitionLoader();
    setTimeout(() => {
      renderWelcome();
      hidePageTransitionLoader();
    }, 300);
  }

  // Loader hiding
  const elapsed = Date.now() - loaderShownAt;
  setTimeout(() => loaderEl?.classList.add("hide"), Math.max(0, 400 - elapsed));
});

// --- INITIAL LOAD ---
window.addEventListener("DOMContentLoaded", () => {
  // Auth state listener will trigger and handle boot
});