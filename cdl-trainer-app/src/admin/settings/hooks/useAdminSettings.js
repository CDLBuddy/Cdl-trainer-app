// src/admin/settings/hooks/useAdminSettings.js
// ======================================================================
// Admin Settings VM
// - Loads brand + prefs for the current school
// - Exposes a stable { loading, brand, prefs, actions, email, schoolId, isReady }
// - actions.save(nextPartialPrefs) merges into prefs and persists
// - actions.saveBrand(partialBrand) merges into brand and persists
// - actions.refresh() refetches from the source of truth
// - Optimistic updates with rollback on failure
// - Race-safe loader (late responses won’t clobber newer state)
// ======================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { auth } from '@utils/firebase.js'

import { useToast } from '@/components/useToast.js'

import { getSettings, updateSettings } from '../services/settingsApi.js'

/**
 * @typedef {Object} AdminSettingsVM
 * @property {boolean} loading
 * @property {Record<string, any>} brand
 * @property {Record<string, any>} prefs
 * @property {{save(nextPartialPrefs: object): Promise<void>, saveBrand(partialBrand: object): Promise<void>, refresh(): Promise<void>}} actions
 * @property {string|null} email
 * @property {string|null} schoolId
 * @property {boolean} isReady  // convenience: !loading && !!schoolId
 */

/** @returns {AdminSettingsVM} */
export function useAdminSettings() {
  const { showToast } = useToast()

  // ------- identity (stable) -------------------------------------------
  const schoolId = useMemo(() => {
    if (typeof window === 'undefined') return null
    return window.schoolId || localStorage.getItem('schoolId') || null
  }, [])

  const email = useMemo(() => {
    return (
      auth?.currentUser?.email ||
      localStorage.getItem('currentUserEmail') ||
      null
    )
  }, [])

  // ------- state --------------------------------------------------------
  const [loading, setLoading] = useState(true)
  const [brand, setBrand] = useState({})
  const [prefs, setPrefs] = useState({})

  // track mount + request versions to avoid race conditions
  const mountedRef = useRef(true)
  const reqVersionRef = useRef(0)

  useEffect(
    () => () => {
      mountedRef.current = false
    },
    []
  )

  // keep snapshot for rollback on failure
  const snapshotRef = useRef({ brand: {}, prefs: {} })
  useEffect(() => {
    snapshotRef.current = { brand, prefs }
  }, [brand, prefs])

  // ------- core loader (race-safe) -------------------------------------
  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false)
      showToast('No school selected. Settings unavailable.', 'error')
      return
    }

    const myVersion = ++reqVersionRef.current
    setLoading(true)
    try {
      const data = await getSettings(schoolId)
      // discard late/obsolete responses
      if (!mountedRef.current || myVersion !== reqVersionRef.current) return

      const nextBrand = data?.brand || {}
      const nextPrefs = data?.prefs || {}
      setBrand(nextBrand)
      setPrefs(nextPrefs)
      snapshotRef.current = { brand: nextBrand, prefs: nextPrefs }
    } catch {
      if (mountedRef.current && myVersion === reqVersionRef.current) {
        showToast('Failed to load settings', 'error')
      }
    } finally {
      if (mountedRef.current && myVersion === reqVersionRef.current) {
        setLoading(false)
      }
    }
  }, [schoolId, showToast])

  // initial fetch
  useEffect(() => {
    load()
  }, [load])

  // ------- actions (stable) --------------------------------------------
  const actions = useMemo(
    () => ({
      /**
       * Merge + persist a partial prefs object.
       * Works with subhooks: vm.actions.save({ [KEY]: partial })
       */
      async save(nextPartialPrefs = {}) {
        if (!schoolId) {
          showToast('Cannot save: missing school.', 'error')
          return
        }

        const prev = snapshotRef.current.prefs
        const optimistic = { ...prev, ...nextPartialPrefs }
        setPrefs(optimistic)

        try {
          await updateSettings(schoolId, { prefs: optimistic })
          snapshotRef.current = { ...snapshotRef.current, prefs: optimistic }
          showToast('Settings saved', 'success')
        } catch {
          setPrefs(prev) // rollback
          showToast('Failed to save settings', 'error')
        }
      },

      /**
       * Merge + persist branding (logoUrl, primaryColor, schoolName, …).
       */
      async saveBrand(partialBrand = {}) {
        if (!schoolId) {
          showToast('Cannot save: missing school.', 'error')
          return
        }

        const prev = snapshotRef.current.brand
        const optimistic = { ...prev, ...partialBrand }
        setBrand(optimistic)

        try {
          await updateSettings(schoolId, { brand: optimistic })
          snapshotRef.current = { ...snapshotRef.current, brand: optimistic }
          showToast('Branding updated', 'success')
        } catch {
          setBrand(prev) // rollback
          showToast('Failed to update branding', 'error')
        }
      },

      /** Refetch from the source of truth. */
      async refresh() {
        await load()
      },
    }),
    [schoolId, showToast, load]
  )

  // ------- return VM ----------------------------------------------------
  return {
    loading,
    brand,
    prefs,
    actions,
    email,
    schoolId,
    isReady: !!schoolId && !loading,
  }
}
