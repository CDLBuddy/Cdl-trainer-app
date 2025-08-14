// src/student/profile/ui/CheckboxGroup.jsx
import React from 'react'

import cls from './fields.module.css'

/**
 * CheckboxGroup
 * Props:
 *  - label?: string
 *  - hint?: string
 *  - options: Array<{ value: string, label: string, disabled?: boolean }>
 *  - values: string[]                    // controlled
 *  - onToggle?: (value: string) => void  // legacy toggle callback
 *  - onChange?: (next: string[]) => void // optional: full array change callback
 *  - name?: string                       // shared name for inputs (a11y/analytics)
 *  - required?: boolean                  // marks group as required (a11y)
 *  - disabled?: boolean                  // disables the whole group
 *  - error?: string                      // error message, renders under hint
 *  - layout?: 'row' | 'column'           // default: 'row'
 */
export default function CheckboxGroup({
  label,
  hint,
  options = [],
  values = [],
  onToggle,
  onChange,
  name,
  required = false,
  disabled = false,
  error = '',
  layout = 'row',
}) {
  const safeValues = Array.isArray(values) ? values : []
  const base = (label || name || 'group').toLowerCase().replace(/\s+/g, '_')
  const groupId = `cg_${base}`
  const hintId = hint ? `${groupId}_hint` : undefined
  const errId = error ? `${groupId}_err` : undefined
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined

  function toggle(value) {
    const set = new Set(safeValues)
    set.has(value) ? set.delete(value) : set.add(value)
    const next = Array.from(set)
    if (typeof onChange === 'function') onChange(next)
    else onToggle?.(value)
  }

  return (
    <fieldset
      className={cls.field}
      aria-invalid={error ? true : undefined}   // global state prop is valid here
      aria-describedby={describedBy}
      disabled={disabled || undefined}          // disables all controls inside
    >
      {/* Legend serves as the accessible group label */}
      {label && (
        <legend className={cls.label}>
          {label}{' '}
          {required && (
            <>
              <span className={cls.required} aria-hidden>*</span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </legend>
      )}

      <div className={`${cls.group} ${layout === 'row' ? cls.groupRow : cls.groupCol}`}>
        {options.map((opt, i) => {
          const id = `${groupId}_${i}`
          const checked = safeValues.includes(opt.value)
          const optDisabled = disabled || !!opt.disabled
          return (
            <label key={id} className={cls.check} htmlFor={id}>
              <input
                id={id}
                type="checkbox"
                name={name}
                checked={checked}
                disabled={optDisabled}
                onChange={() => toggle(opt.value)}
                // NOTE: HTML doesn't support "required" on a group of checkboxes;
                // enforce “at least one” in your form validation and surface via `error`.
              />
              <span>{opt.label}</span>
            </label>
          )
        })}
      </div>

      {(hint || error) && (
        <div className={cls.hintBlock}>
          {hint && (
            <div id={hintId} className={cls.hint}>
              {hint}
            </div>
          )}
          {error && (
            <div id={errId} className={cls.error}>
              {error}
            </div>
          )}
        </div>
      )}
    </fieldset>
  )
}
