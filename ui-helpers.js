let ;
// ui-helpers.js
import { db, auth } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
// 4. MILESTONE AND PROGRESS HELPERS

export async function updateELDTProgress(userId, fields, options = {}) {
  try {
    const { role = "student", logHistory = false } = options;
    const progressRef = doc(db, "eldtProgress", userId);
    const snap = await getDoc(progressRef);

    const updateObj = {
      ...fields,
      lastUpdated: serverTimestamp(),
      role
    };

  Object.keys(fields).forEach(k => {
      if (k.endsWith("Complete") && fields[k] === true) {
        updateObj[`${k}dAt`] = serverTimestamp();
      }
    });

    if (snap.exists()) {
      await updateDoc(progressRef, updateObj);
    } else {
      await setDoc(progressRef, { userId, ...updateObj });
    }

    if (logHistory) {
      const historyRef = doc(collection(progressRef, "history"));
      await setDoc(historyRef, {
        ...fields,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
        role
      });
    }
    return true;
  } catch (err) {
    console.error("❌ Error updating eldtProgress:", err);
    showToast?.("Failed to update progress: " + (err.message || err), 4000);
    return false;
  }
}

export async function getUserProgress(userId) {
  const progressRef = doc(db, "eldtProgress", userId);
  const snap = await getDoc(progressRef);
  return snap.exists() ? snap.data() : {};
}

// STUDENT CHECKLIST FIELDS
export const studentChecklistFields = [
  { key: "profileComplete", label: "Profile Complete" },
  { key: "permitUploaded", label: "Permit Uploaded" },
  { key: "vehicleUploaded", label: "Vehicle Data Plates Uploaded" },
  { key: "walkthroughComplete", label: "Walkthrough Practiced" },
  { key: "practiceTestPassed", label: "Practice Test Passed" }
];

// INSTRUCTOR CHECKLIST FIELDS
export const instructorChecklistFields = [
  { key: "profileVerified", label: "Profile Approved" },
  { key: "permitVerified", label: "Permit Verified" },
  { key: "vehicleVerified", label: "Vehicle Verified" },
  { key: "walkthroughReviewed", label: "Walkthrough Reviewed" }
];

// ADMIN CHECKLIST FIELDS
export const adminChecklistFields = [
  { key: "adminUnlocked", label: "Module Unlocked" },
  { key: "adminFlagged", label: "Flagged for Review" }
];

// STUDENT MILESTONE HELPERS
export async function markStudentProfileComplete(studentEmail) {
  await updateELDTProgress(studentEmail, { profileComplete: true }, { role: "student" });
}
export async function markStudentPermitUploaded(studentEmail) {
  await updateELDTProgress(studentEmail, { permitUploaded: true }, { role: "student" });
}
export async function markStudentVehicleUploaded(studentEmail) {
  await updateELDTProgress(studentEmail, { vehicleUploaded: true }, { role: "student" });
}
export async function markStudentWalkthroughComplete(studentEmail) {
  await updateELDTProgress(studentEmail, { walkthroughComplete: true }, { role: "student" });
}
export async function markStudentTestPassed(studentEmail) {
  await updateELDTProgress(studentEmail, { practiceTestPassed: true }, { role: "student" });
}

// INSTRUCTOR MILESTONE HELPERS
export async function verifyStudentProfile(studentEmail, instructorEmail) {
  await updateELDTProgress(studentEmail, { profileVerified: true }, { role: "instructor", logHistory: true });
}
export async function verifyStudentPermit(studentEmail, instructorEmail) {
  await updateELDTProgress(studentEmail, { permitVerified: true }, { role: "instructor", logHistory: true });
}
export async function verifyStudentVehicle(studentEmail, instructorEmail) {
  await updateELDTProgress(studentEmail, { vehicleVerified: true }, { role: "instructor", logHistory: true });
}
export async function reviewStudentWalkthrough(studentEmail, instructorEmail) {
  await updateELDTProgress(studentEmail, { walkthroughReviewed: true }, { role: "instructor", logHistory: true });
}

// ADMIN MILESTONE HELPERS
export async function adminUnlockStudentModule(studentEmail, adminEmail) {
  await updateELDTProgress(studentEmail, { adminUnlocked: true }, { role: "admin", logHistory: true });
}
export async function adminFlagStudent(studentEmail, adminEmail, note = "") {
  await updateELDTProgress(studentEmail, { adminFlagged: true, adminNote: note }, { role: "admin", logHistory: true });
}
export async function adminResetStudentProgress(studentEmail, adminEmail) {
  await updateELDTProgress(studentEmail, {
    profileComplete: false,
    permitUploaded: false,
    vehicleUploaded: false,
    walkthroughComplete: false,
    practiceTestPassed: false
  }, { role: "admin", logHistory: true });
}

// --- STUDY MINUTES TRACKING (reusing progress helper) ---
export async function incrementStudentStudyMinutes(studentEmail, minutes) {
  await updateELDTProgress(studentEmail, { studyMinutes: increment(minutes) }, { role: "student" });
}
export async function logStudySession(studentEmail, minutes, context = "") {
  const progressRef = doc(db, "eldtProgress", studentEmail);
  const historyRef = collection(progressRef, "studySessions");
  await addDoc(historyRef, {
    minutes,
    context,
    at: new Date().toISOString()
  });
}
// ─── UI TOAST MESSAGE ────────────────────────────────
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

// ─── SMART NAVIGATION ────────────────────────────────
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

// ─── LOADER OVERLAY ────────────────────────────────
export function showPageTransitionLoader() {
  const overlay = document.getElementById("loader-overlay");
  if (overlay) overlay.classList.remove("hidden");
}

export function hidePageTransitionLoader() {
  const overlay = document.getElementById("loader-overlay");
  if (overlay) setTimeout(() => overlay.classList.add("hidden"), 400);
}

// ─── AI TIP OF THE DAY ────────────────────────────────
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

// ─── FADE-IN ON SCROLL ────────────────────────────────
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

// ─── TYPEWRITER HEADLINE ────────────────────────────────
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

// ─── UTILITY: DEBOUNCE ────────────────────────────────
export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}