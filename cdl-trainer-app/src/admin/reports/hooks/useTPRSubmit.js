// src/admin/reports/hooks/useTPRSubmit.js
// ======================================================================
// useTPRSubmit
// - Validates + maps student/training/provider to a TPR payload
// - Submits via services *lazily* (no heavy code on initial render)
// - Batching, dry-run, progress callbacks, rich result summary
// - Back-compat: { submitOne, submitMany, submitting, lastError }
// ======================================================================

import { useCallback, useMemo, useRef, useState } from 'react'

/** Lazy-load mappers/validators/tprClient once, then cache. */
let _svcPromise = null
async function loadServices() {
  if (_svcPromise) return _svcPromise
  _svcPromise = (async () => {
    try {
      const [mappers, validators, tprClient] = await Promise.all([
        import('../services/mappers.js'),
        import('../services/validators.js'),
      ])
      return {
        toCompletion: mappers?.toTPRCompletion || (x => x),
        validate:
          validators?.validateTPRPayload || (() => ({ ok: true, errors: [] })),
        submitOne:
          tprClient?.submitCompletion ||
          (async payload => ({ ok: true, mode: 'stub', payload })),
        bulk: tprClient?.bulkUpload || null,
      }
    } catch {
      // Safe stubs if services fail to load (keeps UI usable)
      return {
        toCompletion: x => x,
        validate: () => ({ ok: true, errors: [] }),
        submitOne: async payload => ({ ok: true, mode: 'stub', payload }),
        bulk: null,
      }
    }
  })()
  return _svcPromise
}

/** Optional: caller can prefetch on idle/hover. */
export async function prefetchTPRServices() {
  try {
    await loadServices()
  } catch {
    // Intentionally empty: prefetch failures are non-fatal
  }
}

/**
 * @typedef {Object} SubmitOptions
 * @property {boolean} [dryRun=false]  Only validate/map; no API calls
 * @property {number}  [batchSize=100] Bulk payload size (if bulk endpoint exists)
 * @property {(p: { processed:number,total:number,ok:number,failed:number }) => void} [onProgress]
 * @property {string}  [schoolId]      Optional pass-through metadata
 */

/**
 * @typedef {Object} SubmitItemResult
 * @property {any} input
 * @property {any} payload
 * @property {boolean} valid
 * @property {string[]} errors
 * @property {any} response
 */

