// school-branding.js

import { db } from './firebase.js';
import {
  doc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

// Demo fallback brands (used if Firestore fails)
const SCHOOL_BRANDS = [
  {
    id: 'cdlbuddy',
    schoolName: 'CDL Buddy',
    logoUrl: '/default-logo.svg',
    primaryColor: '#b48aff',
    contactEmail: 'support@cdltrainerapp.com',
    website: 'https://cdltrainerapp.com',
    subHeadline: 'Your all-in-one CDL prep coach. Scroll down to get started!',
  },
  {
    id: 'acmetruck',
    schoolName: 'Acme Truck School',
    logoUrl: '/acme-logo.svg',
    primaryColor: '#00c497',
    contactEmail: 'help@acmetruck.edu',
    website: 'https://acmetruck.edu',
    subHeadline: 'Training the best drivers in the Midwest!',
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
      // Set theme color if present
      if (data.primaryColor)
        document.documentElement.style.setProperty(
          '--brand-primary',
          data.primaryColor
        );

      // (Optional) Save to localStorage for quick reload
      localStorage.setItem('schoolBrand', JSON.stringify({ id, ...data }));

      return { id, ...data };
    }
  } catch (err) {
    // Optionally: console.warn('Firestore branding fetch failed:', err);
  }

  // Fallback: Demo in-memory list
  const brand = SCHOOL_BRANDS.find((s) => s.id === id) || SCHOOL_BRANDS[0];
  if (brand.primaryColor)
    document.documentElement.style.setProperty(
      '--brand-primary',
      brand.primaryColor
    );

  localStorage.setItem('schoolBrand', JSON.stringify(brand));
  return brand;
}

// === Set current school and update theme ===
export function setCurrentSchool(schoolId) {
  localStorage.setItem('schoolId', schoolId);
  // Optionally, pre-load branding for UX
  getCurrentSchoolBranding();
}

// === List all demo schools (for selector UI; for prod, use Firestore) ===
export function getAllSchools() {
  return SCHOOL_BRANDS;
}

// === (Optional) Load all schools from Firestore for selector UI ===
import {
  collection,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
export async function fetchSchoolsFromFirestore() {
  const snap = await getDocs(collection(db, 'schools'));
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((s) => !s.disabled);
}
