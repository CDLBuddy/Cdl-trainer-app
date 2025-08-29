// src/admin/reports/index.js
// ======================================================================
// Admin Reports – barrel + perf helpers (tree-shake & SSR safe)
// - Re-exports: AdminReports, components, hooks, services (+ student-reports)
// - Prefetch helpers to warm heavy bundles/services on idle/hover
// ======================================================================

export { default as AdminReports } from './AdminReports.jsx'
export * as ReportsComponents from './components'
export * as ReportsHooks from './hooks'
export * as ReportsServices from './services'

// Optional: surface student-reports helpers so apps can reuse them
// (safe even if the folder is absent; consumers can tree-shake)
export * as StudentReports from './student-reports'

/**
 * Prefetch the largest on-demand chunks used by AdminReports.
 * Call this from a router loader, prefetch link hover, or requestIdleCallback.
 * Best-effort: all imports are settled and individual failures are ignored.
 */
export async function prefetchReports() {
  try {
    await Promise.allSettled([
      // Tables / menus
      import('./components/UsersTable.jsx'),
      import('./components/CompanyRosterTable.jsx'),
      import('./components/ExportMenu.jsx'),

      // Dialogs (Bulk Upload / Submit)
      import('./components/BulkUploadDialog.jsx'),
      import('./components/SubmitToTPRDialog.jsx'),

      // Student drawer + its helper bundle (barrel)
      import('./student-reports/index.js').catch(() => {}),
      import('./student-reports/index.js').catch(() => {}),

      // Direct-load helpers too (in case the barrel isn’t present in some builds)
      import('./student-reports/cert-template.js').catch(() => {}),
      import('./student-reports/pdf-utils.js').catch(() => {}),

      // Warm TPR services used by useTPRSubmit
      import('./hooks/useTPRSubmit.js')
        .then(m => m.prefetchTPRServices?.())
        .catch(() => {}),
    ])
  } catch {
    // best-effort prefetch; silently ignore
  }
}

/**
 * Prefetch on idle; returns a disposer to cancel if needed.
 * Useful to call right after rendering the route shell.
 * @returns {() => void} disposer that cancels the scheduled prefetch
 */
export function prefetchOnIdle() {
  if (typeof window === 'undefined') return () => {}
  const run = () => {
    void prefetchReports()
  }
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(run, { timeout: 1200 })
    return () => window.cancelIdleCallback?.(id)
  }
  const t = setTimeout(run, 600)
  return () => clearTimeout(t)
}

/**
 * Ensure a portal root for modal components (no-op on SSR).
 * Matches SubmitToTPRDialog which prefers #modal-root then falls back to <body>.
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export function ensureModalRoot(id = 'modal-root') {
  if (typeof document === 'undefined') return null
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('div')
    el.id = id
    document.body.appendChild(el)
  }
  return el
}
