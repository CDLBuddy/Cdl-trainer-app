// Path: src/admin/dashboard/components/calendar/useCalendarEvents.js
// ======================================================================
// useCalendarEvents (admin & instructor)
// - Realtime subscribe with safe teardown and param guards
// - Normalizes events (title/status/color/allDay) + deterministic sort
// - Exposes loading/error/ready + stable CRUD wrappers with toasts
// - Color: event.color persisted; defaults to deterministic color-by-instructor
// ======================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useToast } from '@components/useToast.js'

import {
  subscribeSchoolEvents,
  subscribeInstructorEvents,
  createEvent as __createEvent,
  updateEvent as __updateEvent,
  deleteEventById as __deleteEvent,
  upsertEvent as __upsertEvent,
} from '@lib/scheduling/firestore.js'

/** @typedef {'confirmed'|'tentative'|'cancelled'} EventStatus */

/**
 * Deterministic pastel-ish color derived from a string (e.g., instructorId).
 * Keeps schedules visually consistent even when color isn't manually set.
 */
function colorFromSeed(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const hue = h % 360
  return `hsl(${hue} 65% 48%)`
}

/**
 * Normalize an incoming raw event.
 * - Coerces dates to ISO strings
 * - Ensures title/status/default color/allDay flags
 * - Filters out malformed rows (returns null)
 */
function normalizeOne(e = {}) {
  const allDay = !!e.allDay
  // Accept YYYY-MM-DD for all-day; otherwise Date/ISO
  const start = allDay ? new Date(`${e.start}T00:00:00`) : new Date(e.start)
  const endSrc = e.end ?? e.start
  const end = allDay ? new Date(`${endSrc}T23:59:59`) : new Date(endSrc)
  if (Number.isNaN(+start) || Number.isNaN(+end)) return null

  const title = String(e.title || '').trim() || '(Untitled)'
  /** @type {EventStatus} */
  const status = (e.status === 'tentative' || e.status === 'cancelled')
    ? e.status
    : 'confirmed'

  // Use stored color or a deterministic default by instructor
  const color = (e.color && String(e.color)) || colorFromSeed(String(e.instructorId || 'default'))

  return {
    ...e,
    title,
    status,
    color,
    allDay,
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

/** Normalize + filter invalid rows with deterministic sort */
function normalizeEvents(list = []) {
  const out = []
  for (const raw of list) {
    const v = normalizeOne(raw)
    if (v) out.push(v)
  }
  out.sort(
    (a, b) =>
      +new Date(a.start) - +new Date(b.start) ||
      +new Date(a.end) - +new Date(b.end)
  )
  return out
}

/**
 * @param {{ schoolId?: string, mode?: 'admin'|'instructor', instructorId?: string }} [params]
 */
export default function useCalendarEvents({ schoolId, mode = 'admin', instructorId } = {}) {
  const toast = useToast()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string|null} */(null))

  const unsubRef = useRef(/** @type {null|(() => void)} */(null))
  const mountedRef = useRef(true)

  // mount / unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      try { unsubRef.current?.() } catch { /* intentionally ignored */ }
    }
  }, [])

  // ---- Subscribe ----------------------------------------------------------
  useEffect(() => {
    if (!schoolId) {
      setEvents([])
      setLoading(false)
      setError(null)
      try { unsubRef.current?.() } catch { /* intentionally ignored */ }
      return
    }

    setLoading(true)
    setError(null)
    try { unsubRef.current?.() } catch { /* intentionally ignored */ }

    try {
      unsubRef.current =
        mode === 'instructor' && instructorId
          ? subscribeInstructorEvents(schoolId, instructorId, next => {
              if (!mountedRef.current) return
              setEvents(normalizeEvents(next))
              setLoading(false)
            })
          : subscribeSchoolEvents(schoolId, next => {
              if (!mountedRef.current) return
              setEvents(normalizeEvents(next))
              setLoading(false)
            })
    } catch (e) {
      console.error('[useCalendarEvents] subscribe error:', e)
      if (mountedRef.current) {
        setError('Failed to subscribe to events.')
        setLoading(false)
        toast.error?.('Couldn’t load schedule.')
      }
    }

    return () => { try { unsubRef.current?.() } catch { /* intentionally ignored */ } }
  }, [schoolId, mode, instructorId, toast])

  // ---- CRUD (stable callbacks + toasts) -----------------------------------
  const create = useCallback(async (evt) => {
    if (!schoolId) return
    try {
      const res = await __createEvent(schoolId, evt)
      toast.success?.('Event created.')
      return res
    } catch (e) {
      console.error('[useCalendarEvents] create error:', e)
      setError('Failed to create event.')
      toast.error?.('Create failed.')
      throw e
    }
  }, [schoolId, toast])

  const update = useCallback(async (id, patch) => {
    if (!schoolId || !id) return
    try {
      await __updateEvent(schoolId, id, patch)
      toast.info?.('Event updated.')
    } catch (e) {
      console.error('[useCalendarEvents] update error:', e)
      setError('Failed to update event.')
      toast.error?.('Update failed.')
      throw e
    }
  }, [schoolId, toast])

  const upsert = useCallback(async (evt) => {
    if (!schoolId) return
    try {
      const id = await __upsertEvent(schoolId, evt)
      toast.success?.('Event saved.')
      return id
    } catch (e) {
      console.error('[useCalendarEvents] upsert error:', e)
      setError('Failed to save event.')
      toast.error?.('Save failed.')
      throw e
    }
  }, [schoolId, toast])

  const remove = useCallback(async (id) => {
    if (!schoolId || !id) return
    try {
      await __deleteEvent(schoolId, id)
      toast.warn?.('Event deleted.')
    } catch (e) {
      console.error('[useCalendarEvents] delete error:', e)
      setError('Failed to delete event.')
      toast.error?.('Delete failed.')
      throw e
    }
  }, [schoolId, toast])

  const ready =
    !!schoolId && (mode === 'admin' || (mode === 'instructor' && !!instructorId))

  return useMemo(
    () => ({ events, loading, error, ready, create, update, upsert, remove }),
    [events, loading, error, ready, create, update, upsert, remove]
  )
}