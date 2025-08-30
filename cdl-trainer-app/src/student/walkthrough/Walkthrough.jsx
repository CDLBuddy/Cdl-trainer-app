// src/student/walkthrough/Walkthrough.jsx
// ======================================================================
// Walkthrough Practice (student)
// - Uses hooks for data (Firestore) + progress updates
// - Four drills (fill/order/type/visual)
// - Encapsulated data access inside hooks (no Firestore imports here)
// - Accessible loading/empty/error states
// - Respects reduced motion for confetti
// - Compatible with admin-selected class/scripts (no profile edits needed)
// ======================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Shell from '@components/Shell.jsx'
import { useToast } from '@components/useToast.js'

import {
  FillClozeDrill,
  OrderStepsDrill,
  TypePhraseDrill,
  VisualRecallDrill,
} from './drills'
import { ScriptViewer, DrillTabs, ProgressBar } from './components'
import { autoTokensFrom } from './utils'
import useWalkthroughScript from './hooks/useWalkthroughScript.js'
import useDrillProgress from './hooks/useDrillProgress.js'

import styles from './walkthrough.module.css'

export default function Walkthrough() {
  const navigate = useNavigate()
  const toast = useToast()

  // Firestore & script loading are handled inside this hook (imports there)
  const { loading, error, user, script, cdlLabel } = useWalkthroughScript()

  // Progress read/update (writes handled inside hook)
  const { completed, count, bootstrap, markDone } = useDrillProgress(user?.email)

  const [currentDrill, setCurrentDrill] = useState('fill') // 'fill' | 'order' | 'type' | 'visual'
  const confettiRef = useRef(null)
  const liveRegionRef = useRef(null)

  // Initial progress fetch when we learn the user
  useEffect(() => {
    if (user?.email) bootstrap()
  }, [user?.email, bootstrap])

  // Confetti helper (reduced-motion aware)
  const showConfetti = useCallback(() => {
    try {
      if (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        return
      }
      const canvas = confettiRef.current
      if (!canvas) return
      canvas.style.display = 'block'
      const ctx = canvas.getContext('2d')
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      for (let i = 0; i < 80; i++) {
        ctx.beginPath()
        ctx.arc(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          Math.random() * 7 + 3,
          0,
          2 * Math.PI
        )
        ctx.fillStyle = `hsl(${Math.random() * 360},95%,70%)`
        ctx.fill()
      }
      setTimeout(() => (canvas.style.display = 'none'), 1500)
    } catch {
      /* ignore drawing errors */
    }
  }, [])

  // When all drills finish, pop confetti (listen to count)
  useEffect(() => {
    if (count === 4) {
      showConfetti()
      // Light reinforcement (hook already saves/marks complete)
      toast.success?.('All drills complete! 🎉')
      // aria-live nudge for SR users
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = 'All drills complete.'
      }
    }
  }, [count, showConfetti, toast])

  // Prefer a critical/passFail section for drills; else first section
  const focusSection = useMemo(() => {
    if (!Array.isArray(script)) return null
    return script.find(s => s.critical || s.passFail) || script[0] || null
  }, [script])

  // Normalize steps for drills (tokens auto-generated when missing)
  const focusSteps = useMemo(() => {
    if (!focusSection?.steps) return []
    return (focusSection.steps || [])
      .map(step => ({
        ...step,
        tokens:
          step.tokens && step.tokens.length
            ? step.tokens
            : autoTokensFrom(step.script),
        text: step.script || step.text || '',
      }))
      .filter(s => s.text)
  }, [focusSection])

  /* -------------------- Render states -------------------- */

  if (loading) {
    return (
      <Shell title="Walkthrough Practice">
        <div className={styles.loading} role="status" aria-live="polite">
          <div className="spinner" aria-hidden />
          <p>Loading walkthrough…</p>
        </div>
      </Shell>
    )
  }

  if (error || !user) {
    return (
      <Shell title="Walkthrough Practice">
        <div className={styles.card} role="alert" aria-live="assertive">
          <h2>🧭 CDL Walkthrough Practice</h2>
          <p>Error loading your session. Please log in again.</p>
          <button className="btn" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </Shell>
    )
  }

  // Admin sets CDL class at enrollment; if missing, show clear, admin-first copy
  if (!user.cdlClass) {
    return (
      <Shell title="Walkthrough Practice">
        <div className={styles.card}>
          <h2>🧭 CDL Walkthrough Practice</h2>
          <div className={styles.alert}>
            ⚠ Your CDL class isn’t set yet. Please contact your instructor or
            admin.
          </div>
        </div>
        <div className={styles.footerRow}>
          <button
            className="btn outline"
            onClick={() => navigate('/student/dashboard')}
          >
            ⬅ Dashboard
          </button>
        </div>
      </Shell>
    )
  }

  if (!script || !script.length) {
    return (
      <Shell title="Walkthrough Practice">
        <div className={styles.card} role="status" aria-live="polite">
          <h2>🧭 CDL Walkthrough Practice</h2>
          <div className={styles.alert}>
            ⚠ No walkthrough script found for <b>{cdlLabel}</b>. Please contact
            your instructor.
          </div>
        </div>
        <div className={styles.footerRow}>
          <button
            className="btn outline"
            onClick={() => navigate('/student/dashboard')}
          >
            ⬅ Dashboard
          </button>
        </div>
      </Shell>
    )
  }

  /* -------------------- Main view -------------------- */

  return (
    <Shell title="Walkthrough Practice">
      {/* live region for completion feedback */}
      <span
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      <div className={styles.metaRow}>
        <div>
          <strong>CDL Class:</strong> {cdlLabel}
        </div>
        {user.schoolId && (
          <div className={styles.schoolBadge}>{String(user.schoolId)}</div>
        )}
      </div>

      {/* Script viewer */}
      <ScriptViewer script={script} />

      {/* Drill progress */}
      <ProgressBar value={count} />

      {/* Drill tabs */}
      <DrillTabs
        current={currentDrill}
        completed={completed}
        onSelect={setCurrentDrill}
      />

      {/* Drill body */}
      <div className={styles.drillBody}>
        {currentDrill === 'fill' && (
          <FillClozeDrill
            steps={focusSteps}                 // [{ text, tokens }]
            onComplete={() => markDone('fill')}
            alreadyComplete={completed.fill}
          />
        )}

        {currentDrill === 'order' && (
          <OrderStepsDrill
            steps={focusSteps.map(s => s.text)} // canonical order
            onComplete={() => markDone('order')}
            alreadyComplete={completed.order}
          />
        )}

        {currentDrill === 'type' && (
          <TypePhraseDrill
            phrase={focusSteps[0]?.text || ''}  // first critical phrase
            onComplete={() => markDone('type')}
            alreadyComplete={completed.type}
            strict={true}
          />
        )}

        {currentDrill === 'visual' && (
          <VisualRecallDrill
            // New API is step-aware but remains backward-compatible
            step={focusSteps.find(s => s.media?.img)}
            fallbackQuestion="At what PSI should the low air warning activate?"
            fallbackAnswer="60"
            onComplete={() => markDone('visual')}
            alreadyComplete={completed.visual}
          />
        )}
      </div>

      <div className={styles.footerRow}>
        <button
          className="btn outline"
          onClick={() => navigate('/student/dashboard')}
        >
          ⬅ Dashboard
        </button>
      </div>

      {/* Confetti canvas (hidden until celebration) */}
      <canvas
        ref={confettiRef}
        className={styles.confetti}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </Shell>
  )
}