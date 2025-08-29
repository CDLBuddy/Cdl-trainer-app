// src/admin/walkthroughs/Manager/WalkthroughManager.jsx
// ============================================================================
// Admin · Walkthrough Manager (hub)
// - Lazy-splits heavy feature panes (Editor/Preview/Upload) for faster loads
// - Uses barrels for tidy imports
// - Adds minor a11y polish + defensive fallbacks
// ============================================================================

import React, { Suspense } from 'react'

// Feature barrels (keep imports tidy)
// List is light enough to import eagerly (often first screen)
import { WalkthroughList } from '../List'

// Heavier panes: lazy-load to trim initial bundle
const WalkthroughEditor = React.lazy(() =>
  import('../Editor').then(m => ({ default: m.WalkthroughEditor }))
)
const WalkthroughPreview = React.lazy(() =>
  import('../Preview').then(m => ({ default: m.WalkthroughPreview }))
)
const WalkthroughUpload = React.lazy(() =>
  import('../Upload').then(m => ({ default: m.WalkthroughUpload }))
)

import { ManagerToolbar } from './components'
import { useWalkthroughManager } from './hooks'
import cls from './WalkthroughManager.module.css'

export default function WalkthroughManager() {
  const {
    view,
    rows,
    active,
    loading,
    toList,
    toEditor,
    toUpload,
    toPreview,
    handleCreateBlank,
    handleImport,
    handleSave,
    handleDelete,
    handleDuplicate,
    handleSubmit,
    handleExport,
    parseXlsx,
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

      <Suspense
        fallback={
          <div className={cls.loading} role="status" aria-live="polite">
            Loading…
          </div>
        }
      >
        {view === 'editor' && active && (
          <WalkthroughEditor
            initialScript={active.script || []}
            onSave={({ script /* , source */ }) =>
              handleSave(active.id, { script })
            }
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
      </Suspense>

      {(view === 'editor' || view === 'preview') && !active && (
        <div className={cls.missing} role="alert" aria-live="assertive">
          Missing selection.{' '}
          <button type="button" onClick={toList}>
            Return to list
          </button>
        </div>
      )}
    </div>
  )
}
