// firebase.js

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
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
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

// --- CONFIG (secure in .env for production!) ---
const firebaseConfig = {
  apiKey:            "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain:        "cdltrainerapp.firebaseapp.com",
  projectId:         "cdltrainerapp",
  storageBucket:     "cdltrainerapp.appspot.com",
  messagingSenderId: "977549527480",
  appId:             "1:977549527480:web:e959926bb02a4cef65674d",
  measurementId:     "G-MJ22BD2J1J"
};

// --- Prevent re-initialization in hot reload or multi-import setups
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const db      = getFirestore(app);
const auth    = getAuth(app);
const storage = getStorage(app);

// --- Latest Update Helper (for global use) ---
async function getLatestUpdate() {
  try {
    const updatesRef = collection(db, "updates");
    const updatesQuery = query(updatesRef, orderBy("date", "desc"), limit(1));
    const querySnapshot = await getDocs(updatesQuery);
    if (querySnapshot.empty) return null;
    const latestDoc = querySnapshot.docs[0];
    return { id: latestDoc.id, ...latestDoc.data() };
  } catch (e) {
    console.error("Failed to fetch latest update:", e);
    return null;
  }
}

// --- User & School helpers (multi-school/role support) ---
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
  } catch (e) {
    return "student";
  }
}

export async function setUserRole(email, role, schoolId = null) {
  try {
    await setDoc(doc(db, "userRoles", email), { role, schoolId }, { merge: true });
    return true;
  } catch (e) {
    return false;
  }
}

// --- Exports for compatibility everywhere ---
export {
  app, db, auth, storage, getLatestUpdate,
  collection, query, orderBy, limit, getDocs,
  doc, getDoc, setDoc, updateDoc,
  getUserRole, setUserRole
};