//src/admin/walkthroughs/Editor/hooks/useWalkthroughEditorState.js
import { useMemo, useState } from 'react'
import { deepClone, ensureScriptShape, validateScript } from '../services/wtValidation.js'

export function useWalkthroughEditorState(initialScript) {
  const [script, setScript] = useState(() => ensureScriptShape(initialScript))

  const counts = useMemo(() => {
    const sections = Array.isArray(script) ? script.length : 0
    const steps = sections ? script.reduce((a, s) => a + (Array.isArray(s?.steps) ? s.steps.length : 0), 0) : 0
    return { sections, steps }
  }, [script])

  const validation = useMemo(() => validateScript(script), [script])

  // Section ops
  const addSection = () =>
    setScript(s => [...s, { section: `Section ${s.length + 1}`, steps: [{ script: '' }] }])

  const removeSection = (i) =>
    setScript(s => (s.length <= 1 ? s : s.filter((_, idx) => idx !== i)))

  const updateSectionTitle = (i, title) =>
    setScript(s => {
      const next = deepClone(s)
      next[i].section = title
      return next
    })

  const toggleSecFlag = (i, key) =>
    setScript(s => {
      const next = deepClone(s)
      next[i][key] = !next[i][key]
      return next
    })

  // Step ops
  const addStep = (si) =>
    setScript(s => {
      const next = deepClone(s)
      next[si].steps.push({ script: '' })
      return next
    })

  const removeStep = (si, ti) =>
    setScript(s => {
      const next = deepClone(s)
      if (next[si].steps.length <= 1) return next
      next[si].steps.splice(ti, 1)
      return next
    })

  const updateStepField = (si, ti, key, value) =>
    setScript(s => {
      const next = deepClone(s)
      next[si].steps[ti][key] = value
      return next
    })

  const toggleStepFlag = (si, ti, key) =>
    setScript(s => {
      const next = deepClone(s)
      next[si].steps[ti][key] = !next[si].steps[ti][key]
      if (key === 'passFail' && next[si].steps[ti].passFail) {
        next[si].steps[ti].required = true // nudge
      }
      return next
    })

  return {
    script, setScript, counts, validation,
    addSection, removeSection, updateSectionTitle, toggleSecFlag,
    addStep, removeStep, updateStepField, toggleStepFlag,
  }
}