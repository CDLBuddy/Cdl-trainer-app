// src/admin/reports/components/BulkUploadDialog.jsx
// ======================================================================
// BulkUploadDialog (lazy-loaded)
// - CSV-only (XLSX could be added later upstream in onFile/onUpload)
// - Tries dynamic import of `papaparse`; falls back to a tiny parser
// - A11y: labelled title + hint, Esc to close, focus trap, overlay click
// - UX: drag highlight, file re-select enabled, background scroll lock
// - Works with either onFile(file) or onUpload(parsedRows)
// ======================================================================

import PropTypes from 'prop-types'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './BulkUploadDialog.module.css'

function BulkUploadDialogImpl({
  open,
  onClose,
  onFile,
  onUpload,
  maxSizeMB = 5,
  sampleHeaders = [
    'firstName',
    'lastName',
    'dob(YYYY-MM-DD)',
    'licenseNumber',
    'licenseState',
    'clpNumber',
    'clpState',
    'trainingType(theory|btw|both)',
    'classType(A|B|C)',
    'endorsement(N|P|S|T|H|X|none)',
    'completionDate(YYYY-MM-DD)',
  ],
}) {
  const overlayRef = useRef(null)
  const panelRef   = useRef(null)
  const inputRef   = useRef(null)
  const dropRef    = useRef(null)

  const [file, setFile]           = useState(null)
  const [status, setStatus]       = useState('idle') // 'idle' | 'parsing'
  const [error, setError]         = useState('')
  const [rowsCount, setRowsCount] = useState(0)
  const [fileName, setFileName]   = useState('')

  const titleId = React.useId()
  const hintId  = React.useId()
  const accept  = useMemo(() => 'text/csv,.csv', [])

  // ---------- Mount/Unmount behaviors ----------
  // Focus first actionable and ESC to close
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus?.(), 0)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // Prevent background scroll while dialog is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Simple focus trap within the panel
  useEffect(() => {
    if (!open) return
    const el = panelRef.current
    if (!el) return
    const sel = 'a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])'
    const trap = (e) => {
      if (e.key !== 'Tab') return
      const focusables = Array.from(el.querySelectorAll(sel)).filter(n => !n.hasAttribute('disabled'))
      if (!focusables.length) return
      const first = focusables[0]
      const last  = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }
    el.addEventListener('keydown', trap)
    return () => el.removeEventListener('keydown', trap)
  }, [open])

  // ---------- CSV parsing helpers ----------
  const guardFile = useCallback((f) => {
    if (!f) return 'No file selected.'
    const okType =
      f.type === 'text/csv' ||
      f.name.toLowerCase().endsWith('.csv') ||
      f.type === '' // some browsers leave CSV as empty type
    if (!okType) return 'Please select a .csv file.'
    const tooBig = f.size > maxSizeMB * 1024 * 1024
    if (tooBig) return `CSV is too large (>${maxSizeMB} MB).`
    return ''
  }, [maxSizeMB])

  // Smol CSV splitter honoring quotes: "a,b",c  -> ["a,b","c"]
  const splitCsvLine = useCallback((line) => {
    const out = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i += 1 }
        else { inQ = !inQ }
      } else if (ch === ',' && !inQ) {
        out.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    out.push(cur)
    return out
  }, [])

  const tinyCsvParse = useCallback(async (fileObj) => {
    const text = await fileObj.text()
    const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(Boolean)
    if (!lines.length) return []
    const header = splitCsvLine(lines[0]).map(h => String(h || '').trim())
    const out = []
    for (let i = 1; i < lines.length; i += 1) {
      const cols = splitCsvLine(lines[i])
      if (cols.length === 1 && cols[0] === '') continue
      const row = {}
      for (let j = 0; j < header.length; j += 1) row[header[j]] = cols[j] ?? ''
      out.push(row)
    }
    return out
  }, [splitCsvLine])

  const parseWithPapa = useCallback(async (fileObj) => {
    try {
      const mod = await import(/* @vite-ignore */ 'papaparse')
      const Papa = mod?.default ?? mod
      return await new Promise((resolve, reject) => {
        Papa.parse(fileObj, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => String(h || '').trim(),
          complete: ({ data }) => resolve(Array.isArray(data) ? data : []),
          error: (err) => reject(err),
        })
      })
    } catch {
      return tinyCsvParse(fileObj)
    }
  }, [tinyCsvParse])

  // ---------- Handlers ----------
  const handleFiles = useCallback(async (f) => {
    setError('')
    const err = guardFile(f)
    if (err) { setError(err); return }

    setFile(f)
    setFileName(f.name)
    // let parent handle parsing (legacy flow)
    onFile?.(f)

    if (!onUpload) return // caller only wants the file back

    try {
      setStatus('parsing')
      const rows = await parseWithPapa(f)
      setRowsCount(rows.length)
      setStatus('idle')
      await onUpload(rows)
    } catch (e) {
      setStatus('idle')
      setError(`Failed to parse CSV: ${e?.message || e}`)
    }
  }, [guardFile, onFile, onUpload, parseWithPapa])

  const onPick = useCallback((e) => {
    const f = e.target?.files?.[0] || null
    // allow re-selecting the same file by resetting the input value
    e.target.value = ''
    if (f) handleFiles(f)
  }, [handleFiles])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const f = e.dataTransfer?.files?.[0] || null
    if (dropRef.current) dropRef.current.dataset.dragging = 'false'
    if (f) handleFiles(f)
  }, [handleFiles])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    if (dropRef.current) dropRef.current.dataset.dragging = 'true'
  }, [])

  const onDragLeave = useCallback((e) => {
    e.preventDefault()
    if (dropRef.current) dropRef.current.dataset.dragging = 'false'
  }, [])

  const downloadTemplate = useCallback(() => {
    const csv = sampleHeaders.join(',') + '\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'tpr-bulk-template.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 0)
  }, [sampleHeaders])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={hintId}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.()
      }}
    >
      <div ref={panelRef} className={styles.panel} role="document">
        <header className={styles.header}>
          <div>
            <div className={styles.kicker}>Bulk Upload</div>
            <h3 id={titleId} className={styles.title}>ELDT completion records (.csv)</h3>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={styles.close}
          >
            ×
          </button>
        </header>

        <section className={styles.body} aria-busy={status === 'parsing'}>
          <div
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            data-dragging="false"
            className={styles.dropArea}
          >
            <div className={styles.dropTitle}>Drag &amp; drop CSV here</div>
            <div className={styles.dropSub}>or choose a file from your computer</div>

            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={onPick}
              className={styles.inputHidden}
              aria-label="Select CSV file"
            />
            <button
              type="button"
              className={styles.pickBtn}
              onClick={() => inputRef.current?.click?.()}
            >
              Choose CSV
            </button>
          </div>

          {fileName && (
            <div className={styles.fileMeta}>
              <b>Selected:</b> {fileName}{' '}
              {rowsCount > 0 && (
                <span className={styles.fileParsed}>(parsed {rowsCount} row{rowsCount === 1 ? '' : 's'})</span>
              )}
            </div>
          )}

          {!!error && (
            <div role="alert" className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className="btn btn-ghost" onClick={downloadTemplate}>
              Download CSV template
            </button>
            <div className={styles.flexFill} />
            <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!file || status === 'parsing'}
              onClick={() => {
                // If the parent handles parsing (onFile), just send it again.
                // If onUpload is provided, we parse here (handleFiles).
                if (!file) return
                if (onUpload) handleFiles(file)
                else onFile?.(file)
              }}
            >
              {status === 'parsing' ? 'Parsing…' : 'Upload'}
            </button>
          </div>

          <small id={hintId} className={styles.hint}>
            <b>Accepted:</b> .csv up to {maxSizeMB}MB. Columns suggested:&nbsp;
            <code className={styles.code}>{sampleHeaders.join(', ')}</code>
          </small>
        </section>
      </div>
    </div>
  )
}

BulkUploadDialogImpl.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onFile: PropTypes.func,                             // legacy
  onUpload: PropTypes.func,                           // parsed rows (header:true)
  maxSizeMB: PropTypes.number,
  sampleHeaders: PropTypes.arrayOf(PropTypes.string),
}

const BulkUploadDialog = React.memo(BulkUploadDialogImpl)
export default BulkUploadDialog