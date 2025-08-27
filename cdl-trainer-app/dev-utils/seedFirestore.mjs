// dev-utils/seedFirestore.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'fake',
  authDomain: 'localhost',
  projectId: 'demo-app',
})
const db = getFirestore(app)

const schoolId = 'demo-school'

async function run() {
  await setDoc(doc(db, 'schools', schoolId), {
    schoolName: 'Demo CDL School',
    brand: { primaryColor: '#4fb0c6' },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(doc(db, 'providerProfiles', schoolId), {
    schoolId,
    tprId: 'TPR-123456',
    contactName: 'Alex Admin',
    contactEmail: 'admin@example.com',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  console.log('Seeded base docs.')
}
run().catch(console.error)