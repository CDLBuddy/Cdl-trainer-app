
// === DEBUG VERSION OF app.js ===
// Shows visible debug banners on-screen for mobile troubleshooting

// ✅ Confirm script is executing
document.body.innerHTML = `
  <div style="background:black;color:#00ff99;padding:1rem;text-align:center;">
    ✅ app.js is executing...
  </div>
` + document.body.innerHTML;

// ==== Firebase Setup ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// ==== Firebase Config ====
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const appInstance = initializeApp(firebaseConfig);
const db = getFirestore(appInstance);
const auth = getAuth(appInstance);

// ✅ Firebase Auth Listener
document.body.innerHTML = `
  <div style="background:black;color:#ffd700;padding:1rem;text-align:center;">
    ✅ Firebase initialized...
  </div>
` + document.body.innerHTML;

onAuthStateChanged(auth, async (user) => {
  document.body.innerHTML = `
    <div style="background:black;color:#66ccff;padding:1rem;text-align:center;">
      🔥 Firebase auth state changed: ${user ? "Signed In" : "Signed Out"}
    </div>
  ` + document.body.innerHTML;

  if (!user) {
    document.body.innerHTML = `
      <div style="background:black;color:red;padding:1rem;text-align:center;">
        🚫 No user detected — rendering welcome screen...
      </div>
    ` + document.body.innerHTML;
  } else {
    document.body.innerHTML = `
      <div style="background:black;color:lime;padding:1rem;text-align:center;">
        ✅ Welcome back, ${user.email || "user"} — dashboard loading...
      </div>
    ` + document.body.innerHTML;
  }
});
