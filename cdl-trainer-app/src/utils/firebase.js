// src/utils/firebase.js
// ======================================================================
// Firebase bootstrap for React + Vite (singleton, modular SDK)
// - Emulator-ready (auth/firestore/storage)
// - Safe in dev/prod and test/SSR
// - Exposes app, auth, db, storage + some tiny helpers
// ======================================================================

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
  setLogLevel as setFsLogLevel,
  // re-exports
  doc, getDoc, setDoc, updateDoc, addDoc, collection,
  serverTimestamp, increment, query, orderBy, limit, getDocs,
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

// ---------- Env & flags -------------------------------------------------

const IS_DEV = !!import.meta.env.DEV
const IS_BROWSER = typeof window !== 'undefined'

// Read .env (see .env.example)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
}

// Emulators
const IS_EMU          = String(import.meta.env.VITE_USE_FIREBASE_EMULATORS || '').toLowerCase() === 'true'
const EMU_HOST        = import.meta.env.VITE_EMULATOR_HOST || 'localhost'
const EMU_AUTH_PORT   = Number(import.meta.env.VITE_EMULATOR_AUTH_PORT || 9099)
const EMU_FS_PORT     = Number(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT || 8080)
const EMU_STO_PORT    = Number(import.meta.env.VITE_EMULATOR_STORAGE_PORT || 9199)
const MULTI_TAB       = String(import.meta.env.VITE_FIRESTORE_MULTI_TAB || 'false').toLowerCase() === 'true'

// Sanity warn in dev when not using emulators without real env set
if (IS_DEV && !IS_EMU) {
  const missing = Object.entries(firebaseConfig).filter(([_, v]) => !v)
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn(
      '[firebase] Missing real env for:',
      missing.map(([k]) => k).join(', '),
      '\nAdd them to .env.local or set VITE_USE_FIREBASE_EMULATORS=true during development.'
    )
  }
}

// ---------- Initialize (singleton-safe) ---------------------------------

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Auth — connect emulator BEFORE any other auth calls
const auth = getAuth(app)
if (IS_EMU && IS_BROWSER) {
  try {
    // Avoid “already connected” spam by constructing the URL once
    const authUrl = `http://${EMU_HOST}:${EMU_AUTH_PORT}`
    // @ts-expect-error: disableWarnings accepted by SDK
    connectAuthEmulator(auth, authUrl, { disableWarnings: true })
    if (IS_DEV) console.info('[firebase] Auth emulator:', authUrl)
  } catch (e) {
    if (IS_DEV) console.warn('[firebase] Failed to connect Auth emulator', e)
  }
}
// Set persistence after emulator wiring
setPersistence(auth, browserLocalPersistence).catch((e) => {
  if (IS_DEV) console.warn('[firebase] setPersistence fell back to default', e)
})

// Firestore — robust cache + network fallbacks
let db
try {
  db = initializeFirestore(app, {
    cache: persistentLocalCache({
      tabManager: MULTI_TAB ? persistentMultipleTabManager() : persistentSingleTabManager(),
    }),
    experimentalAutoDetectLongPolling: true, // smoother on VPNs/hotel Wi-Fi
    // useFetchStreams: false, // uncomment if you still see listener noise
  })
} catch {
  // Fallback (in-memory) if persistent cache init fails (private/incognito, etc.)
  db = initializeFirestore(app, { cache: memoryLocalCache() })
}
if (IS_EMU && IS_BROWSER) {
  try {
    connectFirestoreEmulator(db, EMU_HOST, EMU_FS_PORT)
    if (IS_DEV) console.info('[firebase] Firestore emulator:', `${EMU_HOST}:${EMU_FS_PORT}`)
  } catch (e) {
    if (IS_DEV) console.warn('[firebase] Failed to connect Firestore emulator', e)
  }
}
if (IS_DEV) setFsLogLevel('error') // set to 'debug' if you need extra logs

// Storage
const storage = getStorage(app)
if (IS_EMU && IS_BROWSER) {
  try {
    connectStorageEmulator(storage, EMU_HOST, EMU_STO_PORT)
    if (IS_DEV) console.info('[firebase] Storage emulator:', `${EMU_HOST}:${EMU_STO_PORT}`)
  } catch (e) {
    if (IS_DEV) console.warn('[firebase] Failed to connect Storage emulator', e)
  }
}

// ---------- Tiny self-test (manual use while debugging) -----------------

export async function __firebaseHealthcheck() {
  try {
    await getDoc(doc(db, '_health', '_ping')) // existence not required
    // eslint-disable-next-line no-console
    console.info('[firebase] Firestore reachable')
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[firebase] Firestore unreachable', e)
  }
}

// ---------- App-level convenience helpers -------------------------------

export async function getLatestUpdate() {
  try {
    const qRef = query(collection(db, 'updates'), orderBy('date', 'desc'), limit(1))
    const qs = await getDocs(qRef)
    if (qs.empty) return null
    const d = qs.docs[0]
    return { id: d.id, ...d.data() }
  } catch (e) {
    if (IS_DEV) console.error('Failed to fetch latest update:', e)
    return null
  }
}

export function getCurrentUserSchool() {
  try { return localStorage.getItem('schoolId') || null } catch { return null }
}

// NOTE: this “userRoles” collection is a light helper; your main role source
// is still custom claims / users/<uid>. Keep these consistent or consider
// removing this helper if it diverges from your auth flow.
export async function getUserRole(email) {
  try {
    if (!email) return 'student'
    const snap = await getDoc(doc(db, 'userRoles', String(email)))
    return snap.exists() ? snap.data()?.role || 'student' : 'student'
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

// (Optional) Handy ref builders you may use across features
export const refs = {
  schoolWalkthrough: (schoolId, token) =>
    doc(db, 'schools', String(schoolId), 'walkthroughs', String(token)),
  userByUid: (uid) => doc(db, 'users', String(uid)),
}

// ---------- Exports (keep your public surface the same) -----------------

export { app, db, auth, storage }
export {
  doc, getDoc, setDoc, updateDoc, addDoc, collection,
  serverTimestamp, increment, query, orderBy, limit, getDocs,
}

// Also export flags if you want quick checks elsewhere
export { IS_DEV, IS_EMU }