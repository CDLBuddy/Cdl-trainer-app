// src/student/walkthrough/hooks/useWalkthroughScript.js
// ----------------------------------------------------------------------
// useWalkthroughScript
// - Reads the student's profile (via @user-profile)
// - Resolves school/class/restrictions → walkthrough script (resolveWalkthrough)
// - No Firestore imports here; page stays presentational
// - Admin-compatible: relies on the same fields admin writes (cdlClass, schoolId,
//   overlays, restrictions, course)
// ----------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react'
import { getWalkthroughLabel } from '@walkthrough-data'
import resolveWalkthrough from '@/walkthrough-data/loaders/resolveWalkthrough.js'
import { getUserProfile } from '@user-profile'
import { getCurrentUserEmail } from '../utils/session.js'

// tiny helpers (local, zero-coupling)
const S = x => (x == null ? '' : String(x).trim())
const SU = x => S(x).toUpperCase()

// If admin omitted cdlClass, make a best-effort inference from overlays/course
function inferClassFromProfile(p = {}) {
  const c = SU(p.cdlClass)
  if (c === 'A' || c === 'B' || c === 'C') return c

  // overlays mapping (kept minimal + stable)
  const ovs = Array.isArray(p.overlays) ? p.overlays.map(S) : []
  if (ovs.includes('combination')) return 'A'
  if (ovs.includes('single-vehicle')) return 'B'

  // course keywords (gentle)
  const t = S(p.course).toLowerCase()
  if (/\bclass\s*a\b/.test(t)) return 'A'
  if (/\bclass\s*b\b/.test(t)) return 'B'
  if (/\bclass\s*c\b/.test(t)) return 'C'

  return '' // unknown
}

export default function useWalkthroughScript() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)     // { email, cdlClass, schoolId, name }
  const [script, setScript] = useState(null) // WalkthroughSection[]

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)

      try {
        // 1) Session → email
        const email =
          getCurrentUserEmail() ||
          '' // your util already checks window + localStorage
        if (!email) throw new Error('No active session')

        // 2) Profile (single read; @user-profile is admin’s write path)
        const profile = (await getUserProfile(email)) || {}
        const role = String(profile.role || localStorage.getItem('userRole') || 'student').toLowerCase()
        if (role !== 'student') throw new Error('Student-only page')

        // 3) Resolve school + class (+ restrictions)
        const schoolId =
          S(profile.schoolId) ||
          S(window.schoolId) ||
          S(localStorage.getItem('schoolId')) ||
          'default'

        const classType = inferClassFromProfile(profile) // uses cdlClass → overlays → course
        const restrictions = Array.isArray(profile.restrictions)
          ? profile.restrictions
          : []

        if (!alive) return
        setUser({
          email,
          cdlClass: classType,
          schoolId,
          name: S(profile.name),
        })

        // 4) Load script (supports both resolveWalkthrough call forms)
        let result = null
        try {
          result = await resolveWalkthrough({
            classType,
            schoolId,
            restrictions,
            preferCustom: true,
            softFail: true,
          })
        } catch {
          // fallback: older signature
          result = await resolveWalkthrough(classType, schoolId)
        }

        // Accept either {script,...} or an array
        const sections = Array.isArray(result)
          ? result
          : Array.isArray(result?.script)
            ? result.script
            : []

        if (!alive) return
        setScript(sections)
      } catch (e) {
        if (alive) {
          setUser(null)
          setScript([])
          setError(e instanceof Error ? e : new Error('Failed to load walkthrough'))
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  const cdlLabel = useMemo(
    () => getWalkthroughLabel(user?.cdlClass || ''),
    [user?.cdlClass]
  )

  return { loading, error, user, script, cdlLabel }
}