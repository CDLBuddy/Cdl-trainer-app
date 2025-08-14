//src/student/walkthrough/Walkthrough.jsx

import { doc, getDoc } from 'firebase/firestore'
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import Shell from '@components/Shell.jsx'
import { useToast } from '@/components/ToastContext.js'
import { db } from '@utils/firebase.js'
import {
  updateELDTProgress,
  markStudentWalkthroughComplete,
  getUserProgress,
} from '@utils/ui-helpers.js'

// NEW: schema-driven loader (school override -> global default)
import {
  resolveWalkthrough,          // (cdlClass, schoolId) => Promise<WalkthroughSection[]|null>
  getWalkthroughLabel,         // pretty label for class code
} from '../../walkthrough-data' // <-- Update this path as needed to the correct location

// Drills (schema-driven, each accepts generic props)
import FillClozeDrill from './drills/FillClozeDrill.jsx'
import OrderStepsDrill from './drills/OrderStepsDrill.jsx'
import TypePhraseDrill from './drills/TypePhraseDrill.jsx'
import VisualRecallDrill from './drills/VisualRecallDrill.jsx'
import styles from './walkthrough.module.css'

// Robust email fallback (uses session + localStorage)
function getCurrentUserEmail() {
  try {
    return (
      window.currentUserEmail ||
      localStorage.getItem('currentUserEmail') ||
      null
    )
  } catch {
    return null
  }
}

// If a step lacks tokens, we can auto-suggest some (numbers/units/etc.)
function autoTokensFrom(script = '') {
  if (!script) return []
  const nums = [...script.matchAll(/\b\d+(\.\d+)?\s?(psi|sec|seconds|minutes|°|ft|in)\b/gi)].map(m => m[0])
  const words = []
  if (/engine off/i.test(script)) words.push('engine off')
  if (/key on/i.test(script)) words.push('key on')
  if (/parking brake/i.test(script)) words.push('parking brake')
  if (/service brake/i.test(script)) words.push('service brake')
  return Array.from(new Set([...nums, ...words]))
}

