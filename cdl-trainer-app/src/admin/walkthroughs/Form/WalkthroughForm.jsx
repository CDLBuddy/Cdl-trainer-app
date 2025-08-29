// Path: /src/admin/walkthroughs/Form/WalkthroughForm.jsx

import React, { useCallback, useEffect } from 'react'

import { Card, Btn } from './components'
import { useWalkthroughFormState } from './hooks'
import cls from './WalkthroughForm.module.css'

export default function WalkthroughForm({
  initialScript,
  onChange,
  onSubmit,
  onCancel,
}) {
  const {
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
  } = useWalkthroughFormState({ initialScript, onChange })

  // ⌘/Ctrl + S submits
  const doSubmit = useCallback(() => {
    setTouched(true)
    if (!validation.ok) {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    onSubmit?.(
      structuredClone
        ? structuredClone(script)
        : JSON.parse(JSON.stringify(script))
    )
  }, [script, validation.ok, onSubmit, setTouched, topRef])

  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 's') {
        e.preventDefault()
        doSubmit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [doSubmit])

  return (
    <form
      ref={topRef}
      onSubmit={e => {
        e.preventDefault()
        doSubmit()
      }}
      className={cls.container}
      aria-labelledby="wt-form-title"
    >
      <h2 id="wt-form-title" className={cls.title}>
        Walkthrough Form
      </h2>
      <div className={cls.meta}>
        {counts.sections} sections • {counts.steps} steps
      </div>

      {!validation.ok && touched && (
        <Card
          role="alert"
          aria-live="polite"
          style={{ background: '#fff3f3', borderColor: '#f0c2c2' }}
        >
          <strong>Fix the following:</strong>
          <ul style={{ margin: '8px 0 0 18px' }}>
            {validation.problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 16, marginTop: 12 }}>
        {script.map((sec, si) => (
          <Card key={si}>
            {/* Section header */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                aria-label={`Section ${si + 1} title`}
                value={sec.section}
                onChange={e => {
                  setTouched(true)
                  setSectionTitle(si, e.target.value)
                }}
                placeholder="Section title"
                style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 6,
                  border: '1px solid #ccc',
                }}
              />
              <div style={{ display: 'flex', gap: 12, marginLeft: 6 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!sec.critical}
                    onChange={() => {
                      setTouched(true)
                      toggleSectionFlag(si, 'critical')
                    }}
                  />{' '}
                  Critical
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!!sec.passFail}
                    onChange={() => {
                      setTouched(true)
                      toggleSectionFlag(si, 'passFail')
                    }}
                  />{' '}
                  Pass/Fail
                </label>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <Btn
                  onClick={() => moveSection(si, -1)}
                  title="Move up"
                  aria-label="Move section up"
                >
                  ↑
                </Btn>
                <Btn
                  onClick={() => moveSection(si, +1)}
                  title="Move down"
                  aria-label="Move section down"
                >
                  ↓
                </Btn>
                <Btn
                  onClick={() => removeSection(si)}
                  title="Remove section"
                  aria-label="Remove section"
                  disabled={script.length <= 1}
                >
                  Remove
                </Btn>
              </div>
            </div>

            {/* Steps */}
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              {sec.steps.map((st, ti) => (
                <Card key={ti} style={{ borderStyle: 'dashed' }}>
                  <div
                    style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                  >
                    <input
                      aria-label={`Section ${si + 1} step ${ti + 1} label`}
                      value={st.label || ''}
                      onChange={e => {
                        setTouched(true)
                        setStepField(si, ti, 'label', e.target.value)
                      }}
                      placeholder="Step label (optional)"
                      style={{
                        flex: 1,
                        padding: 8,
                        borderRadius: 6,
                        border: '1px solid #ccc',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn
                        onClick={() => moveStep(si, ti, -1)}
                        title="Move up"
                        aria-label="Move step up"
                      >
                        ↑
                      </Btn>
                      <Btn
                        onClick={() => moveStep(si, ti, +1)}
                        title="Move down"
                        aria-label="Move step down"
                      >
                        ↓
                      </Btn>
                      <Btn
                        onClick={() => removeStep(si, ti)}
                        title="Remove step"
                        aria-label="Remove step"
                        disabled={sec.steps.length <= 1}
                      >
                        Remove
                      </Btn>
                    </div>
                  </div>

                  <textarea
                    aria-label={`Section ${si + 1} step ${ti + 1} script`}
                    value={st.script}
                    onChange={e => {
                      setTouched(true)
                      setStepField(si, ti, 'script', e.target.value)
                    }}
                    placeholder="Script text…"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 8,
                      borderRadius: 6,
                      border: '1px solid #ccc',
                      marginTop: 8,
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}
                  />

                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      flexWrap: 'wrap',
                      marginTop: 6,
                    }}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={!!st.mustSay}
                        onChange={() => {
                          setTouched(true)
                          toggleStepFlag(si, ti, 'mustSay')
                        }}
                      />{' '}
                      mustSay
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!st.required}
                        onChange={() => {
                          setTouched(true)
                          toggleStepFlag(si, ti, 'required')
                        }}
                      />{' '}
                      required
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!st.passFail}
                        onChange={() => {
                          setTouched(true)
                          toggleStepFlag(si, ti, 'passFail')
                        }}
                      />{' '}
                      passFail
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!st.skip}
                        onChange={() => {
                          setTouched(true)
                          toggleStepFlag(si, ti, 'skip')
                        }}
                      />{' '}
                      skip
                    </label>
                  </div>
                </Card>
              ))}

              <Btn
                onClick={() => {
                  setTouched(true)
                  addStep(si)
                }}
              >
                + Add Step
              </Btn>
            </div>
          </Card>
        ))}

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn
            onClick={() => {
              setTouched(true)
              addSection()
            }}
          >
            + Add Section
          </Btn>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {onCancel && <Btn onClick={onCancel}>Cancel</Btn>}
            <Btn
              variant="primary"
              onClick={doSubmit}
              aria-disabled={!validation.ok}
            >
              Save Walkthrough
            </Btn>
          </div>
        </div>
      </div>
    </form>
  )
}
