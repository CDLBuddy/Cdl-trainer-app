// src/student/profile/ui/CheckboxGroup.jsx
import React, { useCallback, useId, useMemo } from 'react'
import cls from './fields.module.css'

/**
 * CheckboxGroup
 * Props:
 *  - label?: string
 *  - hint?: string
 *  - options: Array<{ value: string, label: string, disabled?: boolean }>
 *  - values: string[]                    // controlled
 *  - onToggle?: (value: string) => void  // legacy toggle callback (still supported)
 *  - onChange?: (next: string[]) => void // preferred: full array change callback
 *  - name?: string                       // shared name for inputs (a11y/analytics)
 *  - required?: boolean                  // marks group as required (a11y hint)
 *  - disabled?: boolean                  // disables the whole group
 *  - readOnly?: boolean                  // ignores interaction but does not gray out
 *  - error?: string                      // error message, renders under hint
 *  - layout?: 'row' | 'column'           // default: 'row'
 *  - className?: string                  // extra wrapper classes
 *  - 'data-testid'?: string
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
  readOnly = false,
  error = '',
  layout = 'row',
  className = '',
  ...rest
}) {
  const uid = useId()

  const safeValues = useMemo(
    () => (Array.isArray(values) ? values : []),
    [values]
  )

  // Build a stable id prefix & quick index lookup to keep selection order stable
  const { groupId, hintId, errId, describedBy, optIndex } = useMemo(() => {
    const base =
      (label || name || 'group').toLowerCase().replace(/\s+/g, '_') || 'group'
    const groupId = `cg_${base}__${uid.replace(/[:]/g, '')}`
    const hintId = hint ? `${groupId}_hint` : undefined
    const errId = error ? `${groupId}_err` : undefined
    const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined
    const optIndex = new Map(options.map((o, i) => [o.value, i]))
    return { groupId, hintId, errId, describedBy, optIndex }
  }, [hint, error, label, name, options, uid])

  // Compose next selection (ordered by original options order)
  const computeNext = useCallback(
    (toggledValue) => {
      const set = new Set(safeValues)
      set.has(toggledValue) ? set.delete(toggledValue) : set.add(toggledValue)
      const next = Array.from(set)
      // Sort by original options order for deterministic UI/state
      next.sort((a, b) => (optIndex.get(a) ?? 1e9) - (optIndex.get(b) ?? 1e9))
      return next
    },
    [safeValues, optIndex]
  )

  const handleToggle = useCallback(
    (value) => {
      if (disabled || readOnly) return
      const next = computeNext(value)
      if (typeof onChange === 'function') onChange(next)
      else onToggle?.(value) // legacy fallback
    },
    [computeNext, disabled, readOnly, onChange, onToggle]
  )

  // For column layout we keep using the existing .groupRow class,
  // but override direction with inline style to avoid new CSS dependencies.
  const rowLike = layout === 'row'
  const groupLayoutClass = `${cls.group} ${cls.groupRow}`
  const groupLayoutStyle = rowLike
    ? undefined
    : { flexDirection: 'column', alignItems: 'stretch' }

  return (
    <fieldset
      className={`${cls.field} ${className}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      aria-required={required || undefined}
      disabled={disabled || undefined}
      {...rest}
    >
      {/* Legend serves as the accessible group label */}
      {label && (
        <legend className={cls.label}>
          {label}{' '}
          {required && (
            <>
              <span className={cls.required} aria-hidden>*</span>
              <span className="visually-hidden"> (required)</span>
            </>
          )}
        </legend>
      )}

      <div className={groupLayoutClass} style={groupLayoutStyle}>
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
                onChange={() => handleToggle(opt.value)}
                // HTML has no group-level "required"; handle “at least one” in form validation.
              />
              <span>{opt.label}</span>
            </label>
          )
        })}
      </div>

      {(hint || error) && (
        <div>
          {hint && (
            <div id={hintId} className={cls.hint}>
              {hint}
            </div>
          )}
          {error && (
            <div id={errId} className={cls.error} role="alert">
              {error}
            </div>
          )}
        </div>
      )}
    </fieldset>
  )
}