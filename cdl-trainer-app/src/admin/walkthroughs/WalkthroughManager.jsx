// src/admin/walkthroughs/WalkthroughManager.jsx
// -----------------------------------------------------------------------------
// Admin • Walkthrough Manager (hub)
// - Lists defaults + school/custom walkthroughs
// - Create blank by class; Import (MD/CSV/XLSX) via Upload view
// - Edit via WalkthroughEditor (visual/form hybrid)
// - Preview via shared renderer (admin preview component)
// - Submit for review → marks 'in-review' (replace with real API later)
// - Local, optimistic store (replace with Firestore/API as needed)
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState, useCallback } from 'react'

// XLSX (exceljs) parser helper you mentioned you’re using
import { parseXlsxFile } from '@walkthrough-data/utils/parseXlsx.js'

// Local editor/uploader/preview + helpers
import WalkthroughEditor from './WalkthroughEditor.jsx'
import WalkthroughList from './WalkthroughList.jsx'
import WalkthroughPreview from './WalkthroughPreview.jsx'
import WalkthroughUpload from './WalkthroughUpload.jsx'

import {
  toToken,
  nextId,
  nowIso,
  cloneDeep,
  inferLabelFromToken,
} from './walkthroughHelpers.js'

// ---- tiny UI styles --------------------------------------------------------
const toolbarBtn = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
}
const primaryBtn = { ...toolbarBtn, background: '#111827', color: '#fff', borderColor: '#111827' }
const subtle = { color: '#6b7280' }

/** @typedef {'list'|'editor'|'upload'|'preview'} ViewMode */

// ---- seed (replace with real fetch) ----------------------------------------
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
      script: [], // defaults live in @walkthrough-data; keep empty for display row
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
      script: [
        { section: 'Cab Safety', steps: [{ script: 'Seat belt…', required: true }] },
      ],
    },
  ]
}

export default function WalkthroughManager() {
  const [view, setView] = useState(/** @type {ViewMode} */ ('list'))
  const [rows, setRows] = useState(() => seedRows())
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(false)

  const active = useMemo(
    () => rows.find((r) => r.id === activeId) || null,
    [rows, activeId]
  )

  // Simulated initial fetch “loading”
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => { if (!cancelled) setLoading(false) }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [])

  // ---- navigation helpers ---------------------------------------------------
  const toList = useCallback(() => { setActiveId(null); setView('list') }, [])
  const toEditor = useCallback((id) => { setActiveId(id); setView('editor') }, [])
  const toUpload = useCallback(() => { setActiveId(null); setView('upload') }, [])
  const toPreview = useCallback((id) => { setActiveId(id); setView('preview') }, [])

  // ---- create blank draft ---------------------------------------------------
  const handleCreateBlank = (classCode = 'A') => {
    const token = toToken(classCode)
    const label = inferLabelFromToken(token) || `Custom ${classCode}`
    const id = nextId('wt')
    const now = nowIso()

    const draft = {
      id,
      label,
      classCode,
      token,
      version: 1,
      status: 'draft',
      source: 'school',
      isDefault: false,
      updatedAt: now,
      script: [
        {
          section: 'New Section',
          steps: [{ script: 'New step…', label: 'Step 1', required: false }],
        },
      ],
    }

    setRows((r) => [draft, ...r])
    toEditor(id)
  }

  // ---- import from Upload (dataset may be {sections} or {script}) ----------
  const handleImport = (dataset) => {
    // Accept either shape and normalize
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

    setRows((prev) => [row, ...prev])
    toEditor(id)
  }

  // ---- save from editor (only script changes here) -------------------------
  const handleSave = (id, patch /* { script, label?, version?, status? } */) => {
    setRows((prev) =>
      prev.map((r) =>
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
  }

  const handleDelete = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
    if (activeId === id) toList()
  }

  const handleDuplicate = (id) => {
    const src = rows.find((r) => r.id === id)
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
    setRows((prev) => [dup, ...prev])
  }

  const handleSubmit = (id) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'in-review', updatedAt: nowIso() } : r))
    )
    alert('Submitted for superadmin review ✅')
    // TODO: replace with API call that creates/updates a submission doc for superadmin.
  }

  const handleExport = (id) => {
    const item = rows.find((r) => r.id === id)
    if (!item) return
    const data = JSON.stringify(
      {
        id: item.id,
        label: item.label,
        classCode: item.classCode,
        version: item.version,
        sections: item.script || [],
      },
      null,
      2
    )
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.token || item.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---- wire your exceljs helper into the Upload screen ---------------------
  const parseXlsx = async (file) => {
    // Returns row objects keyed by header; WalkthroughUpload will convert to {sections}
    return await parseXlsxFile(file, { hasHeader: true, coerceStrings: true })
  }

  // ---- render --------------------------------------------------------------
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      {/* Header / toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Walkthrough Manager</h1>
        <span style={subtle}>Admin</span>
        <div style={{ flex: 1 }} />
        {view !== 'list' ? (
          <button type="button" onClick={toList} style={toolbarBtn} aria-label="Back to list">
            ← Back
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => handleCreateBlank('A')} style={primaryBtn}>
              + New (Class A)
            </button>
            <button type="button" onClick={() => handleCreateBlank('B')} style={toolbarBtn}>
              + New (Class B)
            </button>
            <button type="button" onClick={() => handleCreateBlank('PASSENGER-BUS')} style={toolbarBtn}>
              + New (Passenger Bus)
            </button>
            <button type="button" onClick={toUpload} style={toolbarBtn}>
              Import (MD/CSV/XLSX)
            </button>
          </div>
        )}
      </div>

      {/* Content switcher */}
      {view === 'list' && (
        <WalkthroughList
          items={rows}
          loading={loading}
          onPreview={(id) => toPreview(id)}
          onEdit={(id) => toEditor(id)}
          onSubmit={(id) => handleSubmit(id)}
          onDuplicate={(id) => handleDuplicate(id)}
          onExport={(id) => handleExport(id)}
          onDelete={(id) => handleDelete(id)}
        />
      )}

      {view === 'editor' && active && (
        <WalkthroughEditor
          // 🔧 Editor contract: initialScript in, {script, source} out
          initialScript={active.script || []}
          onSave={({ script /*, source */ }) => handleSave(active.id, { script })}
          onCancel={toList}
        />
      )}

      {view === 'upload' && (
        <WalkthroughUpload
          onImported={(dataset) => handleImport(dataset)}
          onCancel={toList}
          parseXlsx={parseXlsx}
        />
      )}

      {view === 'preview' && active && (
        <WalkthroughPreview
          item={active}
          onClose={toList}
          onSubmit={handleSubmit}
        />
      )}

      {(view === 'editor' || view === 'preview') && !active && (
        <div style={{ padding: 24, color: '#6b7280' }}>
          Missing selection. <button onClick={toList}>Return to list</button>
        </div>
      )}
    </div>
  )
}