// src/utils/admin-data.js
// ======================================================================
// Admin Data (Firestore reads)
// - Real Firestore reads for Admin pages (companies, users, roster)
// - Defensive, paginated, and shape-stable
// - Simple array-returning helpers for screens + paged variants for large orgs
// ======================================================================

import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  startAfter,
} from 'firebase/firestore'

import { db } from '@/utils/firebase.js' // initialized Firestore instance

/* ------------------------------------------------------------------ */
/* Shared tiny utils                                                   */
/* ------------------------------------------------------------------ */

/** Lowercases + trims an email (safe for doc IDs). */
export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

/** Map a Firestore user doc to a roster/exports-friendly row. */
function mapUserDoc(ds) {
  const u = ds.data() || {}
  return {
    id: ds.id,
    email: u.email || ds.id,
    name:
      u.name ||
      u.fullName ||
      [u.firstName ?? u.first_name, u.lastName ?? u.last_name].filter(Boolean).join(' ') ||
      '',
    role: (u.role || 'student').toString().toLowerCase(),
    course: u.course || '',
    cdlClass: u.cdlClass || '',
    assignedInstructor: u.assignedInstructor || '',
    assignedCompany: u.assignedCompany || '',
    companyId: u.companyId || '',
    billing: u.billing || null, // may be { mode: 'employer'|'individual', ... } or null
    profileProgress: Number.isFinite(u.profileProgress) ? Number(u.profileProgress) : 0,
    permitExpiry: u.permitExpiry || '',
    medCardExpiry: u.medCardExpiry || '',
    paymentStatus: u.paymentStatus || '',
    schoolId: u.schoolId || '',
    status: u.status || 'active',
    // Keep full profile for calculators (enroll/BTW readiness, etc.)
    profile: u,
  }
}

/** Map a Firestore company doc to the expected admin shape. */
function mapCompanyDoc(ds) {
  const c = ds.data() || {}
  return {
    id: ds.id,
    name: c.name || c.companyName || '',
    schoolId: c.schoolId || '',
    // Our AddCompany flow saves a flat billingMode string (not nested)
    billingMode: c.billingMode || 'employer',
    contactEmail: c.contactEmail || '',
    address: c.address || '',      // present if your UI captured it
    status: c.status || 'active',  // optional; default ‘active’
    createdAt: c.createdAt || null,
    updatedAt: c.updatedAt || null,

    // Optional denormalized stats (used by chips if present)
    studentCount: Number(c.studentCount ?? c.rosterCount ?? 0) || 0,
    expiringSoon: Number(c.expiringSoon ?? c.soonToExpire ?? 0) || 0,

    // retain extras for forward-compat
    ...c,
  }
}

/* ------------------------------------------------------------------ */
/* Users (school-level)                                               */
/* ------------------------------------------------------------------ */

/**
 * Fetch users for a given school (simple array).
 * Suitable for screens that just need a single page or modest datasets.
 *
 * @param {string} schoolId
 * @param {Object} [opts]
 * @param {string[]} [opts.roles=['student','instructor','admin']] - 'in' query (max 10)
 * @param {number}   [opts.pageSize=500]  - page size
 * @param {number}   [opts.maxRecords=500] - cap total records to avoid huge reads
 * @returns {Promise<Array>}
 */
export async function fetchUsersForSchool(
  schoolId,
  { roles = ['student', 'instructor', 'admin'], pageSize = 500, maxRecords = 500 } = {}
) {
  const { items } = await fetchUsersForSchoolPaged(schoolId, { roles, pageSize, maxRecords })
  return items
}

/**
 * Fetch users (paginated).
 * Returns a single page unless you set `maxRecords` > pageSize, in which case
 * it will continue fetching until it reaches the cap or runs out of pages.
 *
 * @param {string} schoolId
 * @param {Object} opts
 * @param {string[]} [opts.roles=['student','instructor','admin']]
 * @param {number}   [opts.pageSize=500]
 * @param {any}      [opts.cursor]                 - last doc snapshot for pagination
 * @param {number}   [opts.maxRecords=0]           - 0 = just one page; >0 = accumulate up to this many
 * @returns {Promise<{items: Array, lastDoc: any}>}
 */
export async function fetchUsersForSchoolPaged(
  schoolId,
  { roles = ['student', 'instructor', 'admin'], pageSize = 500, cursor = null, maxRecords = 0 } = {}
) {
  if (!schoolId) return { items: [], lastDoc: null }

  const items = []
  let lastDoc = cursor
  let keepGoing = true

  try {
    while (keepGoing) {
      const clauses = [
        where('schoolId', '==', schoolId),
        roles && roles.length ? where('role', 'in', roles.slice(0, 10)) : null,
        orderBy('email'),                         // requires index w/ 'in' on role; add via console if needed
        fbLimit(Math.max(1, Math.min(pageSize, 1000))),
        lastDoc ? startAfter(lastDoc) : null,
      ].filter(Boolean)

      const qy = query(collection(db, 'users'), ...clauses)
      const snap = await getDocs(qy)

      const pageItems = snap.docs.map(mapUserDoc)
      items.push(...pageItems)
      lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null

      if (!maxRecords || items.length >= maxRecords || !lastDoc) keepGoing = false
    }

    // Trim to maxRecords if we overshot on the last page
    const trimmed = maxRecords ? items.slice(0, maxRecords) : items
    return { items: trimmed, lastDoc }
  } catch (err) {
    console.error('[admin-data] fetchUsersForSchoolPaged error:', err)
    return { items: [], lastDoc: null }
  }
}

