// src/utils/firebase.js
// Firebase bootstrap for React + Vite (singleton, modular SDK)

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// ---- ENV CONFIG (set these in .env.local) ----
// Vite exposes envs under import.meta.env
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY      || "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN  || "cdltrainerapp.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID   || "cdltrainerapp",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cdltrainerapp.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "977549527480",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID       || "1:977549527480:web:e959926bb02a4cef65674d",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-MJ22BD2J1J",
};

// Optional emulator flags
const USE_EMULATORS = String(import.meta.env.VITE_USE_FIREBASE_EMULATORS || "").toLowerCase() === "true";
const EMU_HOST      = import.meta.env.VITE_EMULATOR_HOST || "localhost";
const EMU_AUTH_PORT = Number(import.meta.env.VITE_EMULATOR_AUTH_PORT || 9099);
const EMU_FS_PORT   = Number(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT || 8080);
const EMU_STO_PORT  = Number(import.meta.env.VITE_EMULATOR_STORAGE_PORT || 9199);

// ---- Initialize (singleton-safe) ----
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {
  /* non-fatal */
});

// Firestore
const db = getFirestore(app);
// Enable offline persistence (safe fallback for multi-tab)
enableIndexedDbPersistence(db).catch(() => {
  // Could not enable persistence (e.g., multiple tabs) — continue without it
});

// Storage
const storage = getStorage(app);

// Emulators (optional)
if (USE_EMULATORS) {
  try {
    connectAuthEmulator(auth, `http://${EMU_HOST}:${EMU_AUTH_PORT}`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMU_HOST, EMU_FS_PORT);
    connectStorageEmulator(storage, EMU_HOST, EMU_STO_PORT);
    // console.info("[Firebase] Using local emulators");
  } catch {
    /* ignore */
  }
}

// ---- Helpers (kept for compatibility) ----
export async function getLatestUpdate() {
  try {
    const updatesRef = collection(db, "updates");
    const q = query(updatesRef, orderBy("date", "desc"), limit(1));
    const qs = await getDocs(q);
    if (qs.empty) return null;
    const d = qs.docs[0];
    return { id: d.id, ...d.data() };
  } catch (e) {
    console.error("Failed to fetch latest update:", e);
    return null;
  }
}

// Legacy-style helpers you referenced earlier (kept intact)
export function getCurrentUserSchool() {
  return (
    localStorage.getItem("schoolId") ||
    (auth.currentUser && auth.currentUser.schoolId) ||
    null
  );
}

export async function getUserRole(email) {
  try {
    const roleSnap = await getDoc(doc(db, "userRoles", email));
    return roleSnap.exists() ? roleSnap.data().role : "student";
  } catch {
    return "student";
  }
}

export async function setUserRole(email, role, schoolId = null) {
  try {
    await setDoc(
      doc(db, "userRoles", email),
      { role, schoolId },
      { merge: true }
    );
    return true;
  } catch {
    return false;
  }
}

// ---- Exports ----
export {
  app,
  db,
  auth,
  storage,
  // Firestore utils you were re-exporting
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
};