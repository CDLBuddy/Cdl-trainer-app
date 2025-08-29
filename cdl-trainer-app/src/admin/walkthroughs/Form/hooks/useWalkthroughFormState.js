//src/admin/walkthroughs/Form/hooks/useWalkthroughFormState.js
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  deepClone as dc,
  ensureScriptShape,
  validateScript,
} from '../services/wtValidation.js'

export function useWalkthroughFormState({ initialScript, onChange }) {
  const [script, setScript] = useState(() => ensureScriptShape(initialScript))
  const [touched, setTouched] = useState(false)
  const topRef = useRef(null)

  // sync if parent feeds new initial
  useEffect(() => {
    setScript(ensureScriptShape(initialScript))
  }, [initialScript])

  // bubble up after first edit
  useEffect(() => {
    if (touched) onChange?.(script)
  }, [script, touched, onChange])

  const validation = useMemo(() => validateScript(script), [script])
  const counts = useMemo(() => {
    const sections = Array.isArray(script) ? script.length : 0
    const steps = sections
      ? script.reduce(
          (a, s) => a + (Array.isArray(s?.steps) ? s.steps.length : 0),
          0
        )
      : 0
    return { sections, steps }
  }, [script])

  // section ops
  const addSection = () =>
    setScript(s => [
      ...s,
      { section: `Section ${s.length + 1}`, steps: [{ script: '' }] },
    ])
  const removeSection = i =>
    setScript(s => (s.length <= 1 ? s : s.filter((_, idx) => idx !== i)))
  const moveSection = (i, dir) =>
    setScript(s => {
      const next = dc(s)
      const j = i + dir
      if (j < 0 || j >= next.length) return s
      const [row] = next.splice(i, 1)
      next.splice(j, 0, row)
      return next
    })
  const setSectionTitle = (i, title) =>
    setScript(s => {
      const n = dc(s)
      n[i].section = title
      return n
    })
  const toggleSectionFlag = (i, key) =>
    setScript(s => {
      const n = dc(s)
      n[i][key] = !n[i][key]
      return n
    })

  // step ops
  const addStep = si =>
    setScript(s => {
      const n = dc(s)
      n[si].steps.push({ script: '' })
      return n
    })
  const removeStep = (si, ti) =>
    setScript(s => {
      const n = dc(s)
      if (n[si].steps.length <= 1) return s
      n[si].steps.splice(ti, 1)
      return n
    })
  const moveStep = (si, ti, dir) =>
    setScript(s => {
      const n = dc(s)
      const j = ti + dir
      if (j < 0 || j >= n[si].steps.length) return s
      const [row] = n[si].steps.splice(ti, 1)
      n[si].steps.splice(j, 0, row)
      return n
    })
  const setStepField = (si, ti, key, value) =>
    setScript(s => {
      const n = dc(s)
      n[si].steps[ti][key] = value
      return n
    })
  const toggleStepFlag = (si, ti, key) =>
    setScript(s => {
      const n = dc(s)
      const st = n[si].steps[ti]
      st[key] = !st[key]
      if (key === 'passFail' && st.passFail) st.required = true
      return n
    })

  return {
    script,
    setScript,
    touched,
    setTouched,
    topRef,
    validation,
    counts,
    addSection,
    removeSection,
    moveSection,
    setSectionTitle,
    toggleSectionFlag,
    addStep,
    removeStep,
    moveStep,
    setStepField,
    toggleStepFlag,
  }
}
