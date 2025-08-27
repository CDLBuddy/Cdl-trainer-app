// src/admin/walkthroughs/Manager/WalkthroughManager.jsx
// Admin • Walkthrough Manager (hub)
import React from 'react'
import cls from './WalkthroughManager.module.css'
import { ManagerToolbar } from './components'
import { useWalkthroughManager } from './hooks'

// Feature barrels (keeps imports tidy)
import { WalkthroughEditor }  from '../Editor'
import { WalkthroughList }    from '../List'
import { WalkthroughPreview } from '../Preview'
import { WalkthroughUpload }  from '../Upload'

export default function WalkthroughManager() {
  const {
    view, rows, active, loading,
    toList, toEditor, toUpload, toPreview,
    handleCreateBlank, handleImport, handleSave, handleDelete,
    handleDuplicate, handleSubmit, handleExport, parseXlsx,
  } = useWalkthroughManager()

  return (
    <div className={cls.container}>
      <ManagerToolbar
        view={view}
        onBack={toList}
        onCreate={handleCreateBlank}
        onImport={toUpload}
      />

      {view === 'list' && (
        <WalkthroughList
          items={rows}
          loading={loading}
          onPreview={toPreview}
          onEdit={toEditor}
          onSubmit={handleSubmit}
          onDuplicate={handleDuplicate}
          onExport={handleExport}
          onDelete={handleDelete}
        />
      )}

      {view === 'editor' && active && (
        <WalkthroughEditor
          initialScript={active.script || []}
          onSave={({ script /*, source*/ }) => handleSave(active.id, { script })}
          onCancel={toList}
        />
      )}

      {view === 'upload' && (
        <WalkthroughUpload
          onImported={handleImport}
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