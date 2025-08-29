//src/admin/walkthroughs/Editor/components/StepRow.jsx
import React from 'react'

import cls from '../WalkthroughEditor.module.css'

export default function StepRow({ si, ti, step, onChange, onToggle, onRemove }) {
  return (
    <div className={cls.step}>
      <div className={cls.row}>
        <input
          className={cls.input}
          aria-label={`Section ${si + 1} step ${ti + 1} label`}
          value={step.label || ''}
          onChange={(e) => onChange(si, ti, 'label', e.target.value)}
          placeholder="Step label (optional)"
        />
        <button type="button" className={cls.btn} onClick={() => onRemove(si, ti)} title="Remove step">
          Remove
        </button>
      </div>

      <textarea
        className={`${cls.input} ${cls.textarea}`}
        aria-label={`Section ${si + 1} step ${ti + 1} script`}
        value={step.script}
        onChange={(e) => onChange(si, ti, 'script', e.target.value)}
        rows={3}
        placeholder="Script text…"
      />

      <div className={cls.checks}>
        <label><input type="checkbox" checked={!!step.mustSay}  onChange={() => onToggle(si, ti, 'mustSay')}  /> mustSay</label>
        <label><input type="checkbox" checked={!!step.required} onChange={() => onToggle(si, ti, 'required')} /> required</label>
        <label><input type="checkbox" checked={!!step.passFail} onChange={() => onToggle(si, ti, 'passFail')} /> passFail</label>
        <label><input type="checkbox" checked={!!step.skip}     onChange={() => onToggle(si, ti, 'skip')}     /> skip</label>
      </div>
    </div>
  )
}