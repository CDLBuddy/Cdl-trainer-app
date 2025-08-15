// src/student/profile/Profile.jsx
// ============================================================================
// Student Profile
// - Uses barrel imports for sections & UI atoms
// - Debounced autosave, upload helpers, and checklist side-effects
// - Guarded access + progress bar
// ============================================================================

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Shell from '@components/Shell.jsx'
import { useToast } from '@components/ToastContext.js'
import { auth, storage } from '@utils/firebase.js'
import {
  markStudentProfileComplete,
  markStudentPermitUploaded,
  markStudentVehicleUploaded,
} from '@utils/ui-helpers.js'
import {
  subscribeUserProfile,
  updateUserProfileFields,
  calculateProfileCompletion,
} from '@utils/userProfile.js'

import { getWalkthroughLabel } from '@walkthrough-data'

import styles from './Profile.module.css'
// Sections via barrel
import {
  BasicInfoSection,
  CdlSection,
  CoursePaymentSection,
  EmergencySection,
  LicenseSection,
  MedicalSection,
  PermitSection,
  VehicleSection,
  WaiverSection,
} from './sections'

// (Optional) UI atoms via barrel if needed:
// import { Field, Select, UploadField, CheckboxGroup } from './ui'

/* --------------------------------- Consts -------------------------------- */
const AUTOSAVE_DEBOUNCE_MS = 700
const PHONE_PATTERN = '[0-9\\-\\(\\)\\+ ]{10,15}'

const getCurrentUserEmail = () =>
  auth.currentUser?.email ||
  window.currentUserEmail ||
  localStorage.getItem('currentUserEmail') ||
  null

/* --------------------------------- Component ----------------------------- */
export default function Profile() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const email = getCurrentUserEmail()

  // Single object for form state (easy save/merge)
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

  // Refs to manage live-sync/autosave behavior
  const serverRef = useRef(null)
  const dirtyRef = useRef(false)
  const autosaveTimer = useRef(null)
  const unsubRef = useRef(null)

  // Derived
  const progress = useMemo(() => calculateProfileCompletion(p), [p])

  /* ----------------------------- Guard + Subscribe ------------------------ */
  useEffect(() => {
    if (!email) {
      showToast('You must be logged in to view your profile.', 'error')
      navigate('/login', { replace: true })
      return
    }

    // Live subscribe to user profile
    unsubRef.current = subscribeUserProfile(email, data => {
      const incoming = data || {}

      // Guard role
      const role = incoming.role || localStorage.getItem('userRole') || 'student'
      if (role !== 'student') {
        showToast('Access denied: Student profile only.', 'error')
        navigate('/student/dashboard', { replace: true })
        return
      }

      serverRef.current = incoming
      setP(prev => ({ ...prev, ...incoming }))
      dirtyRef.current = false
      setLoading(false)
    })

    return () => unsubRef.current?.()
  }, [email, navigate, showToast])

  /* ------------------------------- Mutators ------------------------------- */
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

  /* -------------------------------- Uploads ------------------------------- */
  const handleUpload = useCallback(
    async (file, path, field, checklistFn) => {
      if (!file || !email) return
      try {
        const storageRef = ref(storage, `${path}/${email}-${Date.now()}-${file.name}`)
        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)
        setField(field, url)
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
    if (!email || !dirtyRef.current) return

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
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

  /* -------------------------------- Render -------------------------------- */
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