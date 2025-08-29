// Path: /src/admin/walkthroughs/Editor/WalkthroughEditor.jsx
import React, { useCallback, useRef, useState, useEffect } from 'react'

import { EditorTabs, SectionCard } from './components'
import { useWalkthroughEditorState, useWalkthroughParsers } from './hooks'
import { deepClone } from './services/wtValidation.js'
import cls from './WalkthroughEditor.module.css'

export default function WalkthroughEditor({
  initialScript,
  onSave,
  onCancel,
  parseXlsx,
}) {
  const {
    script,
    setScript,
    counts,
    validation,
    addSection,
    removeSection,
    updateSectionTitle,
    toggleSecFlag,
    addStep,
    removeStep,
    updateStepField,
    toggleStepFlag,
  } = useWalkthroughEditorState(initialScript)

  const [activeTab, setActiveTab] = useState('visual') // 'visual' | 'markdown' | 'csv' | 'upload' | 'json'
  const [errors, setErrors] = useState([])
  const topRef = useRef(null)
  const scrollTop = useCallback(() => {
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [])

  const { parseFromMarkdown, parseFromCsv, parseFromJson, handleXlsxFile } =
    useWalkthroughParsers({
      setScript,
      setActiveTab,
      setErrors,
      scrollTop,
      parseXlsx,
    })

  const handleSave = useCallback(
    (source = 'visual') => {
      const { problems } = validation
      if (problems.length) {
        setErrors(problems)
        return
      }
      onSave?.({ script: deepClone(script), source })
    },
    [onSave, script, validation]
  )

  // Cmd/Ctrl+S quick save
  useEffect(() => {
    const h = e => {
      const k = e.key?.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && k === 's') {
        e.preventDefault()
        handleSave(activeTab)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [activeTab, handleSave])

  return (
    <div ref={topRef} className={cls.container}>
      <header className={cls.header}>
        <h2 className={cls.title}>Walkthrough Editor</h2>
        <div className={cls.meta}>
          {counts.sections} sections • {counts.steps} steps
        </div>
      </header>

      <EditorTabs active={activeTab} onChange={setActiveTab} />

      {!validation.ok && activeTab === 'visual' && (
        <div className={`${cls.alert} ${cls.alertError}`} role="alert">
          <strong>Fix before saving:</strong>
          <ul>
            {validation.problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {errors.length > 0 && (
        <div className={`${cls.alert} ${cls.alertWarn}`} role="status">
          <strong>Parser / Editor messages:</strong>
          <ul>
            {errors.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'visual' && (
        <div className={cls.panel}>
          {script.map((sec, si) => (
            <SectionCard
              key={si}
              index={si}
              section={sec}
              canRemove={script.length > 1}
              onTitle={updateSectionTitle}
              onToggle={toggleSecFlag}
              onRemove={removeSection}
              onAddStep={addStep}
              onChangeStep={updateStepField}
              onToggleStep={toggleStepFlag}
              onRemoveStep={removeStep}
            />
          ))}

          <div className={cls.toolbar}>
            <button type="button" className={cls.btn} onClick={addSection}>
              + Add Section
            </button>
            <div className={cls.spacer} />
            <button
              type="button"
              className={`${cls.btn} ${cls.btnPrimary}`}
              onClick={() => handleSave('visual')}
              disabled={!validation.ok}
            >
              Save Walkthrough
            </button>
            {onCancel && (
              <button type="button" className={cls.btn} onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'markdown' && (
        <div className={cls.panel}>
          <p className={cls.help}>
            Paste <b>Markdown</b> (## Section headings, - steps, flags like
            [must] [required] [pf] [skip]).
          </p>
          <textarea
            id="wt-md-input"
            rows={16}
            className={cls.bigInput}
            placeholder="## Engine Compartment\n- **Oil Level:** Check dipstick… [must] [required] [pf]"
          />
          <div className={cls.toolbar}>
            <button className={cls.btn} onClick={parseFromMarkdown}>
              Parse Markdown → Visual
            </button>
            <div className={cls.spacer} />
            <button
              className={`${cls.btn} ${cls.btnPrimary}`}
              onClick={() => handleSave('markdown')}
            >
              Save (uses current Visual)
            </button>
          </div>
        </div>
      )}

      {activeTab === 'csv' && (
        <div className={cls.panel}>
          <p className={cls.help}>
            Paste <b>CSV</b> with headers: section, stepLabel, script, mustSay,
            required, passFail, skip.
          </p>
          <textarea
            id="wt-csv-input"
            rows={16}
            className={cls.bigInput}
            placeholder="section,stepLabel,script,mustSay,required,passFail\nEngine,Oil Level,Check dipstick…,true,true,true"
          />
          <div className={cls.toolbar}>
            <button className={cls.btn} onClick={parseFromCsv}>
              Parse CSV → Visual
            </button>
            <div className={cls.spacer} />
            <button
              className={`${cls.btn} ${cls.btnPrimary}`}
              onClick={() => handleSave('csv')}
            >
              Save (uses current Visual)
            </button>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className={cls.panel}>
          <p className={cls.help}>
            Upload <b>.xlsx</b> (same columns as CSV).
          </p>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={async e => {
              const f = e.target.files?.[0]
              if (f) await handleXlsxFile(f)
            }}
          />
          <div className={cls.toolbar}>
            <div className={cls.spacer} />
            <button
              className={`${cls.btn} ${cls.btnPrimary}`}
              onClick={() => handleSave('xlsx')}
            >
              Save (uses current Visual)
            </button>
          </div>
        </div>
      )}

      {activeTab === 'json' && (
        <div className={cls.panel}>
          <p className={cls.help}>
            Paste <b>JSON</b> (either a bare <code>WalkthroughScript</code>{' '}
            array or <code>{'{'}`sections:[...]`{"}"}</code>).
          </p>
          <textarea
            id="wt-json-input"
            rows={16}
            className={cls.bigInput}
            placeholder='[{"section":"Engine Compartment","steps":[{"label":"Oil Level","script":"..."}]}]'
          />
          <div className={cls.toolbar}>
            <button className={cls.btn} onClick={parseFromJson}>
              Parse JSON → Visual
            </button>
            <div className={cls.spacer} />
            <button
              className={`${cls.btn} ${cls.btnPrimary}`}
              onClick={() => handleSave('json')}
            >
              Save (uses current Visual)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
