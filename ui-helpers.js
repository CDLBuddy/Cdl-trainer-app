// ui-helpers.js

// 1. FIREBASE FIRESTORE IMPORTS (put these at the top)
import {
  doc,
  collection,
  addDoc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// 2. GLOBAL DB REFERENCE (if not passed as argument)
import { db } from "./app.js"; // OR define db here if preferred

// 3. TOAST, NAVIGATION, AND UI UTILITIES (your original helpers here)
// ...showToast, setupNavigation, etc...

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

// --- (Keep your showToast, setupNavigation, etc. here as before) ---