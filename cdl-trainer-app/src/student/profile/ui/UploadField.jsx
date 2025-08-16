// src/student/profile/ui/UploadField.jsx
// ============================================================================
// UploadField
// - Image-first (but configurable) uploader
// - Mobile camera capture (environment/user) only when it makes sense
// - Client-side guards: MIME vs `accept`, max size, optional image-only
// - Drag & drop + keyboard accessible
// - Local preview (revoked on change/unmount) + file meta
// - Non-breaking: keeps your original prop names
// ============================================================================

import React, { useEffect, useId, useMemo, useRef, useState, useCallback } from 'react'
import cls from './fields.module.css'

/**
 * @typedef UploadFieldProps
 * @prop {string=}  label
 * @prop {string=}  hint
 * @prop {string=}  accept            // default 'image/*'
 * @prop {string=}  currentUrl        // existing remote URL to preview
 * @prop {(file: File) => void=} onSelectFile
 * @prop {(err: Error) => void=} onSelectError
 * @prop {() => void=} onClear
 * @prop {string=}  previewAlt
 * @prop {'environment'|'user'|boolean=} capture
 * @prop {boolean=} disabled
 * @prop {number=} maxSizeMB          // default 10
 * @prop {boolean=} imageOnly         // default true
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
  capture, // if true → no attribute (use browser default); if 'environment'|'user' → pass on mobile
  disabled = false,
  maxSizeMB = 10,
  imageOnly = true,
}) {
  const reactId = useId()
  const id = useMemo(() => `upl_${reactId.replace(/[:]/g, '')}`, [reactId])

  const inputRef = useRef(null)
  const statusRef = useRef(null) // aria-live region

  const [localPreview, setLocalPreview] = useState(null) // object URL
  const [fileMeta, setFileMeta] = useState(null) // { name, size, type }
  const [dragOver, setDragOver] = useState(false)
  const [err, setErr] = useState(null)

  const previewUrl = localPreview || currentUrl || null

  // Best-effort user-agent mobile detection just to gate the capture attr
  const isMobile = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /android|iphone|ipad|ipod/i.test(navigator.userAgent)
  }, [])

  // Only set capture on mobile; some desktop browsers behave oddly
  const captureAttr = useMemo(() => {
    if (!isMobile) return undefined
    if (capture === 'environment' || capture === 'user') return capture
    // if capture === true or undefined → default to environment for image-first UX
    return capture === false ? undefined : 'environment'
  }, [capture, isMobile])

  const acceptList = useMemo(
    () => (accept || '*/*').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
    [accept]
  )
  const byteLimit = useMemo(() => Math.max(1, maxSizeMB) * 1024 * 1024, [maxSizeMB])

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  const announce = useCallback((msg) => {
    if (statusRef.current) statusRef.current.textContent = msg
  }, [])

  const formatMB = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`

  // Strict-ish accept check: matches exact MIME or type family when pattern is like image/*
  const mimeAllowed = useCallback((file) => {
    if (!acceptList.length || acceptList.includes('*/*')) return true
    const t = (file.type || '').toLowerCase()
    return acceptList.some(a => {
      if (a.endsWith('/*')) {
        const fam = a.slice(0, a.indexOf('/'))
        return t.startsWith(`${fam}/`)
      }
      // also allow common image extensions if accept provided as extensions
      if (a.startsWith('.')) return file.name.toLowerCase().endsWith(a)
      return t === a || (a === 'image/*' && t.startsWith('image/'))
    })
  }, [acceptList])

  const validate = useCallback((file) => {
    if (!file) return new Error('No file selected.')
    if (imageOnly && !file.type.startsWith('image/')) {
      return new Error('Please select an image file.')
    }
    if (!mimeAllowed(file)) {
      return new Error(`File type not allowed. (${file.type || 'unknown'})`)
    }
    if (file.size > byteLimit) {
      return new Error(`File is too large. Max ${maxSizeMB} MB.`)
    }
    return null
  }, [imageOnly, mimeAllowed, byteLimit, maxSizeMB])

  const setPreviewFor = useCallback((file) => {
    // New preview: revoke the old first
    if (localPreview) URL.revokeObjectURL(localPreview)
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setLocalPreview(url)
    } else {
      setLocalPreview(null)
    }
  }, [localPreview])

  const handleChosen = useCallback((file) => {
    const vErr = validate(file)
    if (vErr) {
      setErr(vErr.message)
      onSelectError?.(vErr)
      announce(vErr.message)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setErr(null)
    setPreviewFor(file)
    setFileMeta({ name: file.name, size: file.size, type: file.type })
    onSelectFile?.(file)
    announce('File selected.')
  }, [announce, onSelectError, onSelectFile, setPreviewFor, validate])

  const onFile = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) handleChosen(file)
  }, [handleChosen])

  const clearSelection = useCallback(() => {
    if (localPreview) {
      URL.revokeObjectURL(localPreview)
      setLocalPreview(null)
    }
    setFileMeta(null)
    setErr(null)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
    announce('Selection cleared.')
  }, [announce, localPreview, onClear])

  // DnD handlers
  const onDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer?.files?.[0]
    if (file) handleChosen(file)
  }, [disabled, handleChosen])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    if (disabled) return
    setDragOver(true)
  }, [disabled])

  const onDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

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
            {fileMeta || previewUrl ? 'Replace file' : '⬆ Choose file'}
          </button>
        </div>
      </div>

      {/* Hidden file input (triggered by button) */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        // Only set capture attr on mobile UAs; prevents odd desktop behavior
        {...(captureAttr ? { capture: captureAttr } : {})}
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
        <span className={cls.dropText}>Drag &amp; drop here, or click to browse</span>
      </div>

      {/* Meta + preview */}
      {(fileMeta || previewUrl) && (
        <div className={cls.preview}>
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className={cls.thumbLink}
              title="Open full image"
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img className={cls.thumb} src={previewUrl} alt={previewAlt} />
            </a>
          ) : null}
          {fileMeta ? (
            <div className={cls.fileMeta}>
              <div className={cls.fileName} title={fileMeta.name}>{fileMeta.name}</div>
              <div className={cls.fileSize} title={fileMeta.type || 'file'}>
                {formatMB(fileMeta.size)}
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
