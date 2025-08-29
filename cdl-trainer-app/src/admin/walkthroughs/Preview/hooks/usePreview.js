//src/admin/walkthroughs/Preview/hooks/usePreview.js
import { useMemo } from 'react'

import { safeDate, validateScript } from '../services/previewUtils.js'

export function usePreview(item) {
  const script = useMemo(
    () => (Array.isArray(item?.script) ? item.script : []),
    [item?.script]
  )

  const stats = useMemo(() => {
    const sections = script.length
    let steps = 0,
      required = 0,
      passFail = 0
    for (const s of script) {
      const n = Array.isArray(s?.steps) ? s.steps.length : 0
      steps += n
      if (!n) continue
      for (const st of s.steps) {
        if (st?.required) required++
        if (st?.passFail) passFail++
      }
    }
    return { sections, steps, required, passFail }
  }, [script])

  const validation = useMemo(() => validateScript(script), [script])
  const updatedDate = useMemo(
    () => safeDate(item?.updatedAt),
    [item?.updatedAt]
  )

  return { script, stats, validation, updatedDate }
}
