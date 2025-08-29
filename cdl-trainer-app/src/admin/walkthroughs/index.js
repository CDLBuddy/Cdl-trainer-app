// Path: /src/admin/walkthroughs/index.js
// -----------------------------------------------------------------------------
// Walkthroughs • root barrel (deluxe + polished)
// - One-stop exports for Manager, List, Preview, Upload, Editor, Form
// - Lazy versions for code-splitting
// - Namespaced re-exports from each subfolder and the shared tools
// - Convenience re-exports of the most commonly used helpers
// - Tiny route helper you can adapt for React Router (or any router)
// -----------------------------------------------------------------------------

import React from 'react'

// ----- Direct component exports ----------------------------------------------
import WalkthroughEditor from './Editor/WalkthroughEditor.jsx'
import WalkthroughForm from './Form/WalkthroughForm.jsx'
import WalkthroughList from './List/WalkthroughList.jsx'
import WalkthroughManager from './Manager/WalkthroughManager.jsx'
import WalkthroughPreview from './Preview/WalkthroughPreview.jsx'
import WalkthroughUpload from './Upload/WalkthroughUpload.jsx'

export { WalkthroughManager }
export { WalkthroughList }
export { WalkthroughPreview }
export { WalkthroughUpload }
export { WalkthroughEditor }
export { WalkthroughForm }

// ----- Sub-package barrels as namespaces (tree-shakeable) --------------------
export * as Manager from './Manager'
export * as List from './List'
export * as Preview from './Preview'
export * as Upload from './Upload'
export * as Editor from './Editor'
export * as Form from './Form'
export * as shared from './shared'

// ----- Convenience helpers (avoid deep import paths) -------------------------
export {
  toToken,
  nextId,
  nowIso,
  cloneDeep,
  inferLabelFromToken,
} from './shared/services/walkthroughHelpers.js'

export {
  ensureScriptShape,
  validateScript,
} from './shared/services/wtValidation.js'

// ----- Lazy variants for code splitting --------------------------------------
export const WalkthroughManagerLazy = React.lazy(
  () => import('./Manager/WalkthroughManager.jsx')
)
export const WalkthroughListLazy = React.lazy(
  () => import('./List/WalkthroughList.jsx')
)
export const WalkthroughPreviewLazy = React.lazy(
  () => import('./Preview/WalkthroughPreview.jsx')
)
export const WalkthroughUploadLazy = React.lazy(
  () => import('./Upload/WalkthroughUpload.jsx')
)
export const WalkthroughEditorLazy = React.lazy(
  () => import('./Editor/WalkthroughEditor.jsx')
)
export const WalkthroughFormLazy = React.lazy(
  () => import('./Form/WalkthroughForm.jsx')
)

// ----- Screen registry (nice for dynamic renderers) --------------------------
export const walkthroughScreens = {
  Manager: WalkthroughManager,
  List: WalkthroughList,
  Preview: WalkthroughPreview,
  Upload: WalkthroughUpload,
  Editor: WalkthroughEditor,
  Form: WalkthroughForm,
}

export const walkthroughScreensLazy = {
  Manager: WalkthroughManagerLazy,
  List: WalkthroughListLazy,
  Preview: WalkthroughPreviewLazy,
  Upload: WalkthroughUploadLazy,
  Editor: WalkthroughEditorLazy,
  Form: WalkthroughFormLazy,
}

// ----- Tiny route helper -----------------------------------------------------
// Usage (React Router v6):
//   import { getWalkthroughRoutes } from '@/admin/walkthroughs'
//   const routes = getWalkthroughRoutes('/admin/walkthroughs')
//   // then map routes → <Route path element={<Comp/>} />
export function getWalkthroughRoutes(prefix = '/admin/walkthroughs') {
  // Plain descriptors so you can adapt to any router
  return [
    { key: 'manager', path: `${prefix}`, component: WalkthroughManagerLazy },
    { key: 'list', path: `${prefix}/list`, component: WalkthroughListLazy },
    {
      key: 'upload',
      path: `${prefix}/upload`,
      component: WalkthroughUploadLazy,
    },
    {
      key: 'preview',
      path: `${prefix}/preview/:id?`,
      component: WalkthroughPreviewLazy,
    },
    {
      key: 'editor',
      path: `${prefix}/editor/:id?`,
      component: WalkthroughEditorLazy,
    },
    { key: 'form', path: `${prefix}/form`, component: WalkthroughFormLazy },
  ]
}

// ----- Default export (friendly namespace) -----------------------------------
const Walkthroughs = {
  ...walkthroughScreens,
  lazy: walkthroughScreensLazy,
  getRoutes: getWalkthroughRoutes,
}
export default Walkthroughs
