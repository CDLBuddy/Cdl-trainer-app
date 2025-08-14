// src/student/profile/ui/Field.jsx
import React, { forwardRef, useId, useMemo, useCallback } from 'react'
import cls from './fields.module.css'

/**
 * Generic text input / textarea
 * Props:
 *  - label?: string
 *  - required?: boolean
 *  - hint?: string
 *  - error?: string
 *  - as?: 'input' | 'textarea'         (default 'input')
 *  - type?: string                      (text, date, email, tel, number, password, ...)
 *  - value?: string
 *  - onChange?: (val: string) => void
 *  - startAdornment?: ReactNode         (prefix)
 *  - endAdornment?: ReactNode           (suffix)
 *  - labelVisuallyHidden?: boolean
 *  - size?: 'sm' | 'md' | 'lg'         (visual only; default md)
 *  - className?: string
 *  - showCounter?: boolean              (shows "x / maxLength" when maxLength provided)
 *  - onEnter?: () => void               (fires on Enter key)
 *  - autoSelect?: boolean               (select contents on focus)
 *  - ...rest: any native input/textarea props (pattern, placeholder, autoComplete, etc.)
 */
const Field = forwardRef(function Field(
  {
    label,
    required = false,
    hint,
    error,
    as = 'input',
    type = 'text',
    value,
    onChange,
    startAdornment,
    endAdornment,
    labelVisuallyHidden = false,
    size = 'md',
    className = '',
    showCounter = false,
    onEnter,
    autoSelect = false,
    ...rest
  },
  ref
) {
  const reactId = useId()
  const Cmp = as === 'textarea' ? 'textarea' : 'input'

  const baseId = useMemo(() => {
    // Prefer caller-provided id; otherwise build a stable one from label/useId
    if (rest.id) return rest.id
    const labelSlug = (label || 'field').toLowerCase().replace(/\s+/g, '_')
    return `f_${labelSlug}__${reactId.replace(/[:]/g, '')}`
  }, [rest.id, label, reactId])

  const hintId = hint ? `${baseId}_hint` : undefined
  const errId = error ? `${baseId}_err` : undefined
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined

  const lengthCount = typeof value === 'string' ? value.length : 0
  const maxLen = typeof rest.maxLength === 'number' ? rest.maxLength : undefined

  const handleChange = useCallback(
    (e) => onChange?.(e.target.value),
    [onChange]
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && typeof onEnter === 'function' && as !== 'textarea') {
        onEnter()
      }
      rest.onKeyDown?.(e)
    },
    [onEnter, rest, as]
  )

  const handleFocus = useCallback(
    (e) => {
      if (autoSelect && typeof e.target?.select === 'function') {
        // Slight delay to avoid interfering with browser focus paint
        setTimeout(() => e.target.select(), 0)
      }
      rest.onFocus?.(e)
    },
    [autoSelect, rest]
  )

  return (
    <div className={`${cls.field} ${className}`} aria-invalid={!!error || undefined}>
      {label && (
        <div className={cls.labelRow}>
          <label
            className={`${cls.label} ${labelVisuallyHidden ? 'visually-hidden' : ''}`}
            htmlFor={baseId}
          >
            {label}
          </label>
          {required && <span className={cls.required} aria-hidden>*</span>}
          {showCounter && maxLen != null && (
            <span className={cls.counter} aria-live="polite">
              {lengthCount} / {maxLen}
            </span>
          )}
        </div>
      )}

      <div className={`${cls.controlWrap} ${cls[`size_${size}`] || ''}`}>
        {startAdornment ? (
          <span className={cls.adornmentStart} aria-hidden>
            {startAdornment}
          </span>
        ) : null}

        <Cmp
          ref={ref}
          id={baseId}
          className={`${cls.control} ${as === 'textarea' ? cls.textarea : ''}`}
          type={as === 'input' ? type : undefined}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          required={required || undefined}
          value={value ?? ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          {...rest}
        />

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

export default Field