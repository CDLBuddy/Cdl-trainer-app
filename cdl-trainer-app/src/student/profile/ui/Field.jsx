// src/student/profile/ui/Field.jsx
import React, { forwardRef, useCallback, useId, useMemo } from 'react'

import cls from './fields.module.css'

/**
 * Generic text input / textarea with label, hint, error, adornments.
 * - Works standalone (renders its own control) OR as a wrapper around children.
 *   If you pass children, they render under the control (e.g., inline help).
 *
 * Props:
 *  - label?: string
 *  - required?: boolean
 *  - hint?: string
 *  - error?: string
 *  - as?: 'input' | 'textarea'                 (default 'input')
 *  - type?: string                              (text, date, email, tel, number, …)
 *  - value?: string
 *  - onChange?: (val: string) => void
 *  - startAdornment?: ReactNode                 (prefix)
 *  - endAdornment?: ReactNode                   (suffix)
 *  - labelVisuallyHidden?: boolean
 *  - size?: 'sm' | 'md' | 'lg'                  (visual only; default md)
 *  - className?: string
 *  - showCounter?: boolean                      (shows "x / maxLength" when maxLength provided)
 *  - onEnter?: () => void                       (fires on Enter key if not textarea)
 *  - autoSelect?: boolean                       (select contents on focus)
 *  - ariaDescribedBy?: string                   (extra id(s) to append to aria-describedby)
 *  - ariaInvalid?: boolean                      (override computed aria-invalid)
 *  - children?: React.ReactNode                 (renders below the control)
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
    ariaDescribedBy, // custom alias (sections use this)
    ariaInvalid, // custom alias (sections use this)
    children,
    ...rest
  },
  ref
) {
  const reactId = useId()
  const Cmp = as === 'textarea' ? 'textarea' : 'input'

  // Prefer caller-provided id; otherwise build a stable one from label/useId
  const baseId = useMemo(() => {
    if (rest.id) return rest.id
    const labelSlug = (label || 'field').toLowerCase().replace(/\s+/g, '_')
    return `f_${labelSlug}__${reactId.replace(/[:]/g, '')}`
  }, [rest.id, label, reactId])

  const hintId = hint ? `${baseId}_hint` : undefined
  const errId = error ? `${baseId}_err` : undefined

  // Allow callers to pass either ariaDescribedBy (camel) or native 'aria-describedby'
  const externalDescribedBy =
    [
      ariaDescribedBy,
      rest['aria-describedby'], // if someone passes the native prop explicitly
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || undefined

  const describedBy =
    [hintId, errId, externalDescribedBy].filter(Boolean).join(' ') || undefined

  const lengthCount = typeof value === 'string' ? value.length : 0
  const maxLen = typeof rest.maxLength === 'number' ? rest.maxLength : undefined

  const handleChange = useCallback(e => onChange?.(e.target.value), [onChange])

  const handleKeyDown = useCallback(
    e => {
      if (
        e.key === 'Enter' &&
        typeof onEnter === 'function' &&
        as !== 'textarea'
      ) {
        onEnter()
      }
      rest.onKeyDown?.(e)
    },
    [onEnter, rest, as]
  )

  const handleFocus = useCallback(
    e => {
      if (autoSelect && typeof e.target?.select === 'function') {
        // Slight delay to avoid interfering with browser focus paint
        setTimeout(() => e.target.select(), 0)
      }
      rest.onFocus?.(e)
    },
    [autoSelect, rest]
  )

  // Prevent accidental number scroll changes unless caller opts in via rest.onWheel
  const handleWheel = useCallback(
    e => {
      if (type === 'number' && !rest.onWheel) {
        // blur to prevent value step changes, then refocus
        e.currentTarget.blur()
        setTimeout(() => e.currentTarget?.focus?.(), 0)
      }
      rest.onWheel?.(e)
    },
    [type, rest]
  )

  const computedAriaInvalid =
    typeof ariaInvalid === 'boolean' ? ariaInvalid : !!error || undefined

  const control = (
    <Cmp
      ref={ref}
      id={baseId}
      className={`${cls.control} ${as === 'textarea' ? cls.textarea : ''}`}
      type={as === 'input' ? type : undefined}
      aria-invalid={computedAriaInvalid}
      aria-describedby={describedBy}
      required={required || undefined}
      value={value ?? ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onWheel={handleWheel}
      // provide a default rows for textarea if not given
      {...(as === 'textarea' && typeof rest.rows === 'undefined'
        ? { rows: 3 }
        : null)}
      {...rest}
    />
  )

  return (
    <div
      className={`${cls.field} ${className}`}
      // mirror invalid on wrapper for CSS outlines (sections.module.css picks this up)
      aria-invalid={computedAriaInvalid || undefined}
    >
      {label && (
        <div className={cls.labelRow}>
          <label
            className={`${cls.label} ${labelVisuallyHidden ? 'visually-hidden' : ''}`}
            htmlFor={baseId}
          >
            {label}
          </label>
          {required && (
            <span className={cls.required} aria-hidden>
              *
            </span>
          )}
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

        {control}

        {endAdornment ? (
          <span className={cls.adornmentEnd} aria-hidden>
            {endAdornment}
          </span>
        ) : null}
      </div>

      {/* Inline children (e.g., extra <small id="..."> hints) */}
      {children ? <div className={cls.inlineHelp}>{children}</div> : null}

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
  )
})

export default Field
