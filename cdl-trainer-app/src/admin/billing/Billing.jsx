// Path: src/admin/billing/Billing.jsx
// ======================================================================
// Admin • Billing (shell)
// - Two tabs: Employer / Individual
// - A11y-first: proper tab roles, focus mgmt, keyboard nav
// - Remembers last-selected tab per session
// - Hash sync for deep-links (#employer | #individual) with hashchange support
// - SSR-safe (guards window/sessionStorage)
// ======================================================================

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Shell from '@components/Shell.jsx'
import EmployerTab from './components/Employer/EmployerTab.jsx'
import IndividualTab from './components/Individual/IndividualTab.jsx'

const TABS = /** @type const */ (['employer', 'individual'])
const isValidTab = (t) => TABS.includes(String(t))
const STORAGE_KEY = 'admin.billing.tab'

// ---- initial tab resolver ---------------------------------------------------
function getInitialTab() {
  if (typeof window !== 'undefined') {
    const fromHash = (window.location.hash || '').slice(1)
    if (isValidTab(fromHash)) return fromHash
  }
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY) || ''
    if (isValidTab(saved)) return saved
  } catch { /* ignore */ }
  return 'employer'
}

export default function Billing() {
  const [tab, setTab] = useState(getInitialTab)
  const tablistId = useId()
  const employerBtnRef = useRef(null)
  const individualBtnRef = useRef(null)

  // Persist per-session
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, tab) } catch { /* ignore */ }
  }, [tab])

  // Sync URL hash (but don’t cause history spam)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const desired = `#${tab}`
    if (window.location.hash !== desired) {
      // replaceState avoids back-button noise
      window.history.replaceState(null, '', desired)
    }
  }, [tab])

  // React to external hash changes (e.g., deep link or manual edit)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onHash = () => {
      const h = (window.location.hash || '').slice(1)
      if (isValidTab(h)) setTab(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Keyboard nav on tablist
  const onKeyTabs = useCallback((e) => {
    const idx = TABS.indexOf(tab)
    if (idx < 0) return
    const prev = () => setTab(TABS[(idx - 1 + TABS.length) % TABS.length])
    const next = () => setTab(TABS[(idx + 1) % TABS.length])

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault(); next(); break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault(); prev(); break
      case 'Home':
        e.preventDefault(); setTab(TABS[0]); break
      case 'End':
        e.preventDefault(); setTab(TABS[TABS.length - 1]); break
      default:
        break
    }
  }, [tab])

  // Move focus to active tab when tab changes via keyboard
  useEffect(() => {
    const el = tab === 'employer' ? employerBtnRef.current : individualBtnRef.current
    // Only shift focus if keyboard likely used (heuristic: last event was a keydown)
    // Keeping it simple—safe to always focus for accessibility.
    el?.focus?.()
  }, [tab])

  const panelId = useMemo(() => `billing-panel-${tab}`, [tab])
  const activeTabId = tab === 'employer' ? 'billing-tab-employer' : 'billing-tab-individual'

  return (
    <Shell title="Billing">
      {/* Tablist */}
      <div
        id={tablistId}
        role="tablist"
        aria-label="Billing views"
        aria-orientation="horizontal"
        onKeyDown={onKeyTabs}
        style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}
      >
        <TabButton
          ref={employerBtnRef}
          id="billing-tab-employer"
          isActive={tab === 'employer'}
          controls="billing-panel-employer"
          onSelect={() => setTab('employer')}
        >
          Employer
        </TabButton>

        <TabButton
          ref={individualBtnRef}
          id="billing-tab-individual"
          isActive={tab === 'individual'}
          controls="billing-panel-individual"
          onSelect={() => setTab('individual')}
        >
          Individual
        </TabButton>
      </div>

      {/* Active panel */}
      <section
        id={panelId}
        role="tabpanel"
        aria-labelledby={activeTabId}
        tabIndex={0}
      >
        {tab === 'employer' ? <EmployerTab /> : <IndividualTab />}
      </section>
    </Shell>
  )
}

/** Small, reusable tab button—kept local to avoid extra files */
const TabButton = React.forwardRef(function TabButton(
  { id, isActive, controls, onSelect, children },
  ref
) {
  return (
    <button
      id={id}
      ref={ref}
      role="tab"
      aria-selected={isActive}
      aria-controls={controls}
      tabIndex={isActive ? 0 : -1}
      className={`btn ${isActive ? '' : 'outline'}`}
      onClick={onSelect}
      type="button"
      data-testid={id}
    >
      {children}
    </button>
  )
})