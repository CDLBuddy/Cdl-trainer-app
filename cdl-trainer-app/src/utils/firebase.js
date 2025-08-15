// Firebase bootstrap for React + Vite (singleton, modular SDK)

import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  persistentMultipleTabManager,
  memoryLocalCache,
  connectFirestoreEmulator,
  setLogLevel as setFsLogLevel, // dev logging
  // re-exports
  doc, getDoc, setDoc, updateDoc, addDoc, collection,
  serverTimestamp, increment, query, orderBy, limit, getDocs,
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

// ---- ENV CONFIG (use .env.local in web root) ----
const firebaseConfig = {
  apiKey:             import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain:         import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId:          import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket:      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId:  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:              import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId:      import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
}

const USE_EMULATORS  = String(import.meta.env.VITE_USE_FIREBASE_EMULATORS || '').toLowerCase() === 'true'
const EMU_HOST       = import.meta.env.VITE_EMULATOR_HOST || 'localhost'
const EMU_AUTH_PORT  = Number(import.meta.env.VITE_EMULATOR_AUTH_PORT || 9099)
const EMU_FS_PORT    = Number(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT || 8080)
const EMU_STO_PORT   = Number(import.meta.env.VITE_EMULATOR_STORAGE_PORT || 9199)
const MULTI_TAB      = String(import.meta.env.VITE_FIRESTORE_MULTI_TAB || '').toLowerCase() === 'true'

// Helpful sanity check: if not using emulators, real config must be present
if (import.meta.env.DEV && !USE_EMULATORS) {
  const missing = Object.entries(firebaseConfig).filter(([k, v]) => !v)
  if (missing.length) {
    console.warn('[firebase] Missing real env for:', missing.map(([k]) => k).join(', '),
      '\nAdd them to .env.local or set VITE_USE_FIREBASE_EMULATORS=true while developing.')
  }
}

// ---- Initialize (singleton-safe) ----
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Auth — IMPORTANT: connect emulator BEFORE any other auth calls
const auth = getAuth(app)
if (USE_EMULATORS) {
  try {
    connectAuthEmulator(auth, `http://${EMU_HOST}:${EMU_AUTH_PORT}`, { disableWarnings: true })
    console.info('[firebase] Auth emulator connected')
  } catch (e) {
    console.warn('[firebase] Failed to connect Auth emulator', e)
  }
}
// Set persistence after emulator wiring
setPersistence(auth, browserLocalPersistence).catch((e) => {
  if (import.meta.env.DEV) console.warn('[firebase] setPersistence failed; falling back to default', e)
})

// Firestore — use persistent cache, with network fallbacks that play nicer on dev/Wi-Fi/VPNs
let db
try {
  db = initializeFirestore(app, {
    cache: persistentLocalCache({
      tabManager: MULTI_TAB ? persistentMultipleTabManager() : persistentSingleTabManager(),
    }),
    // These help avoid flaky streaming on certain networks; harmless in dev.
    experimentalAutoDetectLongPolling: true,
    // useFetchStreams: false, // uncomment if you still see listener noise
  })
} catch {
  db = initializeFirestore(app, { cache: memoryLocalCache() })
}
if (USE_EMULATORS) {
  try {
    connectFirestoreEmulator(db, EMU_HOST, EMU_FS_PORT)
    console.info('[firebase] Firestore emulator connected')
  } catch (e) {
    console.warn('[firebase] Failed to connect Firestore emulator', e)
  }
}
// Quiet or increase Firestore logs while debugging login flows
if (import.meta.env.DEV) setFsLogLevel('error') // 'debug' if you need more detail

// Storage
const storage = getStorage(app)
if (USE_EMULATORS) {
  try {
    connectStorageEmulator(storage, EMU_HOST, EMU_STO_PORT)
    console.info('[firebase] Storage emulator connected')
  } catch (e) {
    console.warn('[firebase] Failed to connect Storage emulator', e)
  }
}

// ---- Tiny self-test helpers (call once from main while debugging) ----
export async function __firebaseHealthcheck() {
  try {
    // simple read that should never throw; existence is irrelevant
    await getDoc(doc(db, '_health', '_ping'))
    console.info('[firebase] Firestore reachable')
  } catch (e) {
    console.error('[firebase] Firestore unreachable', e)
  }
}

// ---- Convenience helpers ----
export async function getLatestUpdate() {
  try {
    const qRef = query(collection(db, 'updates'), orderBy('date', 'desc'), limit(1))
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
  try { return localStorage.getItem('schoolId') || null } catch { return null }
}

export async function getUserRole(email) {
  try {
    if (!email) return 'student'
    const roleSnap = await getDoc(doc(db, 'userRoles', String(email)))
    return roleSnap.exists() ? roleSnap.data().role : 'student'
  } catch {
    return 'student'
  }
}

export async function setUserRole(email, role, schoolId = null) {
  try {
    await setDoc(doc(db, 'userRoles', String(email)), { role, schoolId }, { merge: true })
    return true
  } catch {
    return false
  }
}

// ---- Exports ----
export { app, db, auth, storage }
export {
  doc, getDoc, setDoc, updateDoc, addDoc, collection,
  serverTimestamp, increment, query, orderBy, limit, getDocs,
}
