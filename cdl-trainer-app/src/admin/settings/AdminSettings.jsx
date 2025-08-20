// src/admin/settings/AdminSettings.jsx
// ======================================================================
// Admin • Settings (shell)
// - Tabs: Branding / Courses / Users / Billing / Compliance / Notifications
// - A11y: proper tablist/tabpanel semantics + keyboard navigation
// - Hash sync: #branding | #courses | #users | #billing | #compliance | #notifications
// - Session memory: remembers the last-selected tab per session
// - Defensive against SSR and reduced-motion users
// ======================================================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from 'react'

import Shell from '@components/Shell.jsx'

import {
  Branding,
  Courses,
  Users,
  Billing,
  Compliance,
  Notifications,
} from './sections'

// Keep the order stable
const TABS = /** @type const */ ([
  { key: 'branding',      label: 'Branding',      Comp: Branding },
  { key: 'courses',       label: 'Courses',       Comp: Courses },
  { key: 'users',         label: 'Users',         Comp: Users },
  { key: 'billing',       label: 'Billing',       Comp: Billing },
  { key: 'compliance',    label: 'Compliance',    Comp: Compliance },
  { key: 'notifications', label: 'Notifications', Comp: Notifications },
])

const TAB_KEYS = TABS.map(t => t.key)
const isValidKey = (k) => TAB_KEYS.includes(k)

// Initial tab from hash or session (fallback to first)
function getInitialTab() {
  if (typeof window === 'undefined') return TABS[0].key
  const fromHash = (window.location.hash || '').slice(1)
  if (isValidKey(fromHash)) return fromHash
  try {
    const saved = sessionStorage.getItem('admin.settings.tab') || ''
    if (isValidKey(saved)) return saved
  } catch { /* ignore */ }
  return TABS[0].key
}

export default function AdminSettings() {
  const [tab, setTab] = useState(getInitialTab)
  const tabRefs = useRef(new Map()) // key -> button element

  // Persist per session
  useEffect(() => {
    try { sessionStorage.setItem('admin.settings.tab', tab) } catch { /* ignore */ }
  }, [tab])

  // Keep hash in sync (without scrolling the page)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const current = (window.location.hash || '').slice(1)
    if (current !== tab) window.history.replaceState(null, '', `#${tab}`)
  }, [tab])

  // React to hash changes (e.g., user edits the URL)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onHash = () => {
      const k = (window.location.hash || '').slice(1)
      if (isValidKey(k)) setTab(k)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Document title nicety
  useEffect(() => {
    if (typeof document === 'undefined') return
    const label = TABS.find(t => t.key === tab)?.label || 'Settings'
    const prev = document.title
    document.title = `${label} · Admin Settings`
    return () => { document.title = prev }
  }, [tab])

  const activeTab = useMemo(() => TABS.find(t => t.key === tab) || TABS[0], [tab])
  const panelId   = `settings-panel-${activeTab.key}`
  const tabId     = `settings-tab-${activeTab.key}`

  // Keyboard nav on the tablist
  const onKeyTabs = useCallback((e) => {
    const idx = TAB_KEYS.indexOf(tab)
    if (idx < 0) return

    let next = null
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      next = TAB_KEYS[(idx + 1) % TAB_KEYS.length]
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      next = TAB_KEYS[(idx - 1 + TAB_KEYS.length) % TAB_KEYS.length]
    } else if (e.key === 'Home') {
      e.preventDefault()
      next = TAB_KEYS[0]
    } else if (e.key === 'End') {
      e.preventDefault()
      next = TAB_KEYS[TAB_KEYS.length - 1]
    }
    if (next && next !== tab) {
      setTab(next)
      // After state applies, move focus to the newly active tab
      queueMicrotask(() => {
        const btn = tabRefs.current.get(next)
        btn?.focus()
      })
    }
  }, [tab])

  const Active = activeTab.Comp

  return (
    <Shell title="Admin Settings">
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Admin settings sections"
        aria-orientation="horizontal"
        tabIndex="0"
        onKeyDown={onKeyTabs}
        className="u-toolbar"
        style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}
      >
        {TABS.map((t) => (
          <TabButton
            key={t.key}
            id={`settings-tab-${t.key}`}
            isActive={t.key === tab}
            controls={`settings-panel-${t.key}`}
            onSelect={() => setTab(t.key)}
            // capture ref for focus management
            ref={(el) => {
              if (el) tabRefs.current.set(t.key, el)
              else tabRefs.current.delete(t.key)
            }}
          >
            {t.label}
          </TabButton>
        ))}
      </div>

      {/* Panel */}
      <section
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId}
        className="dashboard-card"
      >
        <Suspense fallback={<div style={{ padding: 12 }}>Loading section…</div>}>
          <Active />
        </Suspense>
      </section>
    </Shell>
  )
}

/** Small, accessible tab button */
const TabButton = React.forwardRef(function TabButton(
  { id, isActive, controls, onSelect, children },
  ref
) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={controls}
      tabIndex={isActive ? 0 : -1}
      className={`btn ${isActive ? '' : 'outline'}`}
      onClick={onSelect}
      title={typeof children === 'string' ? children : undefined}
      ref={ref}
      data-active={isActive ? '' : undefined}
    >
      {children}
    </button>
  )
})