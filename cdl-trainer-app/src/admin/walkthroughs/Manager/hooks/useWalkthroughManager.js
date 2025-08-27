//src/admin/walkthroughs/Manager/hooks/useWalkthroughManager.js
import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseXlsxFile } from '@walkthrough-data/utils/parseXlsx.js'
import { toToken, nextId, nowIso, cloneDeep, inferLabelFromToken } from '../services/walkthroughHelpers.js'

/** @typedef {'list'|'editor'|'upload'|'preview'} ViewMode */

function seedRows() {
  return [
    {
      id: 'default-class-a',
      label: 'Class A (Default)',
      classCode: 'A',
      token: 'class-a',
      version: 1,
      status: 'published',
      source: 'default',
      isDefault: true,
      updatedAt: '2025-08-10T12:00:00Z',
      script: [], // display row; canonical defaults live elsewhere
    },
    {
      id: 'my-school-class-b-v1',
      label: 'Class B — East Campus',
      classCode: 'B',
      token: 'class-b',
      version: 1,
      status: 'draft',
      source: 'school',
      isDefault: false,
      updatedAt: '2025-08-13T16:22:00Z',
      script: [{ section: 'Cab Safety', steps: [{ script: 'Seat belt…', required: true }] }],
    },
  ]
}

export function useWalkthroughManager() {
  const [view, setView] = useState(/** @type {ViewMode} */('list'))
  const [rows, setRows] = useState(() => seedRows())
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(false)

  const active = useMemo(() => rows.find(r => r.id === activeId) || null, [rows, activeId])

  // Simulated initial fetch
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => { if (!cancelled) setLoading(false) }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [])

  // Navigation
  const toList   = useCallback(() => { setActiveId(null); setView('list') }, [])
  const toEditor = useCallback((id) => { setActiveId(id); setView('editor') }, [])
  const toUpload = useCallback(() => { setActiveId(null); setView('upload') }, [])
  const toPreview= useCallback((id) => { setActiveId(id); setView('preview') }, [])

  // Create blank
  const handleCreateBlank = useCallback((classCode = 'A') => {
    const token = toToken(classCode)
    const label = inferLabelFromToken(token) || `Custom ${classCode}`
    const id = nextId('wt')

    const draft = {
      id,
      label,
      classCode,
      token,
      version: 1,
      status: 'draft',
      source: 'school',
      isDefault: false,
      updatedAt: nowIso(),
      script: [{ section: 'New Section', steps: [{ script: 'New step…', label: 'Step 1', required: false }] }],
    }

    setRows(r => [draft, ...r])
    toEditor(id)
  }, [toEditor])

  // Import dataset (from Upload)
  const handleImport = useCallback((dataset) => {
    const script = Array.isArray(dataset?.sections)
      ? cloneDeep(dataset.sections)
      : Array.isArray(dataset?.script)
      ? cloneDeep(dataset.script)
      : []

    const classCode = (dataset?.classCode || 'A').toUpperCase()
    const token = toToken(classCode)
    const id = dataset?.id || nextId('wt')

    const row = {
      id,
      label: dataset?.label || inferLabelFromToken(token) || 'Imported Walkthrough',
      classCode,
      token,
      version: Number(dataset?.version || 1),
      status: 'draft',
      source: 'school',
      isDefault: false,
      updatedAt: nowIso(),
      script,
    }

    setRows(prev => [row, ...prev])
    toEditor(id)
  }, [toEditor])

  // Save from editor
  const handleSave = useCallback((id, patch) => {
    setRows(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              ...(patch?.label ? { label: patch.label } : null),
              ...(patch?.version != null ? { version: Number(patch.version) } : null),
              ...(patch?.status ? { status: patch.status } : null),
              ...(Array.isArray(patch?.script) ? { script: cloneDeep(patch.script) } : null),
              updatedAt: nowIso(),
            }
          : r
      )
    )
    toList()
  }, [toList])

  const handleDelete = useCallback((id) => {
    setRows(prev => prev.filter(r => r.id !== id))
    if (activeId === id) toList()
  }, [activeId, toList])

  const handleDuplicate = useCallback((id) => {
    const src = rows.find(r => r.id === id)
    if (!src) return
    const dup = {
      ...cloneDeep(src),
      id: nextId('wt'),
      label: `${src.label} (Copy)`,
      status: 'draft',
      isDefault: false,
      source: 'school',
      updatedAt: nowIso(),
    }
    setRows(prev => [dup, ...prev])
  }, [rows])

  const handleSubmit = useCallback((id) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, status: 'in-review', updatedAt: nowIso() } : r)))
    alert('Submitted for superadmin review ✅')
    // TODO: wire real API
  }, [])

  const handleExport = useCallback((id) => {
    const item = rows.find(r => r.id === id)
    if (!item) return
    const data = JSON.stringify({
      id: item.id,
      label: item.label,
      classCode: item.classCode,
      version: item.version,
      sections: item.script || [],
    }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${item.token || item.id}.json`; a.click()
    URL.revokeObjectURL(url)
  }, [rows])

  // Provide exceljs parser to Upload
  const parseXlsx = useCallback(async (file) => {
    return await parseXlsxFile(file, { hasHeader: true, coerceStrings: true })
  }, [])

  return {
    // state
    view, rows, activeId, active, loading,
    // nav
    toList, toEditor, toUpload, toPreview,
    // actions
    handleCreateBlank, handleImport, handleSave, handleDelete,
    handleDuplicate, handleSubmit, handleExport, parseXlsx,
  }
}