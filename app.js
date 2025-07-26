console.log("✅ minimal-app.js loaded with imports!");

// --- Minimal Imports Test ---
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
import { getCurrentSchoolBranding, setCurrentSchool } from "./school-branding.js";

// Minimal UI Proof
const app = document.getElementById("app");
if (app) {
  app.innerHTML = `
    <h1 style="text-align:center;color:#00e676;margin-top:3em;">CDL Trainer Minimal App.js Loaded (With Imports)</h1>
    <p style="text-align:center;">If you see this, all import paths are valid!</p>
  `;
} else {
  document.body.innerHTML += '<div style="color:red">[error] #app element not found!</div>';
}