/**
 * Get a single user by email (doc id).
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function fetchUserByEmail(email) {
  const id = normalizeEmail(email)
  if (!id) return null
  try {
    const d = await getDoc(doc(db, 'users', id))
    return d.exists() ? mapUserDoc(d) : null
  } catch (err) {
    console.error('[admin-data] fetchUserByEmail error:', err)
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Companies                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fetch companies for a given school (simple array).
 * Assumes top-level 'companies' with a 'schoolId' field.
 * If you store under /schools/{schoolId}/companies, see alt in comments.
 * @param {string} schoolId
 * @returns {Promise<Array>}
 */
export async function fetchCompaniesForSchool(schoolId) {
  if (!schoolId) return []
  try {
    // Top-level collection pattern
    const qy = query(
      collection(db, 'companies'),
      where('schoolId', '==', schoolId),
      orderBy('name', 'asc')
    )
    const snap = await getDocs(qy)
    return snap.docs.map(mapCompanyDoc)

    // Subcollection alternative:
    // const qy = query(collection(doc(db, 'schools', schoolId), 'companies'), orderBy('name', 'asc'))
    // const snap = await getDocs(qy)
    // return snap.docs.map(mapCompanyDoc)
  } catch (err) {
    console.error('[admin-data] fetchCompaniesForSchool error:', err)
    return []
  }
}

/**
 * Fetch companies (paginated) — helpful for large orgs.
 * @param {string} schoolId
 * @param {Object} opts
 * @param {number}   [opts.pageSize=250]
 * @param {any}      [opts.cursor]
 * @param {'name'|'createdAt'|'updatedAt'} [opts.sortBy='name']
 * @param {'asc'|'desc'} [opts.sortDir='asc']
 * @returns {Promise<{items: Array, lastDoc: any}>}
 */
export async function fetchCompaniesPaged(
  schoolId,
  { pageSize = 250, cursor = null, sortBy = 'name', sortDir = 'asc' } = {}
) {
  if (!schoolId) return { items: [], lastDoc: null }

  try {
    const clauses = [
      where('schoolId', '==', schoolId),
      orderBy(sortBy, sortDir),
      fbLimit(Math.max(1, Math.min(pageSize, 1000))),
      cursor ? startAfter(cursor) : null,
    ].filter(Boolean)

    const qy = query(collection(db, 'companies'), ...clauses)
    const snap = await getDocs(qy)

    const items = snap.docs.map(mapCompanyDoc)
    const lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null
    return { items, lastDoc }
  } catch (err) {
    console.error('[admin-data] fetchCompaniesPaged error:', err)
    return { items: [], lastDoc: null }
  }
}

/**
 * Get a single company by id.
 * @param {string} companyId
 * @returns {Promise<object|null>}
 */
export async function fetchCompanyById(companyId) {
  if (!companyId) return null
  try {
    const d = await getDoc(doc(db, 'companies', companyId))
    return d.exists() ? mapCompanyDoc(d) : null
  } catch (err) {
    console.error('[admin-data] fetchCompanyById error:', err)
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Roster (students under a company)                                  */
/* ------------------------------------------------------------------ */

/**
 * Fetch roster (students) for a company id — used by CompanyDetail/AdminReports.
 * @param {string} companyId
 * @param {Object} opts
 * @param {number} [opts.pageSize=500]
 * @param {any}    [opts.cursor]
 * @returns {Promise<{items: Array, lastDoc: any}>}
 */
export async function fetchRosterForCompany(
  companyId,
  { pageSize = 500, cursor = null } = {}
) {
  if (!companyId) return { items: [], lastDoc: null }
  try {
    const clauses = [
      where('role', '==', 'student'),
      where('companyId', '==', companyId),
      orderBy('name', 'asc'),
      fbLimit(Math.max(1, Math.min(pageSize, 1000))),
      cursor ? startAfter(cursor) : null,
    ].filter(Boolean)

    const qy = query(collection(db, 'users'), ...clauses)
    const snap = await getDocs(qy)

    const items = snap.docs.map(mapUserDoc)
    const lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null
    return { items, lastDoc }
  } catch (err) {
    console.error('[admin-data] fetchRosterForCompany error:', err)
    return { items: [], lastDoc: null }
  }
}