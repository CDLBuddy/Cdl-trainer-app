// src/student/profile/useProfileState.js
// ============================================================================
// useProfileState(email?, options?)
// Lightweight profile loader with optional realtime subscription.
// - Works with new @user-profile lib (get/subscribe)
// - Optional fallback to current auth user when email is not provided
// - Race-safe, SSR-safe, with derived flags + dotted-path selector
// ============================================================================

import * as React from 'react'

import { auth } from '@utils/firebase.js'

import { getUserProfile, subscribeUserProfile } from '@user-profile'

/**
 * @typedef {Object} UseProfileOptions
 * @property {Object|null} [initial=null]       Initial profile when no email
 * @property {boolean}     [realtime=true]      Subscribe to live updates
 * @property {boolean}     [fallbackToAuth=true]Use auth.currentUser.email if email is falsy
 */

/**
 * @typedef {Object} UseProfileReturn
 * @property {Object|null} profile
 * @property {(updater: Function|Object) => void} setProfile
 * @property {boolean} ready                     // !loading
 * @property {boolean} loading
 * @property {Error|null} error
 * @property {() => Promise<void>} refresh
 * @property {boolean} isEmployerPaid            // billing.mode === 'employer'
 * @property {boolean} isIndividual              // billing.mode === 'individual'
 * @property {boolean} hasVehicle                // vehicleQualified === 'yes'
 * @property {Object}  verified                  // {} or map; boolean true becomes {global:true}
 * @property {(path:string, fallback?:any)=>any} select  // dotted getter
 */

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  const ka = Object.keys(a),
    kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (let i = 0; i < ka.length; i++) {
    const k = ka[i]
    if (!Object.prototype.hasOwnProperty.call(b, k) || !Object.is(a[k], b[k]))
      return false
  }
  return true
}

/**
 * useProfileState(email?, options?)
 * If email is omitted and fallbackToAuth is true, we’ll use the current user.
 */
export function useProfileState(
  email,
  { initial = null, realtime = true, fallbackToAuth = true } = {}
) {
  // Resolve effective email (once per render) with auth fallback
  const effectiveEmail = React.useMemo(() => {
    if (email) return email
    if (!fallbackToAuth) return ''
    try {
      return auth?.currentUser?.email || ''
    } catch {
      return ''
    }
  }, [email, fallbackToAuth])

  const [profile, _setProfile] = React.useState(initial)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  // Track the latest email to ignore late async updates
  const latestEmailRef = React.useRef(effectiveEmail)

  // Shallow setter avoids extra renders for identical objects
  const setProfile = React.useCallback(next => {
    _setProfile(prev => {
      const value = typeof next === 'function' ? next(prev) : next
      return shallowEqual(prev || null, value || null) ? prev : value
    })
  }, [])

  const refresh = React.useCallback(async () => {
    const currentEmail = effectiveEmail
    latestEmailRef.current = currentEmail

    if (!currentEmail) {
      setProfile(initial || null)
      setError(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getUserProfile(currentEmail) // may be null
      if (latestEmailRef.current === currentEmail) {
        setProfile(data || {})
      }
    } catch (err) {
      if (latestEmailRef.current === currentEmail) {
        setError(err || new Error('Failed to load profile'))
      }
    } finally {
      if (latestEmailRef.current === currentEmail) {
        setLoading(false)
      }
    }
  }, [effectiveEmail, initial, setProfile])

  // Initial load + optional realtime subscription
  React.useEffect(() => {
    let unsub = () => {}
    let active = true

    ;(async () => {
      await refresh()
      if (!active) return

      if (realtime && effectiveEmail) {
        try {
          unsub = subscribeUserProfile(effectiveEmail, live => {
            if (!active || latestEmailRef.current !== effectiveEmail) return
            if (live) setProfile(live)
          })
        } catch {
          // Non-fatal; keep showing the last loaded snapshot
        }
      }
    })()

    return () => {
      active = false
      try {
        unsub()
      } catch {}
    }
  }, [effectiveEmail, realtime, refresh, setProfile])

  /* -------------------------- Derived helpers -------------------------- */

  const select = React.useCallback(
    (path, fallback = undefined) => {
      if (!profile || !path) return fallback
      const val = path
        .split('.')
        .reduce((acc, k) => (acc == null ? acc : acc[k]), profile)
      return val == null ? fallback : val
    },
    [profile]
  )

  const billingMode = String(select('billing.mode', '')).toLowerCase()
  const isEmployerPaid = billingMode === 'employer'
  const isIndividual = billingMode === 'individual'
  const hasVehicle =
    String(select('vehicleQualified', '')).toLowerCase() === 'yes'

  // verified may be: true | {} | {section:boolean|{by,at}}
  const verifiedRaw = select('verified', {})
  const verified =
    verifiedRaw === true
      ? { global: true }
      : verifiedRaw && typeof verifiedRaw === 'object'
        ? verifiedRaw
        : {}

  return {
    profile,
    setProfile,
    ready: !loading,
    loading,
    error,
    refresh,
    isEmployerPaid,
    isIndividual,
    hasVehicle,
    verified,
    select,
  }
}

export default useProfileState
