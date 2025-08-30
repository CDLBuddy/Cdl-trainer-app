// src/student/dashboard/services/dashboardApi.js
// ============================================================================
// Dashboard API (student)
// - Firestore-backed "What's New" updates (one-shot + realtime)
// - School-aware fallbacks (try school-specific, then global)
// - Lightweight in-memory cache to avoid redundant reads
// - Friendly data shaping to match <UpdatesCard/> expectations
// - Convenience re-exports for resource/scheduler links
// ============================================================================

import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'

import { db } from '@utils/firebase.js'

// Reuse our centralized link helpers (already used by StudentDashboard)
export { getResourcesForSchool, getSchedulerURL } from '../links.js'

/* ──────────────────────────────────────────────────────────────────
   Config & helpers
   ────────────────────────────────────────────────────────────────── */

// Allow the collection name to be overridden via env.
// Default to 'updates' to match our UI copy.
const UPDATES_COLLECTION =
  import.meta.env.VITE_DASHBOARD_UPDATES_COLLECTION?.trim() || 'updates'

// Small memo cache: { schoolId -> { update, ts } }
const _cache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const now = () => Date.now()

/** Safely coerce Firestore Timestamp/Date/string into a Date object */
function coerceDate(d) {
  if (!d) return null
  try {
    // Firestore Timestamp?
    if (typeof d?.toDate === 'function') return d.toDate()
    const asDate = new Date(d)
    return Number.isNaN(asDate.getTime()) ? null : asDate
  } catch {
    return null
  }
}

/** Normalize a document payload to the card-friendly shape */
function shapeUpdate(doc) {
  if (!doc) return null
  const data = doc.data?.() ?? doc
  return {
    id: doc.id ?? data.id ?? undefined,
    // Minimal fields used by <UpdatesCard/>:
    content: data.content ?? data.text ?? data.message ?? '',
    date: data.date ?? data.publishedAt ?? data.updatedAt ?? null,
    // Optional niceties if you add them later:
    title: data.title ?? '',
    url: data.url ?? '',
    pinned: !!data.pinned,
    _raw: data, // handy in dev; safe to ignore in UI
  }
}

/** Caller-friendly schoolId resolver (localStorage or injected) */
function getSchoolId() {
  try {
    return (
      window.schoolId ||
      localStorage.getItem('schoolId') ||
      (window.__branding && window.__branding.schoolId) ||
      ''
    )
  } catch {
    return ''
  }
}

/* ──────────────────────────────────────────────────────────────────
   Queries
   ────────────────────────────────────────────────────────────────── */

/**
 * Fetch the most recent update (one-shot).
 * Tries: (1) school-specific -> (2) global (no filter).
 * Uses a short cache to avoid hammering Firestore on every mount.
 *
 * @param {{ schoolId?: string, useCache?: boolean }} [opts]
 * @returns {Promise<{ id?: string, content: string, date: any, title?: string, url?: string, pinned?: boolean }|null>}
 */
export async function getLatestUpdateOnce(opts = {}) {
  const schoolId = (opts.schoolId ?? getSchoolId() ?? '').trim().toLowerCase()
  const useCache = opts.useCache !== false

  // Cache hit?
  if (useCache && _cache.has(schoolId)) {
    const hit = _cache.get(schoolId)
    if (hit && now() - hit.ts < CACHE_TTL_MS) return hit.update
  }

  const col = collection(db, UPDATES_COLLECTION)

  // Helper to run a query and return the first doc (or null)
  async function firstDoc(q) {
    const snap = await getDocs(q)
    return snap.empty ? null : snap.docs[0]
  }

  let docLatest = null

  // 1) Try school-scoped
  try {
    if (schoolId) {
      const q1 = query(
        col,
        where('schoolId', '==', schoolId),
        orderBy('date', 'desc'),
        limit(1)
      )
      docLatest = await firstDoc(q1)
    }
  } catch {
    // If an index is missing or the field isn't there, we'll fall back below.
  }

  // 2) Try global fallback (no filter, newest first)
  if (!docLatest) {
    try {
      const q2 = query(col, orderBy('date', 'desc'), limit(1))
      docLatest = await firstDoc(q2)
    } catch {
      // If this fails, we ultimately return null below.
    }
  }

  const shaped = docLatest ? shapeUpdate(docLatest) : null

  // Normalize the date to a JS Date (for consistent formatting)
  if (shaped?.date) shaped.date = coerceDate(shaped.date)

  // Store in cache
  _cache.set(schoolId, { update: shaped, ts: now() })

  return shaped
}

/**
 * Subscribe to the most recent update for a school (realtime).
 * If no schoolId provided, listens to the global newest doc.
 *
 * @param {(update: any) => void} cb
 * @param {{ schoolId?: string }} [opts]
 * @returns {() => void} unsubscribe
 */
export function subscribeLatestUpdate(cb, opts = {}) {
  if (typeof cb !== 'function') return () => {}
  const schoolId = (opts.schoolId ?? getSchoolId() ?? '').trim().toLowerCase()
  const col = collection(db, UPDATES_COLLECTION)

  let q
  try {
    q = schoolId
      ? query(
          col,
          where('schoolId', '==', schoolId),
          orderBy('date', 'desc'),
          limit(1)
        )
      : query(col, orderBy('date', 'desc'), limit(1))
  } catch {
    // If we cannot build the constrained query (e.g., missing index),
    // fall back to the global newest doc.
    q = query(col, orderBy('date', 'desc'), limit(1))
  }

  return onSnapshot(
    q,
    snap => {
      const d = snap.empty ? null : snap.docs[0]
      const shaped = d ? shapeUpdate(d) : null
      if (shaped?.date) shaped.date = coerceDate(shaped.date)
      // update cache
      _cache.set(schoolId, { update: shaped, ts: now() })
      cb(shaped)
    },
    // Non-fatal: surface null to the subscriber on errors
    () => cb(null)
  )
}

/* ──────────────────────────────────────────────────────────────────
   Convenience aggregator (optional)
   ────────────────────────────────────────────────────────────────── */

/**
 * loadDashboardSnapshot
 * Fetches the latest update and returns it with school-aware links
 * in one call for simple consumers or SSR-like usage.
 *
 * @param {{ schoolId?: string, useCache?: boolean }} [opts]
 * @returns {Promise<{ update: any, links: Array<{href:string,label:string,icon?:any,newTab?:boolean}>, scheduler: string }>}
 */
export async function loadDashboardSnapshot(opts = {}) {
  const schoolId = (opts.schoolId ?? getSchoolId() ?? '').trim().toLowerCase()
  const [update] = await Promise.all([
    getLatestUpdateOnce({ schoolId, useCache: opts.useCache }),
  ])

  // Defer to our shared helpers for links/scheduling
  const links = getResourcesForSchool(schoolId)
  const scheduler = getSchedulerURL(schoolId)

  return { update, links, scheduler }
}

/* ──────────────────────────────────────────────────────────────────
   Testing/dev helpers (optional)
   ────────────────────────────────────────────────────────────────── */

/** Clear the internal cache (useful in tests or dev panels) */
export function __clearDashboardCache() {
  _cache.clear()
}
