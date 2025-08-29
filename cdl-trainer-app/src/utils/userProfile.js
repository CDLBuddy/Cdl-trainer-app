// Path: src/utils/userProfile.js
// ======================================================================
// DEPRECATION SHIM — Prefer: import {...} from '@user-profile'
// This file re-exports the new library to keep legacy imports working.
// Exposes both named exports and a default namespace.
// ======================================================================

export * from '@user-profile'

import * as UserProfile from '@user-profile'

export default UserProfile

// DEV-only, one-time deprecation notice (relies on vite define: __DEV__)
if (import.meta.env && import.meta.env.DEV) {
  console.warn(
    '[deprecate] Import from "@user-profile" instead of "@utils/userProfile". ' +
      'The shim will be removed in a future release.'
  )
}
