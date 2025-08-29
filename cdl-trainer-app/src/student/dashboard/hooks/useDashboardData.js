// src/student/dashboard/hooks/useDashboardData.js
// -----------------------------------------------------------------------------
// useDashboardData(options?)
// - Fetches "What's New" (latest update)
// - Resolves schoolId (profile → localStorage → window fallback) & caches it
// - Builds external QuickLinks from services (defaults + per-school overrides)
// - Optionally exposes a scheduler URL when student is all set (100%)
// - Backward compatible with previous shape (latestUpdate, updatesLoading, updatesError)
//
// options:
//   - isAllSet?: boolean         // if true, returns schedulerUrl (when configured)
//   - schoolIdOverride?: string  // force a specific school id
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react'

import { useSession } from '@session/useSession.js'

import { getResourcesForSchool, getSchedulerURL } from '../services'
import { getLatestUpdate } from '../services/updatesApi.js'

/**
 * @typedef {Object} DashboardData
 * @property {object|null} latestUpdate
 * @property {boolean}     updatesLoading
 * @property {Error|null}  updatesError
 * @property {() => void}  refreshUpdates
 * @property {string}      schoolId
 * @property {Array<{to:string,label:string,icon?:any,external:true,newTab:true}>} externalLinks
 * @property {string}      schedulerUrl
 */

/**
 * @param {{ isAllSet?: boolean, schoolIdOverride?: string }} [opts]
 * @returns {DashboardData}
 */
export function useDashboardData(opts = {}) {
  const { isAllSet = false, schoolIdOverride } = opts

  // --- Session (for schoolId resolution) -----------------------------------
  const { user } = useSession() || {}

  // Resolve schoolId once; cache to localStorage; allow override
  const [schoolId, setSchoolId] = useState('')
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current && !schoolIdOverride) return
    initialized.current = true

    const fromProfile =
      user?.profile?.schoolId || user?.schoolId || user?.organizationId || ''
    const fromStorage = localStorage.getItem('schoolId') || ''
    const fromWindow = window.schoolId || ''
    const id = String(
      schoolIdOverride || fromProfile || fromStorage || fromWindow || ''
    ).trim()

    setSchoolId(id)
    if (id) {
      try {
        localStorage.setItem('schoolId', id)
      } catch {}
      try {
        window.schoolId = id
      } catch {}
    }
  }, [user, schoolIdOverride])

  // --- External resources / QuickLinks -------------------------------------
  const externalLinks = useMemo(() => {
    const resources = getResourcesForSchool(schoolId)
    // Normalize to <QuickLinks/> props
    return resources.map(r => ({
      to: r.href,
      label: r.label,
      icon: r.icon,
      external: true,
      newTab: r.newTab !== false, // default true
    }))
  }, [schoolId])

  // Optional scheduler CTA (only when 100% ready and configured)
  const schedulerUrl = useMemo(() => {
    if (!isAllSet) return ''
    return getSchedulerURL(schoolId) || ''
  }, [isAllSet, schoolId])

  // --- "What's New" (latest update) ----------------------------------------
  const [latestUpdate, setLatestUpdate] = useState(null)
  const [updatesLoading, setUpdatesLoading] = useState(true)
  const [updatesError, setUpdatesError] = useState(null)

  const refreshUpdates = () => {
    let alive = true
    setUpdatesLoading(true)
    setUpdatesError(null)
    ;(async () => {
      try {
        const data = await getLatestUpdate()
        if (!alive) return
        setLatestUpdate(data || null)
      } catch (err) {
        if (!alive) return
        setUpdatesError(err || new Error('Failed to load updates'))
      } finally {
        if (alive) setUpdatesLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }

  useEffect(() => {
    const cancel = refreshUpdates()
    return cancel
  }, [])

  return {
    latestUpdate,
    updatesLoading,
    updatesError,
    refreshUpdates,

    schoolId,
    externalLinks,
    schedulerUrl,
  }
}

export default useDashboardData
