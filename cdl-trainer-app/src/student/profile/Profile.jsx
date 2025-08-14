// src/student/profile/Profile.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

import Shell from '@components/Shell.jsx'
import { useToast } from '@components/ToastContext'
import { auth, storage } from '@utils/firebase.js'
import { getWalkthroughLabel } from '@walkthrough'

// Centralized profile utils (phase 2)
import {
  subscribeUserProfile,
  updateUserProfileFields,
  calculateProfileCompletion,
} from '@utils/userProfile.js'

// Sections
import BasicInfoSection from './sections/BasicInfoSection.jsx'
import CdlSection from './sections/CdlSection.jsx'
import PermitSection from './sections/PermitSection.jsx'
import LicenseSection from './sections/LicenseSection.jsx'
import MedicalSection from './sections/MedicalSection.jsx'
import VehicleSection from './sections/VehicleSection.jsx'
import EmergencySection from './sections/EmergencySection.jsx'
import WaiverSection from './sections/WaiverSection.jsx'
import CoursePaymentSection from './sections/CoursePaymentSection.jsx'

// Styles (page-scoped)
import styles from './Profile.module.css'

// Misc
import {
  markStudentProfileComplete,
  markStudentPermitUploaded,
  markStudentVehicleUploaded,
} from '@utils/ui-helpers.js'

const AUTOSAVE_DEBOUNCE_MS = 700
const PHONE_PATTERN = '[0-9\\-\\(\\)\\+ ]{10,15}'

const getCurrentUserEmail = () =>
  auth.currentUser?.email ||
  window.currentUserEmail ||
  localStorage.getItem('currentUserEmail') ||
  null

