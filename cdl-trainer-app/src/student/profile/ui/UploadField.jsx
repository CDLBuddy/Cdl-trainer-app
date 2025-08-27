// src/student/profile/ui/UploadField.jsx
// ============================================================================
// UploadField
// - Image-first (but configurable) uploader
// - Mobile camera capture (environment/user) only when it makes sense
// - Client-side guards: MIME vs `accept`, max size, optional image-only
// - Drag & drop + keyboard accessible + paste-to-upload
// - Local preview (revoked on change/unmount) + file meta
// - Non-breaking: keeps your original prop names
// - Extras: `id?`, `multiple?` (first file wins), `aria-disabled`, SR-only without globals
// ============================================================================

import React, {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react'

import cls from './fields.module.css'

// Local SR-only style (no dependency on global "visually-hidden")
const srOnly = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

/**
 * @typedef UploadFieldProps
 * @prop {string=}  id
 * @prop {string=}  label
 * @prop {string=}  hint
 * @prop {string=}  accept            // default 'image/*'
 * @prop {string=}  currentUrl        // existing remote URL to preview
 * @prop {(file: File) => (void|Promise<void>)=} onSelectFile
 * @prop {(err: Error) => void=} onSelectError
 * @prop {() => void=} onClear
 * @prop {string=}  previewAlt
 * @prop {'environment'|'user'|boolean=} capture
 * @prop {boolean=} disabled
 * @prop {number=} maxSizeMB          // default 10
 * @prop {boolean=} imageOnly         // default true
 * @prop {boolean=} multiple          // default false (first file is used)
 * @prop {boolean=} allowPaste        // default true (paste images from clipboard)
 */
export default function UploadField({
  id: idProp,
  label = 'Upload',
  hint,
  accept = 'image/*',
  currentUrl,
  onSelectFile,
  onSelectError,
  onClear,
  previewAlt = 'Uploaded image',
  capture, // if true → no attribute; if 'environment'|'user' → pass on mobile
  disabled = false,
  maxSizeMB = 10,
  imageOnly = true,
  multiple = false,
  allowPaste = true,
}) {
  const reactId = useId()
  const id = useMemo(
    () => idProp || `upl_${reactId.replace(/[:]/g, '')}`,
    [idProp, reactId]
  )

  const inputRef = useRef(null)
  const statusRef = useRef(null) // aria-live region
  const dropRef = useRef(null)

  const [localPreview, setLocalPreview] = useState(null) // object URL
  const [fileMeta, setFileMeta] = useState(null) // { name, size, type }
  const [dragOver, setDragOver] = useState(false)
  const [err, setErr] = useState(null)

  const previewUrl = localPreview || currentUrl || null

  // Prefer the *remote* URL once parent finishes upload (clears blob preview)
  useEffect(() => {
    if (currentUrl && localPreview) {
      URL.revokeObjectURL(localPreview)
      setLocalPreview(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl])

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
    () =>
      (accept || '*/*')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    [accept]
  )
  const byteLimit = useMemo(
    () => Math.max(1, maxSizeMB) * 1024 * 1024,
    [maxSizeMB]
  )

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  const announce = useCallback((msg) => {
    if (statusRef.current) statusRef.current.textContent = msg
  }, [])

  const formatMB = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`

  // Strict-ish accept check: matches exact MIME or family (image/*) or extension (.png)
  const mimeAllowed = useCallback(
    (file) => {
      if (!acceptList.length || acceptList.includes('*/*')) return true
      const t = (file.type || '').toLowerCase()
      return acceptList.some((a) => {
        if (a.endsWith('/*')) {
          const fam = a.slice(0, a.indexOf('/'))
          return t.startsWith(`${fam}/`)
        }
        if (a.startsWith('.')) return file.name.toLowerCase().endsWith(a)
        return t === a || (a === 'image/*' && t.startsWith('image/'))
      })
    },
    [acceptList]
  )

  const validate = useCallback(
    (file) => {
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
    },
    [imageOnly, mimeAllowed, byteLimit, maxSizeMB]
  )

  const setPreviewFor = useCallback(
    (file) => {
      if (localPreview) URL.revokeObjectURL(localPreview)
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        setLocalPreview(url)
      } else {
        setLocalPreview(null)
      }
    },
    [localPreview]
  )

  const handleChosen = useCallback(
    (file) => {
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
    },
    [announce, onSelectError, onSelectFile, setPreviewFor, validate]
  )

  const onFile = useCallback(
    (e) => {
      const files = Array.from(e.target.files || [])
      if (!files.length) return
      handleChosen(files[0])
    },
    [handleChosen]
  )

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
  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)
      if (disabled) return
      const files = Array.from(e.dataTransfer?.files || [])
      if (files.length) handleChosen(files[0])
    },
    [disabled, handleChosen]
  )

  const onDragOver = useCallback(
    (e) => {
      e.preventDefault()
      if (disabled) return
      setDragOver(true)
    },
    [disabled]
  )

  const onDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  // Paste-to-upload (images from clipboard)
  useEffect(() => {
    if (!allowPaste) return
    const el = dropRef.current
    if (!el) return
    const onPaste = (e) => {
      if (disabled) return
      const items = Array.from(e.clipboardData?.items || [])
      const fileItem = items.find((i) => i.kind === 'file')
      const file = fileItem?.getAsFile()
      if (file) handleChosen(file)
    }
    el.addEventListener('paste', onPaste)
    return () => el.removeEventListener('paste', onPaste)
  }, [allowPaste, disabled, handleChosen])

  return (
    <div className={cls.field} aria-disabled={disabled || undefined}>
      <div className={cls.labelRow}>
        <label className={cls.label} htmlFor={id}>
          {label}
        </label>

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
        {...(multiple ? { multiple: true } : {})}
        // Only set capture attr on mobile UAs; prevents odd desktop behavior
        {...(captureAttr ? { capture: captureAttr } : {})}
        style={{ display: 'none' }}
        onChange={onFile}
        disabled={disabled}
      />

      {/* Drop zone */}
      <div
        ref={dropRef}
        className={`${cls.dropZone} ${dragOver ? cls.dropOver : ''} ${
          disabled ? cls.dropDisabled : ''
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          } else if (e.key === 'Escape' && fileMeta) {
            e.preventDefault()
            clearSelection()
          }
        }}
        aria-disabled={disabled || undefined}
        aria-label={`${label}: drag and drop, paste, or press Enter to choose a file`}
        aria-describedby={[
          hint ? `${id}_hint` : null,
          err ? `${id}_err` : null,
        ]
          .filter(Boolean)
          .join(' ') || undefined}
        data-has-file={!!(fileMeta || previewUrl)}
      >
        <span className={cls.dropIcon} aria-hidden>
          📎
        </span>
        <span className={cls.dropText}>
          Drag &amp; drop, paste, or click to browse
        </span>
      </div>

      {/* Meta + preview */}
      {(fileMeta || previewUrl) && (
        <div className={cls.preview}>
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              title="Open full image"
            >
              <img className={cls.thumb} src={previewUrl} alt={previewAlt} />
            </a>
          ) : null}
          {fileMeta ? (
            <div className={cls.fileMeta}>
              <div className={cls.fileName} title={fileMeta.name}>
                {fileMeta.name}
              </div>
              <div className={cls.fileSize} title={fileMeta.type || 'file'}>
                {formatMB(fileMeta.size)}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Hints + errors */}
      {hint && <div id={`${id}_hint`} className={cls.hint}>{hint}</div>}
      {err && (
        <div id={`${id}_err`} className={cls.error} role="alert">
          {err}
        </div>
      )}

      {/* SR-only status for live updates */}
      <div ref={statusRef} aria-live="polite" role="status" style={srOnly} />
    </div>
  )
}