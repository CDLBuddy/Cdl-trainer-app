// src/utils/firebase.js
// Firebase bootstrap for React + Vite (singleton, modular SDK)

import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from 'firebase/auth'
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
  enableMultiTabIndexedDbPersistence,
  connectFirestoreEmulator,
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

// ---- ENV CONFIG (set these in .env.local) ----
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'dev-key-only',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dev-auth-domain',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dev-project-id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dev-bucket',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '0',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'dev-app-id',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
}

const USE_EMULATORS =
  String(import.meta.env.VITE_USE_FIREBASE_EMULATORS || '').toLowerCase() ===
  'true'
const EMU_HOST = import.meta.env.VITE_EMULATOR_HOST || 'localhost'
const EMU_AUTH_PORT = Number(import.meta.env.VITE_EMULATOR_AUTH_PORT || 9099)
const EMU_FS_PORT = Number(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT || 8080)
const EMU_STO_PORT = Number(import.meta.env.VITE_EMULATOR_STORAGE_PORT || 9199)

// ---- Initialize (singleton-safe) ----
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Auth
const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence).catch(() => {})

// Firestore
const db = getFirestore(app)
// Offline persistence
;(async () => {
  try {
    if (import.meta.env.VITE_FIRESTORE_MULTI_TAB === 'true') {
      await enableMultiTabIndexedDbPersistence(db)
    } else {
      await enableIndexedDbPersistence(db)
    }
  } catch {
    // Could not enable persistence; continue online-only
  }
})()

// Storage
const storage = getStorage(app)

// Emulators (optional)
if (USE_EMULATORS) {
  try {
    connectAuthEmulator(auth, `http://${EMU_HOST}:${EMU_AUTH_PORT}`, {
      disableWarnings: true,
    })
    connectFirestoreEmulator(db, EMU_HOST, EMU_FS_PORT)
    connectStorageEmulator(storage, EMU_HOST, EMU_STO_PORT)
  } catch {
    // ignore
  }
}

// ---- Helpers (compat/legacy) ----
export async function getLatestUpdate() {
  try {
    const qRef = query(
      collection(db, 'updates'),
      orderBy('date', 'desc'),
      limit(1)
    )
    const qs = await getDocs(qRef)
    if (qs.empty) return null
    const d = qs.docs[0]
    return { id: d.id, ...d.data() }
  } catch (e) {
    console.error('Failed to fetch latest update:', e)
    return null
  }
}

export function getCurrentUserSchool() {
  return localStorage.getItem('schoolId') || null // auth.currentUser.schoolId is not a real prop
}

export async function getUserRole(email) {
  try {
    const roleSnap = await getDoc(doc(db, 'userRoles', email))
    return roleSnap.exists() ? roleSnap.data().role : 'student'
  } catch {
    return 'student'
  }
}

export async function setUserRole(email, role, schoolId = null) {
  try {
    await setDoc(
      doc(db, 'userRoles', email),
      { role, schoolId },
      { merge: true }
    )
    return true
  } catch {
    return false
  }
}

// ---- Exports ----
export {
  app,
  db,
  auth,
  storage,
  // re-exports (kept for convenience)
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
}