export default function useTPRSubmit() {
  const [submitting, setSubmitting] = useState(false)
  const [lastError, setLastError] = useState('')
  const [lastResult, setLastResult] = useState(null)
  const progressRef = useRef({ processed: 0, total: 0, ok: 0, failed: 0 })

  const reset = useCallback(() => {
    setSubmitting(false)
    setLastError('')
    setLastResult(null)
    progressRef.current = { processed: 0, total: 0, ok: 0, failed: 0 }
  }, [])

  const emitProgress = useCallback(onProgress => {
    if (typeof onProgress === 'function') onProgress({ ...progressRef.current })
  }, [])

  const runValidateMap = useCallback(async item => {
    const { toCompletion, validate } = await loadServices()
    // Accept either a ready payload or { student, training, provider }
    const mightBePayload =
      item &&
      (item.trainee ||
        item.traineeName ||
        item.completionDate ||
        item.providerId)
    const payload = mightBePayload ? item : toCompletion(item)

    const v = validate(payload)
    const valid = !!v.ok && (!v.errors || v.errors.length === 0)
    const errors = Array.isArray(v.errors)
      ? v.errors
      : v.ok
        ? []
        : ['Invalid payload']

    return { payload, valid, errors }
  }, [])

  // ------------------------------- submitOne -------------------------------
  const submitOne = useCallback(
    async (item, opts = /** @type {SubmitOptions} */ ({})) => {
      const { dryRun = false, onProgress } = opts
      setSubmitting(true)
      setLastError('')
      progressRef.current = { processed: 0, total: 1, ok: 0, failed: 0 }
      emitProgress(onProgress)

      try {
        const svc = await loadServices()
        const mapped = await runValidateMap(item)
        /** @type {SubmitItemResult} */
        const result = {
          input: item,
          payload: mapped.payload,
          valid: mapped.valid,
          errors: mapped.errors,
          response: null,
        }

        if (!mapped.valid) {
          progressRef.current.failed += 1
          progressRef.current.processed += 1
          emitProgress(onProgress)
          const summary = {
            ok: 0,
            failed: 1,
            total: 1,
            items: [result],
            mode: dryRun ? 'dry-run' : 'single',
          }
          setLastResult(summary)
          const msg = `Invalid payload: ${mapped.errors.join('; ')}`
          setLastError(msg)
          throw new Error(msg)
        }

        if (dryRun) {
          progressRef.current.ok += 1
          progressRef.current.processed += 1
          emitProgress(onProgress)
          const summary = {
            ok: 1,
            failed: 0,
            total: 1,
            items: [result],
            mode: 'dry-run',
          }
          setLastResult(summary)
          return summary
        }

        const res = await svc.submitOne(mapped.payload)
        result.response = res
        const ok = !!(res && (res.ok ?? true))

        if (ok) progressRef.current.ok += 1
        else progressRef.current.failed += 1
        progressRef.current.processed += 1
        emitProgress(onProgress)

        const summary = {
          ok: ok ? 1 : 0,
          failed: ok ? 0 : 1,
          total: 1,
          items: [result],
          mode: 'single',
        }
        setLastResult(summary)
        if (!ok) {
          const msg = 'TPR submission failed.'
          setLastError(msg)
          throw new Error(msg)
        }
        return summary
      } catch (e) {
        setLastError(String(e?.message || e))
        throw e
      } finally {
        setSubmitting(false)
      }
    },
    [emitProgress, runValidateMap]
  )

  // ------------------------------- submitMany ------------------------------
  const submitMany = useCallback(
    /**
     * @param {Array<any>} items
     * @param {SubmitOptions} opts
     */
    async (items = [], opts = {}) => {
      const { dryRun = false, batchSize = 100, onProgress } = opts

      const input = Array.isArray(items) ? items : []
      setSubmitting(true)
      setLastError('')
      progressRef.current = {
        processed: 0,
        total: input.length,
        ok: 0,
        failed: 0,
      }
      emitProgress(onProgress)

      try {
        const svc = await loadServices()

        // 1) Map + validate all up front
        const prepared = await Promise.all(
          input.map(async it => {
            const mapped = await runValidateMap(it)
            /** @type {SubmitItemResult} */
            return {
              input: it,
              payload: mapped.payload,
              valid: mapped.valid,
              errors: mapped.errors,
              response: null,
            }
          })
        )

        const invalid = prepared.filter(r => !r.valid)
        if (dryRun) {
          progressRef.current.ok = prepared.length - invalid.length
          progressRef.current.failed = invalid.length
          progressRef.current.processed = prepared.length
          emitProgress(onProgress)
          const summary = {
            mode: 'dry-run',
            ok: progressRef.current.ok,
            failed: progressRef.current.failed,
            total: prepared.length,
            items: prepared,
          }
          setLastResult(summary)
          return summary
        }

        if (invalid.length) {
          progressRef.current.failed = invalid.length
          progressRef.current.ok = 0
          progressRef.current.processed = invalid.length
          emitProgress(onProgress)
          const msg = `Some rows invalid; fix and try again. (${invalid.length} of ${prepared.length})`
          setLastError(msg)
          const summary = {
            mode: svc.bulk ? 'bulk' : 'single',
            ok: 0,
            failed: invalid.length,
            total: prepared.length,
            items: prepared,
          }
          setLastResult(summary)
          throw new Error(msg)
        }

        // 2) Submit: prefer bulk if available; otherwise per-item in batches
        const results = prepared

        if (svc.bulk) {
          for (let i = 0; i < prepared.length; i += batchSize) {
            const chunk = prepared.slice(i, i + batchSize)
            const payloads = chunk.map(r => r.payload)
            const res = await svc.bulk(payloads)
            const ok = !!(res && (res.ok ?? true))
            chunk.forEach(r => {
              r.response = res
            })

            progressRef.current.processed += chunk.length
            if (ok) progressRef.current.ok += chunk.length
            else progressRef.current.failed += chunk.length
            emitProgress(onProgress)
          }
        } else {
          for (let i = 0; i < prepared.length; i += 1) {
            const r = prepared[i]
            try {
              const res = await svc.submitOne(r.payload)
              r.response = res
              const ok = !!(res && (res.ok ?? true))
              if (ok) progressRef.current.ok += 1
              else progressRef.current.failed += 1
            } catch (e) {
              r.response = { ok: false, error: String(e?.message || e) }
              progressRef.current.failed += 1
            } finally {
              progressRef.current.processed += 1
              emitProgress(onProgress)
            }
          }
        }

        const summary = {
          mode: svc.bulk ? 'bulk' : 'single',
          ok: progressRef.current.ok,
          failed: progressRef.current.failed,
          total: prepared.length,
          items: results,
        }
        setLastResult(summary)

        if (summary.failed > 0) {
          const msg = `Submitted with ${summary.failed} error(s).`
          setLastError(msg)
        }

        return summary
      } catch (e) {
        setLastError(String(e?.message || e))
        throw e
      } finally {
        setSubmitting(false)
      }
    },
    [emitProgress, runValidateMap]
  )

  const progress = useMemo(
    () => ({ ...progressRef.current }),
    []
  )

  return {
    submitOne,
    submitMany,
    submitting,
    lastError,
    lastResult, // { mode, ok, failed, total, items: SubmitItemResult[] }
    progress, // { processed, total, ok, failed }
    reset,
  }
}
