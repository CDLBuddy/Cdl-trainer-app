// src/utils/env.js
// ======================================================================
// Env helpers (Vite + SSR-safe)
// - Single source of truth for reading env flags
// - Priorities: process.env  <  import.meta.env  <  window.__ENV__
//   (window.__ENV__ lets you hot-override at runtime if you inject it)
// - Exposes: ENV object (frozen), __DEV__, __PROD__, MODE, and typed getters
// ======================================================================

/* ------------------------------- Sources -------------------------------- */

const hasVite = typeof import.meta !== 'undefined' && !!import.meta.env
const hasNode = typeof process !== 'undefined' && !!process.env
const hasWindow = typeof window !== 'undefined' && !!window.__ENV__

const srcNode = hasNode ? process.env : {}
const srcVite = hasVite ? import.meta.env : {}
const srcWindow = hasWindow ? window.__ENV__ : {}

/* ------------------------------ Utilities ------------------------------- */

const pickRelevant = (obj = {}) => {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (
      k.startsWith('VITE_') ||
      k === 'MODE' ||
      k === 'DEV' ||
      k === 'PROD' ||
      k === 'BASE_URL' ||
      k === 'NODE_ENV'
    ) {
      out[k] = v
    }
  }
  return out
}

// Merge with defined priority (left -> right overrides)
const merged = {
  ...pickRelevant(srcNode),
  ...pickRelevant(srcVite),
  ...pickRelevant(srcWindow),
}

// Normalize MODE/DEV/PROD to sane booleans/strings
const NODE_ENV = String(merged.NODE_ENV || '').toLowerCase()
const MODE = String(merged.MODE || NODE_ENV || '').toLowerCase() || 'production'
const DEV =
  typeof merged.DEV === 'boolean' ? merged.DEV : MODE === 'development'
const PROD =
  typeof merged.PROD === 'boolean' ? merged.PROD : MODE === 'production'

/* ------------------------------- Exported -------------------------------- */

export const ENV = Object.freeze({
  ...merged,
  MODE,
  DEV,
  PROD,
})

export const __DEV__ = !!ENV.DEV
export const __PROD__ = !!ENV.PROD

/* ----------------------------- Typed getters ----------------------------- */

/** Get a string env value (or fallback). */
export function env(name, fallback = '') {
  if (name in ENV) return String(ENV[name])
  if (name in srcNode) return String(srcNode[name])
  return fallback
}

/** Get a boolean env value. Accepts: true/false, "1"/"0", "yes"/"no", "on"/"off". */
export function envBool(name, fallback = false) {
  const raw = env(name, null)
  if (raw == null) return fallback
  const s = String(raw).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(s)) return true
  if (['0', 'false', 'no', 'off'].includes(s)) return false
  return fallback
}

/** Get an integer env value. */
export function envInt(name, fallback = 0) {
  const n = parseInt(env(name, ''), 10)
  return Number.isFinite(n) ? n : fallback
}

/** Parse JSON from an env var (handy for small config blobs). */
export function envJSON(name, fallback = null) {
  const raw = env(name, '')
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

/** Quick guard for URLs (returns fallback if not a plausible URL). */
export function envURL(name, fallback = '') {
  const raw = env(name, '')
  if (!raw) return fallback
  try {
    new URL(raw)
    return raw
  } catch {
    return fallback
  }
}
