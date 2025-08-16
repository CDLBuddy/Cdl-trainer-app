// src/student/profile/useProfileState.js
// ============================================================================
// useProfileState(email, options?)
// Lightweight profile loader with optional realtime subscription.
// Adds derived flags + a safe nested selector for dotted paths.
// ============================================================================

import * as React from 'react'
import { getUserProfile, subscribeUserProfile } from '@utils/userProfile.js'

/**
 * @typedef {Object} UseProfileOptions
 * @property {Object|null} [initial=null]  Initial profile value (used if no email)
 * @property {boolean} [realtime=true]     Subscribe to live updates
 */

/**
 * @typedef {Object} UseProfileReturn
 * @property {Object|null} profile
 * @property {(updater: Function|Object) => void} setProfile
 * @property {boolean} loading
 * @property {Error|null} error
 * @property {() => Promise<void>} refresh
 * @property {boolean} isEmployerPaid         billing.mode === 'employer'
 * @property {boolean} isIndividual           billing.mode === 'individual'
 * @property {boolean} hasVehicle             vehicleQualified === 'yes'
 * @property {Object}  verified               verified block (or {})
 * @property {(path:string, fallback?:any)=>any} select  Safe dotted getter, e.g. select('billing.mode','employer')
 */

/**
 * useProfileState(email, options?)
 * @param {string|null|undefined} email
 * @param {UseProfileOptions} [options]
 * @returns {UseProfileReturn}
 */
export function useProfileState(email, { initial = null, realtime = true } = {}) {
  const [profile, setProfile] = React.useState(initial)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  // Track the latest email to ignore late async updates
  const latestEmailRef = React.useRef(email)

  // Shallow set: avoid rerenders when nothing changed
  const setProfileShallow = React.useCallback((next) => {
    setProfile(prev => {
      const value = typeof next === 'function' ? next(prev) : next
      return shallowEqual(prev, value) ? prev : value
    })
  }, [])

  const refresh = React.useCallback(async () => {
    if (!email) {
      setLoading(false)
      setProfileShallow(initial || null)
      setError(null)
      return
    }
    try {
      setLoading(true)
      setError(null)
      latestEmailRef.current = email
      const data = await getUserProfile(email) // may return null
      if (latestEmailRef.current === email) {
        setProfileShallow(data || {})
      }
    } catch (err) {
      if (latestEmailRef.current === email) setError(err || new Error('Failed to load profile'))
    } finally {
      if (latestEmailRef.current === email) setLoading(false)
    }
  }, [email, initial, setProfileShallow])

  React.useEffect(() => {
    let unsub = () => {}
    let mounted = true

    ;(async () => {
      await refresh()
      if (!mounted) return

      if (realtime && email) {
        try {
          unsub = subscribeUserProfile(email, (live) => {
            if (!mounted || latestEmailRef.current !== email) return
            if (live) setProfileShallow(live)
          })
        } catch {
          // Non-fatal: ignore if subscription is unavailable
        }
      }
    })()

    return () => {
      mounted = false
      try { unsub && unsub() } catch { /* ignore unsubscribe errors */ }
    }
    // Intentionally depend only on email/realtime.
  }, [email, realtime]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------------------------------------------------------------- */
  /* Derived flags + selector                                               */
  /* ---------------------------------------------------------------------- */

  const select = React.useCallback((path, fallback = undefined) => {
    if (!profile || !path) return fallback
    const val = path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), profile)
    return val == null ? fallback : val
  }, [profile])

  const billingMode = String(select('billing.mode', '')).toLowerCase()
  const isEmployerPaid = billingMode === 'employer'
  const isIndividual   = billingMode === 'individual'
  const hasVehicle     = String(select('vehicleQualified', '')).toLowerCase() === 'yes'
  const verified       = select('verified', {}) || {}

  return {
    profile,
    setProfile: setProfileShallow,
    loading,
    error,
    refresh,
    // derived
    isEmployerPaid,
    isIndividual,
    hasVehicle,
    verified,
    select,
  }
}

/* -------------------------------------------------------------------------- */
/* Utils                                                                      */
/* -------------------------------------------------------------------------- */

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true
  if (!a || !b) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false

  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (let i = 0; i < aKeys.length; i++) {
    const k = aKeys[i]
    if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k])) {
      return false
    }
  }
  return true
}

export default useProfileState
