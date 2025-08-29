// ======================================================================
// DEPRECATION SHIM — Prefer: import {...} from '@user-profile'
// This file re-exports the new library to keep legacy imports working.
// Adds back missing legacy helpers like getBlankUserProfile.
// ======================================================================

export * from '@user-profile'

import * as UserProfile from '@user-profile'

/** Minimal blank profile used by legacy Signup flows. Extend as needed. */
export function getBlankUserProfile(overrides = {}) {
  return {
    id: '',
    fullName: '',
    firstName: '',
    lastName: '',
    dob: '',            // ISODate 'YYYY-MM-DD'
    email: '',
    phone: '',
    address: { street: '', city: '', state: '', zip: '' },
    training: {
      classType: 'A',       // A/B/C
      endorsement: '',      // '', 'N','P','S','T','H','X'
      programType: 'both',  // 'theory' | 'btw' | 'both'
      theory: { completed: false },
      btw: { completed: false },
    },
    ...overrides,
  }
}

export default UserProfile

// DEV-only, one-time deprecation notice
if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
  console.warn(
    '[deprecate] Import from "@user-profile" instead of "@utils/userProfile". ' +
    'The shim will be removed in a future release.'
  )
}
