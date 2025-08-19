// Path: src/admin/billing/Billing.jsx
// ======================================================================
// Admin • Billing (shell)
// - Two tabs: Employer / Individual
// - Keyboard & a11y friendly tablist (no extra deps)
// - Remembers last-selected tab per session
// - Optional hash-sync (#employer | #individual) for deep links
// ======================================================================

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import Shell from '@components/Shell.jsx'
import EmployerTab from './components/Employer/EmployerTab.jsx'
import IndividualTab from './components/Individual/IndividualTab.jsx'

const TABS = /** @type const */ (['employer', 'individual'])
const isValidTab = (t) => TABS.includes(String(t))

// Read initial tab from URL hash or sessionStorage; fallback to 'employer'
function getInitialTab() {
  const fromHash = (typeof window !== 'undefined' && window.location.hash || '').replace('#', '')
  if (isValidTab(fromHash)) return fromHash
  try {
    const saved = sessionStorage.getItem('admin.billing.tab') || ''
    if (isValidTab(saved)) return saved
  } catch { /* ignore */ }
  return 'employer'
}

export default function Billing() {
  const [tab, setTab] = useState(getInitialTab)

  // Persist selection per-session (so a refresh stays on the same tab)
  useEffect(() => {
    try { sessionStorage.setItem('admin.billing.tab', tab) } catch { /* ignore */ }
  }, [tab])

  // Keep URL hash in sync for deep-links / refresh
  useEffect(() => {
    if (typeof window === 'undefined') return
    const current = (window.location.hash || '').replace('#', '')
    if (current !== tab) window.history.replaceState(null, '', `#${tab}`)
  }, [tab])

  // Keyboard support on the tablist (ArrowLeft/Right and Home/End)
  const onKeyTabs = useCallback((e) => {
    const idx = TABS.indexOf(tab)
    if (idx < 0) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setTab(TABS[(idx + 1) % TABS.length])
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setTab(TABS[(idx - 1 + TABS.length) % TABS.length])
    } else if (e.key === 'Home') {
      e.preventDefault()
      setTab(TABS[0])
    } else if (e.key === 'End') {
      e.preventDefault()
      setTab(TABS[TABS.length - 1])
    }
  }, [tab])

  const panelId = useMemo(() => `billing-panel-${tab}`, [tab])

  return (
    <Shell title="Billing">
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Billing views"
        onKeyDown={onKeyTabs}
        style={{ display: 'flex', gap: 8, marginBottom: 12 }}
      >
        <TabButton
          id="billing-tab-employer"
          isActive={tab === 'employer'}
          controls="billing-panel-employer"
          onSelect={() => setTab('employer')}
        >
          Employer
        </TabButton>

        <TabButton
          id="billing-tab-individual"
          isActive={tab === 'individual'}
          controls="billing-panel-individual"
          onSelect={() => setTab('individual')}
        >
          Individual
        </TabButton>
      </div>

      {/* Panels */}
      <section
        id={panelId}
        role="tabpanel"
        aria-labelledby={tab === 'employer' ? 'billing-tab-employer' : 'billing-tab-individual'}
      >
        {tab === 'employer' ? <EmployerTab /> : <IndividualTab />}
      </section>
    </Shell>
  )
}

/** Small, reusable tab button—kept local to avoid extra files */
function TabButton({ id, isActive, controls, onSelect, children }) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={isActive}
      aria-controls={controls}
      tabIndex={isActive ? 0 : -1}
      className={`btn ${isActive ? '' : 'outline'}`}
      onClick={onSelect}
      type="button"
    >
      {children}
    </button>
  )
}