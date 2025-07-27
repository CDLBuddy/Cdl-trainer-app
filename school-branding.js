// school-branding.js

// === Demo: In-memory list. Replace or expand with Firestore as needed. ===
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
  // Add more schools as needed...
];

// === Get selected school branding (from localStorage or fallback to first/default) ===
export function getCurrentSchoolBranding() {
  const id = localStorage.getItem('schoolId') || SCHOOL_BRANDS[0].id;
  return SCHOOL_BRANDS.find((s) => s.id === id) || SCHOOL_BRANDS[0];
}

// === Save school selection, update CSS var for themeing ===
export function setCurrentSchool(schoolId) {
  localStorage.setItem('schoolId', schoolId);
  const brand = getCurrentSchoolBranding();
  if (brand.primaryColor)
    document.documentElement.style.setProperty(
      '--brand-primary',
      brand.primaryColor
    );
  // (Optional) Could also set --accent, --brand-logo, etc.
  localStorage.setItem('schoolBrand', JSON.stringify(brand));
}

// === List all available schools (for selector UI) ===
export function getAllSchools() {
  return SCHOOL_BRANDS;
}

// === (Optional) Load school branding from Firestore dynamically ===
// For future expansion if you want schools to be managed via Firestore:
// import { db } from "./firebase.js";
// import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
// export async function fetchSchoolsFromFirestore() {
//   const snap = await getDocs(collection(db, "schools"));
//   return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => !s.disabled);
// }
