// firebase.js

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCHGQzw-QXk-tuT2Zf8EcbQRz7E0Zms-7A",
  authDomain:        "cdltrainerapp.firebaseapp.com",
  projectId:         "cdltrainerapp",
  storageBucket:     "cdltrainerapp.appspot.com",
  messagingSenderId: "977549527480",
  appId:             "1:977549527480:web:e959926bb02a4cef65674d",
  measurementId:     "G-MJ22BD2J1J"
};

// Prevent re-initialization in hot reload or multi-import setups
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const db      = getFirestore(app);
const auth    = getAuth(app);
const storage = getStorage(app);

// Fetch most recent update from Firestore 'updates' collection
async function getLatestUpdate() {
  try {
    const updatesRef = collection(db, "updates");
    const updatesQuery = query(updatesRef, orderBy("date", "desc"), limit(1));
    const querySnapshot = await getDocs(updatesQuery);
    if (querySnapshot.empty) return null;
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (e) {
    console.error("Failed to fetch latest update:", e);
    return null;
  }
}

export { app, db, auth, storage, getLatestUpdate };

// Optionally, you can export Firestore helpers for convenience:
// export { collection, query, orderBy, limit, getDocs };