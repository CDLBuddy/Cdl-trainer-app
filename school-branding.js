// school-branding.js

import { db } from './firebase.js';
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

// === Demo fallback brands (used if Firestore fails or for selector preview) ===
const SCHOOL_BRANDS = [
  {
    id: 'cdlbuddy',
    schoolName: 'CDL Buddy',
    logoUrl: '/default-logo.svg',
    // Optional: primaryColor: '#2576d1fb',
    contactEmail: 'support@cdltrainerapp.com',
    website: 'https://cdltrainerapp.com',
    subHeadline: 'Your all-in-one CDL prep coach. Scroll down to get started!',
  },
  {
    id: 'browning',
    schoolName: 'Browning Mountain Training',
    logoUrl: '/browning-logo.svg', // Put your Browning logo in /public as needed
    // Optional: primaryColor: '#276348ff',
    contactEmail: 'browning@cdltraining.com',
    website: 'https://browningmountaintraining.com',
    subHeadline: 'Drive your future forward with Browning!',
  },
];

// === Get branding from Firestore (dynamic, fallback to demo if missing) ===
export async function getCurrentSchoolBranding() {
  const id = localStorage.getItem('schoolId') || SCHOOL_BRANDS[0].id;

  // Try to get branding from Firestore first
  try {
    const schoolDoc = await getDoc(doc(db, 'schools', id));
    if (schoolDoc.exists()) {
      const data = schoolDoc.data();
      if (data.primaryColor) {
        document.documentElement.style.setProperty(
          '--brand-primary',
          data.primaryColor
        );
      }
      // Save to localStorage for quick reloads
      localStorage.setItem('schoolBrand', JSON.stringify({ id, ...data }));
      return { id, ...data };
    }
  } catch (err) {
    // Optionally: console.warn('Firestore branding fetch failed:', err);
  }

  // Fallback: Demo in-memory list
  const brand = SCHOOL_BRANDS.find((s) => s.id === id) || SCHOOL_BRANDS[0];
  // No attempt to set --brand-primary (keeps app's default blue)
  localStorage.setItem('schoolBrand', JSON.stringify(brand));
  return brand;
}

// === Set current school and update theme ===
export function setCurrentSchool(schoolId) {
  localStorage.setItem('schoolId', schoolId);
  // Optionally, pre-load branding for instant theme update
  getCurrentSchoolBranding();
}

// === List all demo schools (for selector UI; for prod, use Firestore) ===
export function getAllSchools() {
  return SCHOOL_BRANDS;
}

// === (Optional) Load all schools from Firestore for selector UI ===
export async function fetchSchoolsFromFirestore() {
  const snap = await getDocs(collection(db, 'schools'));
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((s) => !s.disabled);
}