export default function Profile() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const email = getCurrentUserEmail()

  // Local form state (single object)
  const [p, setP] = useState({
    // basic
    name: '', dob: '', profilePicUrl: '',
    // cdl
    cdlClass: '', endorsements: [], restrictions: [], experience: '',
    // assignments
    assignedCompany: '', assignedInstructor: '',
    // permit
    cdlPermit: '', permitPhotoUrl: '', permitExpiry: '',
    // license
    driverLicenseUrl: '', licenseExpiry: '',
    // med card
    medicalCardUrl: '', medCardExpiry: '',
    // vehicle
    vehicleQualified: '', truckPlateUrl: '', trailerPlateUrl: '',
    // emergency
    emergencyName: '', emergencyPhone: '', emergencyRelation: '',
    // waiver
    waiverSigned: false, waiverSignature: '',
    // course/schedule
    course: '', schedulePref: '', scheduleNotes: '',
    // payment
    paymentStatus: '', paymentProofUrl: '',
    // meta
    status: 'active', role: 'student', profileProgress: 0,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Keep a snapshot of what came from the server to avoid save loops
  const serverRef = useRef(null)
  // Track if the latest change is user-initiated (vs. server push)
  const dirtyRef = useRef(false)
  const autosaveTimer = useRef(null)
  const unsubRef = useRef(null)

  const progress = useMemo(() => calculateProfileCompletion(p), [p])

  /* ----------------------------- Guards & Boot ----------------------------- */
  useEffect(() => {
    if (!email) {
      showToast('You must be logged in to view your profile.', 'error')
      navigate('/login', { replace: true })
      return
    }

    // Live subscribe to profile
    unsubRef.current = subscribeUserProfile(email, data => {
      // First load or server-side change
      const incoming = data || {}
      // Guard: ensure only students see this page
      const role = incoming.role || localStorage.getItem('userRole') || 'student'
      if (role !== 'student') {
        showToast('Access denied: Student profile only.', 'error')
        navigate('/student/dashboard', { replace: true })
        return
      }

      serverRef.current = incoming
      setP(prev => ({ ...prev, ...incoming }))
      setLoading(false)
      // Any active dirty flag should be reset after accepting server state
      dirtyRef.current = false
    })

    return () => {
      if (unsubRef.current) unsubRef.current()
    }
  }, [email, navigate, showToast])

  /* ---------------------------- Field Mutators ---------------------------- */
  const setField = useCallback((key, val) => {
    dirtyRef.current = true
    setP(prev => ({ ...prev, [key]: val }))
  }, [])

  const toggleInArray = useCallback((key, val) => {
    dirtyRef.current = true
    setP(prev => {
      const set = new Set(prev[key] || [])
      set.has(val) ? set.delete(val) : set.add(val)
      return { ...prev, [key]: [...set] }
    })
  }, [])

  /* ------------------------------- Uploads -------------------------------- */
  const handleUpload = useCallback(
    async (file, path, field, checklistFn) => {
      if (!file || !email) return
      try {
        const storageRef = ref(storage, `${path}/${email}-${Date.now()}-${file.name}`)
        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)
        setField(field, url) // triggers autosave
        showToast(`${field.replace(/Url$/, '')} uploaded!`, 'success')
        if (typeof checklistFn === 'function') {
          checklistFn(email).catch(() => {})
        }
      } catch (e) {
        console.error(e)
        showToast(`Failed to upload ${field}.`, 'error')
      }
    },
    [email, setField, showToast]
  )

  // Reactive checklist marks
  useEffect(() => {
    if (p.truckPlateUrl && p.trailerPlateUrl) {
      markStudentVehicleUploaded(email).catch(() => {})
    }
  }, [p.truckPlateUrl, p.trailerPlateUrl, email])

  useEffect(() => {
    if (p.cdlPermit === 'yes' && p.permitPhotoUrl) {
      markStudentPermitUploaded(email).catch(() => {})
    }
  }, [p.cdlPermit, p.permitPhotoUrl, email])

  /* ---------------------------- Debounced Save ---------------------------- */
  const requestAutosave = useCallback(() => {
    if (!email) return
    if (!dirtyRef.current) return // only save user-initiated edits

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        // Let the helper recompute progress, merge, and skip no-op writes
        const res = await updateUserProfileFields(email, { ...p }, email)
        if (res?.success) {
          markStudentProfileComplete(email).catch(() => {})
          dirtyRef.current = false
        }
      } catch (e) {
        console.error(e)
        showToast('Auto-save failed. Check your connection.', 'error')
      } finally {
        setSaving(false)
      }
    }, AUTOSAVE_DEBOUNCE_MS)
  }, [email, p, showToast])

  useEffect(() => {
    requestAutosave()
  }, [p, requestAutosave])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [])

  /* -------------------------------- States -------------------------------- */
  if (loading) {
    return (
      <Shell title="Student Profile">
        <div className={styles.loading}>
          <div className="spinner" />
          <p>Loading profile…</p>
        </div>
      </Shell>
    )
  }

  if (p.status && p.status !== 'active') {
    return (
      <Shell title="Student Profile">
        <div className={styles.inactive}>
          <h2>Profile Inactive</h2>
          <p>Please contact your instructor or school admin.</p>
          <button className="btn outline" onClick={() => navigate('/student/dashboard')}>
            ⬅ Dashboard
          </button>
        </div>
      </Shell>
    )
  }

  /* --------------------------------- UI ---------------------------------- */
  return (
    <Shell title="Student Profile">
      {/* Progress bar under Shell’s h1 */}
      <div
        className={styles.progressBar}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        <span className={styles.progressLabel}>{progress}% Complete</span>
      </div>

      <form className={styles.form} onSubmit={e => e.preventDefault()} autoComplete="off">
        <BasicInfoSection value={p} onChange={setField} />
        <CdlSection value={p} onChange={setField} onToggle={toggleInArray} />
        <PermitSection value={p} onChange={setField} onUpload={handleUpload} />
        <LicenseSection value={p} onChange={setField} onUpload={handleUpload} />
        <MedicalSection value={p} onChange={setField} onUpload={handleUpload} />
        <VehicleSection value={p} onChange={setField} onUpload={handleUpload} />
        <EmergencySection value={p} onChange={setField} phonePattern={PHONE_PATTERN} />
        <WaiverSection value={p} onChange={setField} />
        <CoursePaymentSection value={p} onChange={setField} onUpload={handleUpload} />
      </form>

      <div className={styles.footerRow}>
        <button type="button" className="btn outline" onClick={() => navigate('/student/dashboard')}>
          ⬅ Dashboard
        </button>
        <div className={styles.saveState} aria-live="polite">
          {saving ? 'Saving…' : 'All changes saved'}
        </div>
      </div>

      <div className={styles.afterNote}>
        <strong>Your selected CDL Class:</strong>{' '}
        <span>{getWalkthroughLabel?.(p.cdlClass) || <i>Not selected</i>}</span>
      </div>
    </Shell>
  )
}