//src/admin/walkthroughs/Editor/components/SectionCard.jsx
import React from 'react'
import StepRow from './StepRow.jsx'
import cls from '../WalkthroughEditor.module.css'

export default function SectionCard({
  index,
  section,
  canRemove,
  onTitle,
  onToggle,
  onRemove,
  onAddStep,
  onChangeStep,
  onToggleStep,
  onRemoveStep,
}) {
  const si = index
  return (
    <div className={cls.section}>
      <div className={cls.sectionHeader}>
        <input
          className={cls.input}
          aria-label={`Section ${si + 1} title`}
          value={section.section}
          onChange={(e) => onTitle(si, e.target.value)}
          placeholder="Section title"
        />

        <label className={cls.flag}>
          <input type="checkbox" checked={!!section.critical} onChange={() => onToggle(si, 'critical')} /> Critical
        </label>
        <label className={cls.flag}>
          <input type="checkbox" checked={!!section.passFail} onChange={() => onToggle(si, 'passFail')} /> Pass/Fail
        </label>

        <button type="button" className={cls.btn} onClick={() => onRemove(si)} disabled={!canRemove}>
          Remove
        </button>
      </div>

      <div className={cls.stepList}>
        {section.steps.map((st, ti) => (
          <StepRow
            key={ti}
            si={si}
            ti={ti}
            step={st}
            onChange={onChangeStep}
            onToggle={onToggleStep}
            onRemove={onRemoveStep}
          />
        ))}
      </div>

      <div className={cls.toolbar}>
        <button type="button" className={cls.btn} onClick={() => onAddStep(si)}>+ Add Step</button>
      </div>
    </div>
  )
}