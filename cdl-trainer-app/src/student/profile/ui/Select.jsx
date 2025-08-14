// src/student/profile/ui/Select.jsx
import React, { forwardRef, useId, useMemo } from 'react'

import cls from './fields.module.css'

/**
 * Native <select/> with deluxe ergonomics
 *
 * Props:
 *  - label?: string
 *  - required?: boolean
 *  - hint?: string
 *  - error?: string
 *  - options?: Array<{ value: string, label: string, disabled?: boolean }>
 *    (You can alternatively pass <option> children; `options` wins if both provided)
 *  - value?: string
 *  - onChange?: (val: string) => void
 *  - placeholder?: string        // renders a disabled hidden option when value === ''
 *  - startAdornment?: ReactNode  // prefix inside controlWrap
 *  - endAdornment?: ReactNode    // suffix inside controlWrap
 *  - labelVisuallyHidden?: boolean
 *  - size?: 'sm' | 'md' | 'lg'   // visual only
 *  - className?: string
 *  - ...rest: native select props (name, disabled, autoFocus, etc.)
 */
const Select = forwardRef(function Select(
  {
    label,
    required = false,
    hint,
    error,
    options = [],
    value,
    onChange,
    placeholder,
    startAdornment,
    endAdornment,
    labelVisuallyHidden = false,
    size = 'md',
    className = '',
    children,
    ...rest
  },
  ref
) {
  const reactId = useId()

  const id = useMemo(() => {
    if (rest.id) return rest.id
    const slug = (label || 'select').toLowerCase().replace(/\s+/g, '_')
    return `s_${slug}__${reactId.replace(/[:]/g, '')}`
  }, [rest.id, label, reactId])

  const hintId = hint ? `${id}_hint` : undefined
  const errId = error ? `${id}_err` : undefined
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined

  const hasOptionsArray = Array.isArray(options) && options.length > 0
  const showPlaceholder = placeholder && (value ?? '') === ''

  return (
    <div className={`${cls.field} ${className}`} aria-invalid={!!error || undefined}>
      {label && (
        <div className={cls.labelRow}>
          <label
            className={`${cls.label} ${labelVisuallyHidden ? 'visually-hidden' : ''}`}
            htmlFor={id}
          >
            {label}
          </label>
          {required && <span className={cls.required} aria-hidden>*</span>}
        </div>
      )}

      <div className={`${cls.controlWrap} ${cls.selectWrap} ${cls[`size_${size}`] || ''}`}>
        {startAdornment ? (
          <span className={cls.adornmentStart} aria-hidden>
            {startAdornment}
          </span>
        ) : null}

        <select
          ref={ref}
          id={id}
          className={`${cls.control} ${cls.select}`}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          required={required || undefined}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          {...rest}
        >
          {showPlaceholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}

          {hasOptionsArray
            ? options.map((opt) => (
                <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        {endAdornment ? (
          <span className={cls.adornmentEnd} aria-hidden>
            {endAdornment}
          </span>
        ) : null}
      </div>

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
  )
})

export default Select