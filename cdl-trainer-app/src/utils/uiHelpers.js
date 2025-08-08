// src/utils/ui-helpers.js
// ===================================================
// React + Vite friendly UI helpers (no CDN imports)
// Centralized toasts, tips, checklists, progress, etc.
// ===================================================

// --- FIREBASE IMPORTS -------------------------------------------------
import { db, auth } from "./firebase";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  increment,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

// --- TOAST SYSTEM (works fine in React) -------------------------------
let toastQueue = [];
let isToastVisible = false;

/**
 * Show a toast message (imperative, React-safe)
 * @param {string} message
 * @param {number} duration ms
 * @param {'info'|'success'|'error'} type
 */
export function showToast(message, duration = 3000, type = "info") {
  toastQueue.push({ message, duration, type });
  if (!isToastVisible) showNextToast();
}

function showNextToast() {
  if (!toastQueue.length) {
    isToastVisible = false;
    return;
  }
  isToastVisible = true;
  const { message, duration, type } = toastQueue.shift();

  // Remove any existing toasts
  document.querySelectorAll(".toast-message").forEach((t) => t.remove());

  const toast = document.createElement("div");
  toast.className = `toast-message toast-${type}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.tabIndex = 0;
  toast.innerHTML = `<span>${message}</span>`;
  toast.style.position = "fixed";
  toast.style.bottom = "24px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background =
    type === "error" ? "#e35656" : type === "success" ? "#44a368" : "#333";
  toast.style.color = "#fff";
  toast.style.padding = "12px 26px";
  toast.style.fontWeight = "500";
  toast.style.borderRadius = "7px";
  toast.style.opacity = "1";
  toast.style.boxShadow = "0 4px 18px 0 rgba(0,0,0,0.15)";
  toast.style.transition = "opacity 0.45s cubic-bezier(.4,0,.2,1)";
  toast.style.zIndex = "99999";
  toast.style.cursor = "pointer";
  document.body.appendChild(toast);

  toast.addEventListener("click", () => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
    showNextToast();
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.remove();
      showNextToast();
    }, 550);
  }, duration);
}

// --- PAGE TRANSITION LOADER (optional DOM overlay) --------------------
export function showPageTransitionLoader() {
  const overlay = document.getElementById("page-loader");
  if (overlay) {
    overlay.style.zIndex = "12000";
    overlay.classList.remove("hidden");
  }
}
export function hidePageTransitionLoader() {
  const overlay = document.getElementById("page-loader");
  if (overlay) setTimeout(() => overlay.classList.add("hidden"), 400);
}

// --- AI TIP OF THE DAY ------------------------------------------------
export function getRandomAITip() {
  const tips = [
    "Remember to verbally state 'three-point brake check' word-for-word during your walkthrough exam!",
    "Use three points of contact when entering and exiting the vehicle.",
    "Take time to walk around your vehicle and inspect all lights before every trip.",
    "Keep your study streak alive for better memory retention!",
    "Ask your instructor for feedback after each practice test.",
    "When practicing pre-trip, say each step out loud—it helps lock it in.",
    "Focus on sections that gave you trouble last quiz. Practice makes perfect!",
    "Have your permit and ID ready before every test session.",
    "Use your checklist to track what you’ve mastered and what needs more review.",
  ];
  return tips[new Date().getDay() % tips.length];
}

export async function getAITipOfTheDay() {
  const tips = [
    "Review your ELDT checklist daily.",
    "Use flashcards to stay sharp!",
    "Ask the AI Coach about Class A vs B.",
    "Take timed quizzes to simulate the real test.",
    "Complete your checklist for certification.",
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

// --- TYPEWRITER HEADLINE (optional legacy) ----------------------------
const _headlines = ["CDL Buddy", "Your CDL Prep Coach", "Study Smarter, Not Harder"];
let _hw = 0,
  _hc = 0;
export function startTypewriter(custom = null) {
  const el = document.getElementById("headline");
  if (!el) return;
  const headlineArr = custom || _headlines;
  if (_hc < headlineArr[_hw].length) {
    el.textContent += headlineArr[_hw][_hc++];
    setTimeout(() => startTypewriter(custom), 100);
  } else {
    setTimeout(() => {
      el.textContent = "";
      _hc = 0;
      _hw = (_hw + 1) % headlineArr.length;
      startTypewriter(custom);
    }, 2000);
  }
}

// --- DEBOUNCE ---------------------------------------------------------
export function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// --- CHECKLIST ALERTS -------------------------------------------------
export function getNextChecklistAlert(user = {}) {
  if (!user.cdlClass || !user.cdlPermit || !user.experience) {
    const missing = [];
    if (!user.cdlClass) missing.push("CDL class");
    if (!user.cdlPermit) missing.push("CDL permit status");
    if (!user.experience) missing.push("experience level");
    return `Complete your profile: ${missing.join(", ")}.`;
  }
  if (user.cdlPermit === "yes" && !user.permitPhotoUrl) {
    return "Upload a photo of your CDL permit.";
  }
  if (
    user.vehicleQualified === "yes" &&
    (!user.truckPlateUrl || !user.trailerPlateUrl)
  ) {
    const which = [
      !user.truckPlateUrl ? "truck" : null,
      !user.trailerPlateUrl ? "trailer" : null,
    ]
      .filter(Boolean)
      .join(" & ");
    return `Upload your ${which} data plate photo${which.includes("&") ? "s" : ""}.`;
  }
  if (typeof user.lastTestScore === "number" && user.lastTestScore < 80) {
    return "Pass a practice test (80%+ required).";
  }
  if (!user.walkthroughProgress || user.walkthroughProgress < 1) {
    return "Complete at least one walkthrough drill.";
  }
  return "All required steps complete! 🎉";
}

// --- FADE-IN ON SCROLL (optional) ------------------------------------
export function initFadeInOnScroll() {
  if (!("IntersectionObserver" in window)) return;
  const observer = new window.IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
    { threshold: 0.1 }
  );
  document.querySelectorAll(".fade-in-on-scroll").forEach((el) => observer.observe(el));
}

// --- USER INITIALS HELPER ---------------------------------------------
export function getUserInitials(name = "") {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// --- DATE FORMATTING ---------------------------------------------------
export function formatDate(dateInput) {
  if (!dateInput) return "-";
  const d = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// --- "WHAT'S NEW" / LATEST UPDATE ------------------------------------
// React-friendly fetcher:
export async function fetchLatestUpdate() {
  try {
    // Try collection: 'updates' ordered by 'date' desc
    const q = query(collection(db, "updates"), orderBy("date", "desc"), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
    // Fallback: doc 'updates/latest'
    const fallback = await getDoc(doc(db, "updates", "latest"));
    return fallback.exists() ? fallback.data() : null;
  } catch {
    return null;
  }
}

// Legacy imperative version used by older pages (safe no-op if missing element)
export async function showLatestUpdate() {
  const updateEl = document.getElementById("latest-update-card");
  if (!updateEl) return;
  updateEl.innerHTML = `<div style="padding:18px;text-align:center;">Loading updates...</div>`;
  const update = await fetchLatestUpdate();
  if (!update) {
    updateEl.innerHTML = `<div class="update-empty">No recent updates.</div>`;
    return;
  }
  updateEl.innerHTML = `
    <div class="update-banner">
      <div class="update-title">📢 What's New</div>
      <div class="update-content">${update.content || "(No details)"}</div>
      <div class="update-date">${formatDate(update.date)}</div>
    </div>
  `;
}

// --- ROLE BADGE (string/legacy) ---------------------------------------
export function getRoleBadge(input) {
  const role =
    input?.includes && input.includes("@")
      ? input.includes("admin@")
        ? "admin"
        : input.includes("instructor@")
        ? "instructor"
        : input.includes("superadmin@")
        ? "superadmin"
        : "student"
      : input || "student";
  if (!role) return "";
  return `<span class="role-badge ${role}">${role.charAt(0).toUpperCase() + role.slice(1)}</span>`;
}

// --- ROLE/ORG DETECTORS -----------------------------------------------
export function getCurrentUserRole(userObj = null) {
  return (
    userObj?.role ||
    localStorage.getItem("userRole") ||
    (auth.currentUser && auth.currentUser.role) ||
    "student"
  );
}
export function getCurrentSchoolId(userObj = null) {
  return userObj?.schoolId || localStorage.getItem("schoolId") || "default";
}

// --- ROLE-AWARE TOASTS -----------------------------------------------
export function showRoleToast(message, role = null, duration = 3200) {
  const type = role === "admin" ? "error" : role === "instructor" ? "success" : "info";
  showToast(message, duration, type);
}

// --- ASYNC LOADER UTILITY ---------------------------------------------
export async function withLoader(taskFn) {
  showPageTransitionLoader();
  try {
    return await taskFn();
  } finally {
    hidePageTransitionLoader();
  }
}

// --- FIRESTORE: ELDT PROGRESS HELPERS ---------------------------------
export async function updateELDTProgress(userId, fields, options = {}) {
  try {
    const { role = "student", logHistory = false } = options;
    const progressRef = doc(db, "eldtProgress", userId);
    const snap = await getDoc(progressRef);

    const updateObj = {
      ...fields,
      lastUpdated: serverTimestamp(),
      role,
    };

    // If you pass keys ending with 'Complete' set a '<key>dAt' timestamp
    Object.keys(fields).forEach((k) => {
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
      const historyRef = collection(progressRef, "history");
      await addDoc(historyRef, {
        ...fields,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
        role,
      });
    }
    return true;
  } catch (err) {
    console.error("❌ Error updating eldtProgress:", err);
    showToast?.("Failed to update progress: " + (err.message || err), 4000, "error");
    return false;
  }
}

export async function getUserProgress(userId) {
  const progressRef = doc(db, "eldtProgress", userId);
  const snap = await getDoc(progressRef);
  return snap.exists() ? snap.data() : {};
}

// --- CHECKLIST MILESTONES ---------------------------------------------
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
export async function adminUnlockStudentModule(studentEmail, adminEmail) {
  await updateELDTProgress(studentEmail, { adminUnlocked: true }, { role: "admin", logHistory: true });
}
export async function adminFlagStudent(studentEmail, adminEmail, note = "") {
  await updateELDTProgress(
    studentEmail,
    { adminFlagged: true, adminNote: note },
    { role: "admin", logHistory: true }
  );
}
export async function adminResetStudentProgress(studentEmail, adminEmail) {
  await updateELDTProgress(
    studentEmail,
    {
      profileComplete: false,
      permitUploaded: false,
      vehicleUploaded: false,
      walkthroughComplete: false,
      practiceTestPassed: false,
    },
    { role: "admin", logHistory: true }
  );
}
export async function incrementStudentStudyMinutes(studentEmail, minutes) {
  await updateELDTProgress(studentEmail, { studyMinutes: increment(minutes) }, { role: "student" });
}
export async function logStudySession(studentEmail, minutes, context = "") {
  const progressRef = doc(db, "eldtProgress", studentEmail);
  const historyRef = collection(progressRef, "studySessions");
  await addDoc(historyRef, { minutes, context, at: new Date().toISOString() });
}