// Path: /src/admin/walkthroughs/WalkthroughManager.jsx
// -----------------------------------------------------------------------------
// Admin • Walkthrough Manager (hub)
// - Loads + lists school walkthroughs (defaults + custom)
// - Create: blank, paste/convert (MD/CSV/XLSX via Upload view)
// - Edit: WYSIWYG / structured form (delegated to WalkthroughEditor/Form)
// - Preview: student-facing preview using shared renderer (stubbed)
// - Submit for review → flags item `in-review` for superadmin
// - Minimal in-file "store" with optimistic updates; replace with real API.
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from 'react'

// Child admin screens
import WalkthroughList from './WalkthroughList.jsx'
import WalkthroughEditor from './WalkthroughEditor.jsx'
import WalkthroughUpload from './WalkthroughUpload.jsx'
import WalkthroughPreview from './WalkthroughPreview.jsx'


// Local helpers (UI-centric helpers)
import {
  toToken,
  nextId,
  nowIso,
  cloneDeep,
  inferLabelFromToken,
} from './walkthroughHelpers.js'

//Data-layer parser now centralized with CSV/MD:
import { parseXlsx } from '@walkthrough-data/utils'

// Optional: light styles (kept inline for portability)
const toolbarBtn = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
}
const primaryBtn = { ...toolbarBtn, background: '#111827', color: '#fff', borderColor: '#111827' }
const subtle = { color: '#6b7280' }

/**
 * @typedef {'list'|'editor'|'upload'|'preview'} ViewMode
 */

/** Seed rows (replace with real fetch for your school’s data) */
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
    },
  ]
}

export default function WalkthroughManager() {
  const [view, setView] = useState(/** @type {ViewMode} */ ('list'))
  const [rows, setRows] = useState(() => seedRows())
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(false)

  const active = useMemo(() => rows.find((r) => r.id === activeId) || null, [rows, activeId])

  // Simulated fetch
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [])

  // Navigation
  const toList = () => {
    setActiveId(null)
    setView('list')
  }
  const toEditor = (id) => {
    setActiveId(id)
    setView('editor')
  }
  const toUpload = () => {
    setActiveId(null)
    setView('upload')
  }
  const toPreview = (id) => {
    setActiveId(id)
    setView('preview')
  }

  // Create blank draft
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

  // Import (MD/CSV/XLSX → dataset)
  const handleImport = (dataset /* {id?, label, classCode, script, version?} */) => {
    const id = dataset.id || nextId('wt')
    const token = toToken(dataset.classCode)
    const row = {
      id,
      label: dataset.label || inferLabelFromToken(token) || 'Imported Walkthrough',
      classCode: dataset.classCode || 'A',
      token,
      version: Number(dataset.version || 1),
      status: 'draft',
      source: 'school',
      isDefault: false,
      updatedAt: nowIso(),
      script: cloneDeep(dataset.script || []),
    }
    setRows((prev) => [row, ...prev])
    toEditor(id)
  }

  // Save from Editor
  const handleSave = (id, patch /* {label?, script?, version?, status?} */) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...cloneDeep(patch), updatedAt: nowIso() } : r))
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

  // Render
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
          <div style={{ display: 'flex', gap: 8 }}>
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
          item={active}
          onSave={(patch) => handleSave(active.id, patch)}
          onCancel={toList}
        />
      )}

      {view === 'upload' && (
        <WalkthroughUpload
          onImported={(dataset) => handleImport(dataset)}
          onCancel={toList}
          parseXlsx={parseXlsx}   {/* ✅ XLSX wired in */}
        />
      )}

      {view === 'preview' && active && (
        <WalkthroughPreview
          item={active}
          onClose={toList}
          onSubmit={handleSubmit}  {/* Optional: allow submit from preview */}
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