// Path: src/admin/companies/add-company/services/saveCompany.js
// ============================================================================
// Admin • Companies • saveCompany (service)
// - Creates a company in Firestore with sane defaults + audit fields
// - Optionally guards against duplicate names within a school
// - Pure service (no React), safe to tree-shake
// ============================================================================

// Optional preflight duplicate check (exported by main companies services barrel)
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

import { db } from '@utils/firebase.js'

import { existsByNameInSchool } from '@admin/companies/services/index'

/**
 * @typedef {Object} SaveCompanyInput
 * @property {string} name                       // required
 * @property {'employer'|'individual'} [billingMode='employer']
 * @property {string} [contactEmail='']
 * @property {string} [contact='']               // optional display contact (non-email)
 * @property {string} [address='']               // optional address
 * @property {string} [schoolId]                 // recommended for scoping + dup check
 * @property {string} [actor]                    // email/user id performing the change
 * @property {boolean} [skipDuplicateCheck=false]
 */

/**
 * saveCompany
 * Creates a new company document. Adds audit fields and defaults to `status: true`.
 * Returns a lightweight echo of the created record (timestamps are server-side).
 *
 * @param {SaveCompanyInput} input
 * @returns {Promise<{id:string, name:string, billing:{mode:string}, contactEmail:string, contact:string, address:string, status:boolean, schoolId?:string}>}
 */
export default async function saveCompany(input = {}) {
  const nowServer = serverTimestamp()

  const name = String(input.name || '').trim()
  const billingMode =
    input.billingMode === 'individual' ? 'individual' : 'employer'
  const contactEmail = String(input.contactEmail || '').trim()
  const contact = String(input.contact || '').trim()
  const address = String(input.address || '').trim()
  const schoolId = input.schoolId ? String(input.schoolId) : undefined
  const actor = String(input.actor || '').trim() || 'admin'
  const skipDuplicateCheck = Boolean(input.skipDuplicateCheck)

  if (!name) {
    throw new Error('Company name is required.')
  }

  // Optional duplicate guard (only meaningful when scoped to a school)
  if (!skipDuplicateCheck && schoolId) {
    const exists = await existsByNameInSchool(schoolId, name)
    if (exists) {
      const err = new Error(
        'A company with this name already exists for this school.'
      )
      err.code = 'company/duplicate'
      throw err
    }
  }

  // Canonical Firestore payload (kept consistent with other company writers)
  const docPayload = {
    name,
    contact, // display contact (name/phone/etc.)
    address,
    contactEmail,
    billing: { mode: billingMode }, // future-proof structure
    status: true, // active by default
    schoolId: schoolId || null,

    // audit + server time
    createdAt: nowServer,
    createdBy: actor,
    updatedAt: nowServer,
    updatedBy: actor,

    // convenience search field (optional; helps client filters)
    _search: [name, contact, address, contactEmail].join(' ').toLowerCase(),
  }

  const ref = await addDoc(collection(db, 'companies'), docPayload)

  // Return a lightweight object the UI can use immediately (optimistic).
  // Timestamps are server-set; callers shouldn’t rely on them being present
  // in this return shape without a follow-up read.
  return {
    id: ref.id,
    name,
    billing: { mode: billingMode },
    contactEmail,
    contact,
    address,
    status: true,
    ...(schoolId ? { schoolId } : {}),
  }
}

// Named export (optional) for consistency with other services.
export { saveCompany as saveCompanyDefault }
