// src/utils/admin-data.js
// Real Firestore reads for Admin pages

import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";

import { db } from '@/utils/firebase.js'; // make sure this exports an initialized Firestore instance

/**
 * Fetch users for a given school.
 * @param {string} schoolId
 * @param {Object} opts
 * @param {string[]} [opts.roles=['student','instructor','admin']] - role filter (max 10 for 'in' query)
 * @param {number}   [opts.pageSize=250] - page size
 * @param {any}      [opts.cursor] - pass the last doc snapshot to paginate
 * @returns {Promise<{items: Array, lastDoc: any}>}
 */
export async function fetchUsersForSchool(
  schoolId,
  { roles = ["student", "instructor", "admin"], pageSize = 250, cursor } = {}
) {
  if (!schoolId) return { items: [], lastDoc: null };

  try {
    const base = [
      where("schoolId", "==", schoolId),
      // Firestore 'in' supports up to 10 values
      roles && roles.length ? where("role", "in", roles.slice(0, 10)) : null,
      orderBy("email"),
      limit(pageSize),
      cursor ? startAfter(cursor) : null,
    ].filter(Boolean);

    const q = query(collection(db, "users"), ...base);
    const snap = await getDocs(q);

    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || "",
        email: data.email || d.id,
        role: data.role || "student",
        assignedInstructor: data.assignedInstructor || "",
        assignedCompany: data.assignedCompany || "",
        profileProgress: data.profileProgress ?? 0,
        permitExpiry: data.permitExpiry || "",
        medCardExpiry: data.medCardExpiry || "",
        paymentStatus: data.paymentStatus || "",
        schoolId: data.schoolId || "",
        ...data, // keep extras in case UI needs them
      };
    });

    const lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    return { items, lastDoc };
  } catch (err) {
    console.error("[admin-data] fetchUsersForSchool error:", err);
    return { items: [], lastDoc: null };
  }
}

/**
 * Fetch companies for a given school.
 * Assumes a top-level 'companies' collection with a 'schoolId' field.
 * If your data is stored under /schools/{schoolId}/companies, use the commented alternative.
 * @param {string} schoolId
 * @returns {Promise<Array>}
 */
export async function fetchCompaniesForSchool(schoolId) {
  if (!schoolId) return [];

  try {
    // Top-level collection pattern:
    const q = query(
      collection(db, "companies"),
      where("schoolId", "==", schoolId),
      orderBy("name")
    );
    const snap = await getDocs(q);

    // --- If you use subcollection under school, use this instead:
    // const q = query(collection(doc(db, 'schools', schoolId), 'companies'), orderBy('name'));
    // const snap = await getDocs(q);

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("[admin-data] fetchCompaniesForSchool error:", err);
    return [];
  }
}

/**
 * OPTIONAL: get a single user by email (doc id) with merge of role doc if you use userRoles.
 */
export async function fetchUserByEmail(email) {
  if (!email) return null;
  try {
    const d = await getDoc(doc(db, "users", email));
    return d.exists() ? { id: d.id, ...d.data() } : null;
  } catch (err) {
    console.error("[admin-data] fetchUserByEmail error:", err);
    return null;
  }
}
