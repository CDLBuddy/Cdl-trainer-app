// ======================================================================
// Restriction overlays — barrel
// - Exports individual overlays (tree-shakable)
// - Also provides small helpers (ALL, BY_ID, BY_CODE, getByCode)
// ======================================================================

import automatic from './automatic.js'        // E  = automatic transmission
import noAir from './no-air.js'               // L/Z = no full air brakes
import noFifthWheel from './no-fifth-wheel.js'// O  = no fifth-wheel

// Named exports so `import * as restrictions` works nicely
export { automatic, noAir, noFifthWheel }

// Convenience collections (optional; harmless to tree-shaking)
export const ALL = /** @type {const} */ ([automatic, noAir, noFifthWheel])

export const BY_ID = Object.freeze(
  ALL.reduce((acc, ov) => {
    if (ov?.id && !acc[ov.id]) acc[ov.id] = ov
    return acc
  }, /** @type {Record<string, any>} */ (Object.create(null)))
)

// Map CDL restriction codes → overlay objects
export const BY_CODE = Object.freeze({
  E: automatic,
  L: noAir,
  Z: noAir,
  O: noFifthWheel,
})

/** Lookup by CDL restriction code. Unknown codes return null. */
export function getByCode(code) {
  return BY_CODE[String(code ?? '').toUpperCase()] ?? null
}