export default function Walkthrough() {
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [script, setScript] = useState(null)              // sections[]
  const [currentDrill, setCurrentDrill] = useState('fill')
  const [completedDrills, setCompleted] = useState({ fill: false, order: false, type: false, visual: false })

  const confettiRef = useRef(null)

  // Load user + walkthrough + progress
  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const email = getCurrentUserEmail()
      if (!email) {
        if (!alive) return
        setUser(null)
        setScript(null)
        setLoading(false)
        return
      }

      try {
        const ref = doc(db, 'users', email)
        const snap = await getDoc(ref)
        if (!snap.exists()) throw new Error('User not found')

        const data = snap.data() || {}
        const role = (data.role || localStorage.getItem('userRole') || 'student').toLowerCase()
        if (role !== 'student') throw new Error('Student-only page')

        // school + class
        const schoolId = data.schoolId || data.schoolName || 'default'
        const cdlClass = String(data.cdlClass || '').trim().toUpperCase()

        // hydrate user
        if (!alive) return
        setUser({ email, cdlClass, schoolId, name: data.name || '' })

        // resolve walkthrough (school override -> global default)
        const sections = await resolveWalkthrough(cdlClass, schoolId)
        if (!alive) return
        setScript(sections || null)

        // progress (drills)
        let prog = {}
        try {
          prog = (await getUserProgress(email)) || {}
        } catch {
          prog = {}
        }
        if (!alive) return
        setCompleted({
          fill: !!prog.drills?.fill,
          order: !!prog.drills?.order,
          type: !!prog.drills?.type,
          visual: !!prog.drills?.visual,
        })
      } catch (e) {
        console.error('[Walkthrough] load error:', e)
        if (!alive) return
        setUser(null)
        setScript(null)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const cdlLabel = useMemo(() => getWalkthroughLabel(user?.cdlClass || ''), [user?.cdlClass])

  // Confetti (simple)
  const showConfetti = useCallback(() => {
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
        Math.random() * 7 + 3, 0, 2 * Math.PI
      )
      ctx.fillStyle = `hsl(${Math.random() * 360},95%,70%)`
      ctx.fill()
    }
    setTimeout(() => (canvas.style.display = 'none'), 1500)
  }, [])

  // Mark a drill complete (saves to progress)
  const markDrillComplete = useCallback(async (type) => {
    if (!user?.email || completedDrills[type]) return
    const next = { ...completedDrills, [type]: true }
    setCompleted(next)
    try {
      await updateELDTProgress(user.email, {
        [`drills.${type}`]: true,
        [`drills.${type}CompletedAt`]: new Date().toISOString(),
      })
      const allDone = Object.values(next).every(Boolean)
      if (allDone) {
        showConfetti()
        showToast('🎉 All drills complete! Walkthrough milestone saved.')
        await markStudentWalkthroughComplete(user.email)
      }
    } catch {
      showToast('❌ Error saving progress. Try again.', { type: 'error' })
    }
  }, [user?.email, completedDrills, showConfetti, showToast])

  // Data prep for drills (use the first critical section as a focused set)
  const focusSection = useMemo(() => {
    if (!script || !Array.isArray(script)) return null
    return (
      script.find(s => s.critical || s.passFail) ||
      script[0] ||
      null
    )
  }, [script])

  const focusSteps = useMemo(() => {
    if (!focusSection?.steps) return []
    return focusSection.steps.map(step => ({
      ...step,
      tokens: (step.tokens && step.tokens.length ? step.tokens : autoTokensFrom(step.script)),
      text: step.script || step.text || '',
    })).filter(s => s.text)
  }, [focusSection])

  const numCompleted = useMemo(() => Object.values(completedDrills).filter(Boolean).length, [completedDrills])

  /* ----------------------- Render States ----------------------- */
  if (loading) {
    return (
      <Shell title="Walkthrough Practice">
        <div className={styles.loading}>
          <div className="spinner" />
          <p>Loading walkthrough…</p>
        </div>
      </Shell>
    )
  }

  if (!user) {
    return (
      <Shell title="Walkthrough Practice">
        <div className={styles.card}>
          <h2>🧭 CDL Walkthrough Practice</h2>
          <p>Error loading your session. Please log in again.</p>
          <button className="btn" onClick={() => navigate('/login')}>Go to Login</button>
        </div>
      </Shell>
    )
  }

  if (!user.cdlClass) {
    return (
      <Shell title="Walkthrough Practice">
        <div className={styles.card}>
          <h2>🧭 CDL Walkthrough Practice</h2>
          <div className={styles.alert}>
            ⚠ You haven’t selected your CDL class yet.
            <br />Please open your <strong>Profile</strong> and choose a class so we can load the correct script.
          </div>
          <button className="btn" onClick={() => navigate('/student/profile')}>Go to Profile</button>
        </div>
      </Shell>
    )
  }

  if (!script || !script.length) {
    return (
      <Shell title="Walkthrough Practice">
        <div className={styles.card}>
          <h2>🧭 CDL Walkthrough Practice</h2>
          <div className={styles.alert}>
            ⚠ No walkthrough script found for <b>{cdlLabel}</b>. Please contact your instructor.
          </div>
          <button className="btn outline" onClick={() => navigate('/student/dashboard')}>⬅ Dashboard</button>
        </div>
      </Shell>
    )
  }

  /* ----------------------- Main View ----------------------- */
  return (
    <Shell title="Walkthrough Practice">
      <div className={styles.metaRow}>
        <div><strong>CDL Class:</strong> {cdlLabel}</div>
        {user.schoolId && (
          <div className={styles.schoolBadge}>{String(user.schoolId)}</div>
        )}
      </div>

      {/* Script viewer */}
      <div className={styles.scriptCard} aria-label="Walkthrough script">
        {script.map((section, i) => (
          <section
            key={section.id || i}
            className={`${styles.scriptSection} ${(section.critical || section.passFail) ? styles.critical : ''}`}
          >
            <h3 className={styles.sectionTitle}>
              {(section.critical || section.passFail) ? '🚨' : '✅'} {section.section}
              {(section.critical || section.passFail) && (
                <span className={styles.flag}>(Pass/Fail)</span>
              )}
            </h3>
            <div className={styles.steps}>
              {(section.steps || []).map((step, j) => (
                <p key={step.id || j} className={styles.stepLine}>
                  {step.label && <strong>{step.label}:</strong>} {step.script}
                  {step.mustSay && <em className={styles.mustSay}> (Must Say)</em>}
                  {step.passFail && <em className={styles.passFail}> (Pass/Fail)</em>}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Drill progress */}
      <div className={styles.progressWrap}>
        <progress value={numCompleted} max={4} className={styles.progress} aria-valuemax={4} aria-valuenow={numCompleted} />
        <span className={styles.progressLabel}>{numCompleted}/4 drills completed</span>
      </div>

      {/* Drill tabs */}
      <nav className={styles.drillTabs} aria-label="Drill navigation">
        {['fill', 'order', 'type', 'visual'].map(type => (
          <button
            key={type}
            className={`${styles.tabBtn} ${currentDrill === type ? styles.active : ''} ${completedDrills[type] ? styles.done : ''}`}
            aria-pressed={currentDrill === type}
            onClick={() => setCurrentDrill(type)}
          >
            {type === 'fill' && 'Fill-in-the-Blank'}
            {type === 'order' && 'Ordered Steps'}
            {type === 'type' && 'Typing Challenge'}
            {type === 'visual' && 'Visual Recall'}
            {completedDrills[type] ? ' ✅' : ''}
          </button>
        ))}
      </nav>

      {/* Drill body (schema-driven) */}
      <div className={styles.drillBody}>
        {currentDrill === 'fill' && (
          <FillClozeDrill
            steps={focusSteps}                     // [{ text, tokens, synonyms? }]
            onComplete={() => markDrillComplete('fill')}
            disabled={completedDrills.fill}
          />
        )}
        {currentDrill === 'order' && (
          <OrderStepsDrill
            steps={focusSteps.map(s => s.text)}    // order check on text
            onComplete={() => markDrillComplete('order')}
            disabled={completedDrills.order}
          />
        )}
        {currentDrill === 'type' && (
          <TypePhraseDrill
            phrase={focusSteps[0]?.text || ''}     // simplest: first critical line
            onComplete={() => markDrillComplete('type')}
            disabled={completedDrills.type}
          />
        )}
        {currentDrill === 'visual' && (
          <VisualRecallDrill
            step={focusSteps.find(s => s.media?.img)}  // use first with image if present
            fallbackQuestion="At what PSI should the low air warning activate?"
            fallbackAnswer="60"
            onComplete={() => markDrillComplete('visual')}
            disabled={completedDrills.visual}
          />
        )}
      </div>

      <div className={styles.footerRow}>
        <button className="btn outline" onClick={() => navigate('/student/dashboard')}>⬅ Dashboard</button>
      </div>

      {/* Confetti canvas */}
      <canvas
        ref={confettiRef}
        className={styles.confetti}
        style={{ display: 'none' }}
      />
    </Shell>
  )
}