// src/student/profile/ui/UploadField.jsx
import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import cls from './fields.module.css'

/**
 * UploadField
 * Props:
 *  - label?: string
 *  - hint?: string
 *  - accept?: string                 (default 'image/*')
 *  - currentUrl?: string             (existing remote URL to preview)
 *  - onSelectFile?: (file: File) => void
 *  - onSelectError?: (err: Error) => void
 *  - onClear?: () => void
 *  - previewAlt?: string             (alt text for preview image)
 *  - capture?: 'environment' | 'user' | boolean   (mobile camera hint)
 *  - disabled?: boolean
 *  - maxSizeMB?: number              (soft limit; shows error if exceeded)
 *  - imageOnly?: boolean             (if true, rejects non-image files)
 */
export default function UploadField({
  label = 'Upload',
  hint,
  accept = 'image/*',
  currentUrl,
  onSelectFile,
  onSelectError,
  onClear,
  previewAlt = 'Uploaded image',
  capture,
  disabled = false,
  maxSizeMB = 10,
  imageOnly = true,
}) {
  const reactId = useId()
  const id = useMemo(() => `upl_${reactId.replace(/[:]/g, '')}`, [reactId])

  const inputRef = useRef(null)
  const [localPreview, setLocalPreview] = useState(null)
  const [fileMeta, setFileMeta] = useState(null) // { name, size }
  const [dragOver, setDragOver] = useState(false)
  const [err, setErr] = useState(null)
  const statusRef = useRef(null) // aria-live

  const previewUrl = localPreview || currentUrl || null

  // Revoke object URL on unmount / when preview changes
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  function announce(msg) {
    if (statusRef.current) {
      statusRef.current.textContent = msg
    }
  }

  function validate(file) {
    if (!file) return null
    if (imageOnly && !file.type.startsWith('image/')) {
      return new Error('Please select an image file.')
    }
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      return new Error(`File is too large. Max ${maxSizeMB}MB.`)
    }
    return null
  }

  function handleChosen(file) {
    const vErr = validate(file)
    if (vErr) {
      setErr(vErr.message)
      onSelectError?.(vErr)
      announce(vErr.message)
      // reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setErr(null)
    // show local preview if image
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      // revoke old
      if (localPreview) URL.revokeObjectURL(localPreview)
      setLocalPreview(url)
    } else {
      setLocalPreview(null)
    }
    setFileMeta({ name: file.name, size: file.size })
    onSelectFile?.(file)
    announce('File selected.')
  }

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    handleChosen(file)
  }

  function clearSelection() {
    if (localPreview) {
      URL.revokeObjectURL(localPreview)
      setLocalPreview(null)
    }
    setFileMeta(null)
    setErr(null)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
    announce('Selection cleared.')
  }

  // Drag & drop
  function onDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer?.files?.[0]
    if (file) handleChosen(file)
  }
  function onDragOver(e) {
    e.preventDefault()
    if (disabled) return
    setDragOver(true)
  }
  function onDragLeave(e) {
    e.preventDefault()
    setDragOver(false)
  }

  return (
    <div className={cls.field} aria-disabled={disabled || undefined}>
      <div className={cls.labelRow}>
        <label className={cls.label} htmlFor={id}>{label}</label>

        <div className={cls.actionsRow}>
          {fileMeta ? (
            <button
              type="button"
              className={`${cls.uploadBtn} ${cls.smallBtn}`}
              onClick={clearSelection}
              disabled={disabled}
            >
              ✕ Clear
            </button>
          ) : null}
          <button
            type="button"
            className={cls.uploadBtn}
            onClick={() => inputRef.current?.click()}
            aria-describedby={hint ? `${id}_hint` : undefined}
            disabled={disabled}
          >
            ⬆ Choose file
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        capture={capture === true ? undefined : capture}
        style={{ display: 'none' }}
        onChange={onFile}
        disabled={disabled}
      />

      {/* Drop zone */}
      <div
        className={`${cls.dropZone} ${dragOver ? cls.dropOver : ''} ${disabled ? cls.dropDisabled : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        aria-label={`${label}: drag and drop or press Enter to choose a file`}
      >
        <span className={cls.dropIcon} aria-hidden>📎</span>
        <span className={cls.dropText}>
          Drag & drop here, or click to browse
        </span>
      </div>

      {/* Meta + preview */}
      {(fileMeta || previewUrl) && (
        <div className={cls.preview}>
          {previewUrl ? (
            <img className={cls.thumb} src={previewUrl} alt={previewAlt} />
          ) : null}
          {fileMeta ? (
            <div className={cls.fileMeta}>
              <div className={cls.fileName} title={fileMeta.name}>{fileMeta.name}</div>
              <div className={cls.fileSize}>
                {(fileMeta.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Hints + errors */}
      {hint && <div id={`${id}_hint`} className={cls.hint}>{hint}</div>}
      {err && <div className={cls.error} role="alert">{err}</div>}

      {/* SR-only status for live updates */}
      <div ref={statusRef} aria-live="polite" className="visually-hidden" />
    </div>
  )
}