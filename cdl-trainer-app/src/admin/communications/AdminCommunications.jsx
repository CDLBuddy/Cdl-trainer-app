// src/admin/communications/AdminCommunications.jsx
// ======================================================================
// Admin • Communications
// - Left: Compose form (channels, audience, schedule)
// - Right: Recent messages + Templates (lazy with skeletons)
// - Auto-refresh history after sends (listens for "comms:messageQueued")
// - Idle preloads side panels for snappier UX
// - A11y + theme-aware layout
// ======================================================================

import React, { lazy, Suspense, useEffect, useState } from 'react'

import Shell from '@components/Shell.jsx'

import cls from './AdminCommunications.module.css'
import ComposeForm from './components/ComposeForm.jsx'

// NOTE: lazy() must import a *real file*. Use the actual component path.
const MessageHistoryTable = lazy(
  () => import('./components/MessageHistoryTable.jsx')
)
const TemplateList = lazy(() => import('./components/TemplateList.jsx'))

function CardSkeleton({ title = 'Loading…' }) {
  return (
    <section className={cls.card} aria-busy="true">
      <header className={cls.cardHeader}>
        <h3 className={cls.cardTitle}>{title}</h3>
      </header>
      <div className={cls.cardBody}>
        <div className={cls.skel} />
        <div className={cls.skel} style={{ width: '80%' }} />
        <div className={cls.skel} style={{ width: '60%' }} />
      </div>
    </section>
  )
}

export default function AdminCommunications() {
  // Increment to force-remount the history table after we send a message.
  const [historyReloadKey, setHistoryReloadKey] = useState(0)

  // Page title
  useEffect(() => {
    const prev = document.title
    document.title = 'Communications • Admin'
    return () => {
      document.title = prev
    }
  }, [])

  // Listen for successful queues from ComposeForm and refresh history
  useEffect(() => {
    const onQueued = () => setHistoryReloadKey(k => k + 1)
    window.addEventListener('comms:messageQueued', onQueued)
    return () => window.removeEventListener('comms:messageQueued', onQueued)
  }, [])

  // Politely warm the right panels on idle (no jank on mount)
  useEffect(() => {
    const warm = () => {
      // Best-effort; ignore failures
      import('./components/MessageHistoryTable.jsx').catch(() => {})
      import('./components/TemplateList.jsx').catch(() => {})
    }
    // @ts-ignore - not in all TS DOM libs
    if (typeof window.requestIdleCallback === 'function') {
      // @ts-ignore
      const id = window.requestIdleCallback(warm, { timeout: 1500 })
      return () => window.cancelIdleCallback?.(id)
    }
    const t = setTimeout(warm, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <Shell title="Communications" showFooter>
      <div className={cls.grid}>
        {/* Left column: Composer */}
        <section className={cls.left} aria-label="Compose message">
          <ComposeForm />
        </section>

        {/* Right column: Recent + Templates */}
        <aside className={cls.right} aria-label="Recent messages and templates">
          <Suspense fallback={<CardSkeleton title="Recent Messages" />}>
            <MessageHistoryTable key={historyReloadKey} take={25} />
          </Suspense>

          <Suspense fallback={<CardSkeleton title="Templates" />}>
            {/* TemplateList will emit `comms:templateSelected`; ComposeForm listens. */}
            <TemplateList />
          </Suspense>
        </aside>
      </div>
    </Shell>
  )
}
