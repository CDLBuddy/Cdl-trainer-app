//src/student/walkthrough/hooks/useDrillProgress.js
// Robust, studentId-aware drill progress hook (no Firestore in page)
// - Reads/updates via services/progressApi (handles studentId + email fallback)
// - Still calls markStudentWalkthroughComplete(email) for your milestone
import { useCallback, useMemo, useRef, useState } from 'react'
import { useToast } from '@components/useToast.js'
import {
  readProgress,
  writeProgress,
} from '../services' // barrel -> progressApi
import { markStudentWalkthroughComplete } from '@utils/ui-helpers.js'

const TYPES = ['fill', 'order', 'type', 'visual']

export default function useDrillProgress(email, opts = {}) {
  const toast = useToast()
  const schoolId = opts.schoolId || window.schoolId || localStorage.getItem('schoolId') || ''
  const [completed, setCompleted] = useState({ fill: false, order: false, type: false, visual: false })
  const loadingRef = useRef(false)

  // Prime from server (call this after user is known)
  const bootstrap = useCallback(async () => {
    if (!email || loadingRef.current) return
    loadingRef.current = true
    try {
      const prog = (await readProgress({ email, schoolId })) || {}
      setCompleted({
        fill:   !!prog.drills?.fill,
        order:  !!prog.drills?.order,
        type:   !!prog.drills?.type,
        visual: !!prog.drills?.visual,
      })
    } catch {
      // silent: UI stays graceful
    } finally {
      loadingRef.current = false
    }
  }, [email, schoolId])

  // Mark a single drill complete (idempotent in state; tolerant on write)
  const markDone = useCallback(async (type) => {
    if (!email || !TYPES.includes(type)) return

    // optimistic UI
    setCompleted(prev => {
      if (prev[type]) return prev
      return { ...prev, [type]: true }
    })

    try {
      await writeProgress({
        email,
        schoolId,
        patch: {
          [`drills.${type}`]: true,
          [`drills.${type}CompletedAt`]: new Date().toISOString(),
        },
      })

      // if all finished, show a lightweight toast + milestone
      const allDone = TYPES.every(t => (t === type ? true : completed[t]))
      if (allDone) {
        toast.success?.('All drills complete! 🎉')
        // keep your existing milestone call (compatible with your reports)
        await markStudentWalkthroughComplete(email)
      }
    } catch {
      // roll back the optimistic bit if you want; most folks keep it optimistic
      toast.error?.('Error saving progress. Try again.')
      // optional rollback:
      setCompleted(prev => ({ ...prev, [type]: prev[type] && true }))
    }
  }, [email, schoolId, completed, toast])

  const count = useMemo(() => Object.values(completed).filter(Boolean).length, [completed])

  return { completed, count, bootstrap, markDone }
}