// src/student/profile/useProfileState.js
import * as React from 'react'
import { getUserProfile, subscribeUserProfile } from '@utils/userProfile'

/**
 * useProfileState(email, options?)
 * Lightweight profile loader with optional realtime subscription.
 *
 * @param {string|null|undefined} email
 * @param {Object} [options]
 * @param {Object|null} [options.initial=null]  - initial profile shape
 * @param {boolean} [options.realtime=true]     - subscribe to live updates
 *
 * @returns {{
 *   profile: Object|null,
 *   setProfile: (updater: Function|Object) => void,
 *   loading: boolean,
 *   error: Error|null,
 *   refresh: () => Promise<void>
 * }}
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

    // Initial load
    ;(async () => {
      await refresh()
      if (!mounted) return

      // Optional realtime subscription
      if (realtime && email) {
        try {
          unsub = subscribeUserProfile(email, (live) => {
            // Ignore if the effect has since re-run for a different email
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
      try { unsub && unsub() } catch {}
    }
    // Intentionally depend only on email/realtime; refresh is stable but we avoid double-calls.
  }, [email, realtime]) // eslint-disable-line react-hooks/exhaustive-deps

  return { profile, setProfile: setProfileShallow, loading, error, refresh }
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