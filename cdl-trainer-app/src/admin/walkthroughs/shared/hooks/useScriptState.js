//src/admin/walkthroughs/shared/hooks/useScriptState.js
// Generic, shared script state hook (immutable updates + helpers)
import { useCallback, useMemo, useState } from 'react'
import { deepClone, ensureScriptShape, validateScript, countScript } from '../services'

export function useScriptState(initial) {
  const [script, setScript] = useState(() => ensureScriptShape(initial))
  const counts = useMemo(() => countScript(script), [script])
  const validation = useMemo(() => validateScript(script), [script])

  // ----- section ops
  const addSection = useCallback(() => {
    setScript((s) => [...s, { section: `Section ${s.length + 1}`, steps: [{ script: '' }] }])
  }, [])

  const removeSection = useCallback((i) => {
    setScript((s) => (s.length <= 1 ? s : s.filter((_, idx) => idx !== i)))
  }, [])

  const moveSection = useCallback((i, dir) => {
    setScript((s) => {
      const next = deepClone(s); const j = i + dir
      if (j < 0 || j >= next.length) return s
      const [row] = next.splice(i, 1); next.splice(j, 0, row)
      return next
    })
  }, [])

  const updateSectionTitle = useCallback((i, title) => {
    setScript((s) => { const next = deepClone(s); next[i].section = title; return next })
  }, [])

  const toggleSecFlag = useCallback((i, key) => {
    setScript((s) => { const next = deepClone(s); next[i][key] = !next[i][key]; return next })
  }, [])

  // ----- step ops
  const addStep = useCallback((si) => {
    setScript((s) => { const next = deepClone(s); next[si].steps.push({ script: '' }); return next })
  }, [])

  const removeStep = useCallback((si, ti) => {
    setScript((s) => {
      const next = deepClone(s)
      if (next[si].steps.length <= 1) return s
      next[si].steps.splice(ti, 1); return next
    })
  }, [])

  const moveStep = useCallback((si, ti, dir) => {
    setScript((s) => {
      const next = deepClone(s); const j = ti + dir
      if (j < 0 || j >= next[si].steps.length) return s
      const [row] = next[si].steps.splice(ti, 1); next[si].steps.splice(j, 0, row)
      return next
    })
  }, [])

  const updateStepField = useCallback((si, ti, key, value) => {
    setScript((s) => { const next = deepClone(s); next[si].steps[ti][key] = value; return next })
  }, [])

  const toggleStepFlag = useCallback((si, ti, key) => {
    setScript((s) => {
      const next = deepClone(s); const st = next[si].steps[ti]
      st[key] = !st[key]
      if (key === 'passFail' && st.passFail) st.required = true
      return next
    })
  }, [])

  return {
    // data
    script, setScript,
    counts, validation,
    // section
    addSection, removeSection, moveSection, updateSectionTitle, toggleSecFlag,
    // step
    addStep, removeStep, moveStep, updateStepField, toggleStepFlag,
  }
}