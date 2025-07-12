// app.js

alert("🚀 app.js loaded – imports start");

// ─── 1. MODULE IMPORTS ─────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { showToast as importedShowToast } from "./ui-helpers.js";

// ─── 2. FIREBASE CONFIG & INITIALIZATION ────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain:        "cdltrainerapp.firebaseapp.com",
  projectId:         "cdltrainerapp",
  storageBucket:     "cdltrainerapp.appspot.com",
  messagingSenderId: "977549527480",
  appId:             "1:977549527480:web:e959926bb02a4cef65674d",
  measurementId:     "G-MJ22BD2J1J"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

alert("✅ Imports & config OK");

// ─── 3. AUTH STATE LISTENER ─────────────────────────────────────────────────────
alert("🔔 Attaching auth listener");
onAuthStateChanged(auth, user => {
  alert("🔔 Auth state changed: user=" + (user?.email || "null"));
  if (user) {
    appEl.innerHTML = `<div style="padding:20px;text-align:center;"><h1>Signed in as ${user.email}</h1></div>`;
  } else {
    alert("🏁 No user signed in, showing welcome");
    renderWelcome();
  }
});

  alert("✅ Auth listener attached");

// ─── 4. UTILITY FUNCTIONS ──────────────────────────────────────────────────────
function showToast(message, duration = 3000) { /* … */ }
function showModal(html) { /* … */ }
function closeModal()    { /* … */ }
function getRoleBadge(email) { /* … */ }
async function getAITipOfTheDay() { /* … */ }

alert("✅ Utilities OK");

// ─── 5. SIMPLE RENDER & TEST UI ────────────────────────────────────────────────
function renderWelcome() {
  const appEl = document.getElementById("app");
  if (!appEl) {
    alert("❌ #app not found");
    return;
  }
  appEl.innerHTML = `
    <div style="padding:20px; text-align:center;">
      <h1>Welcome!</h1>
      <button id="login-btn">🚀 Login</button>
    </div>
  `;
  document.getElementById("login-btn").onclick = () => alert("🔑 Login clicked");
}

// Final step in this test harness
renderWelcome();