// src/student/profile/Profile.jsx
// ============================================================================
// Student Profile (Responsibility-shifted, Schema-driven)
// - Dual readiness (Enrollment & BTW) using pure calculators
// - Debounced autosave, resilient uploads
// - Visibility rules (payment hidden for employer billing, CDL info read-only)
// - Section status plumbed for SectionHeader (used inside sections)
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

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
  // calculateProfileCompletion, // legacy single-bar (replaced)
} from '@utils/userProfile.js'

import { getWalkthroughLabel } from '@walkthrough-data'
import {
  getEnrollmentReadiness,
  getBTWReadiness,
  getSectionStatus,
} from './schema/calculators.js'

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

/* Small helper for dotted access (e.g., "billing.mode") */
const byPath = (obj, path) =>
  (path || '').split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj)

/* --------------------------------- Component ----------------------------- */
export default function Profile() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const email = getCurrentUserEmail()

  // Unified profile state
  const [p, setP] = useState({
    // basic
    name: '', dob: '', profilePicUrl: '',
    // cdl / admin-owned
    cdlClass: '', overlays: [], // endorsements/restrictions deprecated in favor of overlays
    // assignments
    assignedCompany: '', assignedInstructor: '',
    // permit
    cdlPermit: '', permitPhotoUrl: '', permitExpiry: '',
    // license
    driverLicenseUrl: '', licenseExpiry: '',
    // medical
    medicalCardUrl: '', medCardExpiry: '',
    // vehicle
    vehicleQualified: '', truckPlateUrl: '', trailerPlateUrl: '',
    // emergency
    emergencyName: '', emergencyPhone: '', emergencyRelation: '',
    // waiver
    waiverSigned: false, waiverSignature: '',
    // course / billing (admin)
    course: '', billing: { mode: '' },
    // payment (student only when individual)
    paymentStatus: '', paymentProofUrl: '',
    // meta
    status: 'active', role: 'student', verified: {},
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Refs for live-sync/autosave behavior
  const serverRef = useRef(null)
  const dirtyRef = useRef(false)
  const autosaveTimer = useRef(null)
  const unsubRef = useRef(null)

  /* ----------------------------- Derived flags --------------------------- */
  const isEmployerPaid = (byPath(p, 'billing.mode') || '').toLowerCase() === 'employer'
  const verified = p?.verified || {}

  // Dual readiness (0–100)
  const enrollmentPct = useMemo(() => getEnrollmentReadiness(p), [p])
  const btwPct = useMemo(() => getBTWReadiness(p), [p])

  // Per-section status for SectionHeader chips (sections will use these)
  const sectionStatus = useMemo(
    () => ({
      basicInfo: getSectionStatus('basicInfo', p, verified),
      cdlInfo: getSectionStatus('cdlInfo', p, verified),
      permit: getSectionStatus('permit', p, verified),
      license: getSectionStatus('license', p, verified),
      medical: getSectionStatus('medical', p, verified),
      vehicle: getSectionStatus('vehicle', p, verified),
      emergency: getSectionStatus('emergency', p, verified),
      waiver: getSectionStatus('waiver', p, verified),
      payment: getSectionStatus('payment', p, verified),
      assignments: getSectionStatus('assignments', p, verified),
    }),
    [p, verified]
  )

  /* ----------------------------- Guard + Subscribe ------------------------ */
  useEffect(() => {
    if (!email) {
      showToast('You must be logged in to view your profile.', 'error')
      navigate('/login', { replace: true })
      return
    }

    unsubRef.current = subscribeUserProfile(email, data => {
      const incoming = data || {}
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

  // Reactive checklist marks (vehicle + permit)
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
      {/* Dual progress group */}
      <div className={styles.progressGroup} aria-live="polite">
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-label="Enrollment readiness"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={enrollmentPct}
        >
          <div className={styles.progressFill} style={{ width: `${enrollmentPct}%` }} />
          <span className={styles.progressLabel}>Enrollment: {enrollmentPct}%</span>
        </div>

        <div
          className={`${styles.progressBar} ${styles.progressBarSecondary}`}
          role="progressbar"
          aria-label="Behind-the-wheel readiness"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={btwPct}
        >
          <div className={styles.progressFill} style={{ width: `${btwPct}%` }} />
          <span className={styles.progressLabel}>BTW: {btwPct}%</span>
        </div>
      </div>

      <form className={styles.form} onSubmit={e => e.preventDefault()} autoComplete="off">
        {/* Each section will render its own SectionHeader using status + verified */}
        <BasicInfoSection
          value={p}
          onChange={setField}
          status={sectionStatus.basicInfo}
          verifiedBy={verified?.by}
          verifiedAt={verified?.at}
        />

        {/* CDL info is admin-owned → read-only */}
        <CdlSection
          value={p}
          onChange={setField}
          onToggle={toggleInArray}
          readOnly
          status={sectionStatus.cdlInfo}
          verifiedBy={verified?.by}
          verifiedAt={verified?.at}
        />

        <PermitSection
          value={p}
          onChange={setField}
          onUpload={handleUpload}
          status={sectionStatus.permit}
          verifiedBy={verified?.by}
          verifiedAt={verified?.at}
        />

        <LicenseSection
          value={p}
          onChange={setField}
          onUpload={handleUpload}
          status={sectionStatus.license}
          verifiedBy={verified?.by}
          verifiedAt={verified?.at}
        />

        <MedicalSection
          value={p}
          onChange={setField}
          onUpload={handleUpload}
          status={sectionStatus.medical}
          verifiedBy={verified?.by}
          verifiedAt={verified?.at}
        />

        <VehicleSection
          value={p}
          onChange={setField}
          onUpload={handleUpload}
          status={sectionStatus.vehicle}
          verifiedBy={verified?.by}
          verifiedAt={verified?.at}
        />

        <EmergencySection
          value={p}
          onChange={setField}
          phonePattern={PHONE_PATTERN}
          status={sectionStatus.emergency}
          verifiedBy={verified?.by}
          verifiedAt={verified?.at}
        />

        <WaiverSection
          value={p}
          onChange={setField}
          status={sectionStatus.waiver}
          verifiedBy={verified?.by}
          verifiedAt={verified?.at}
        />

        {/* Payment is hidden when employer-paid */}
        {!isEmployerPaid && (
          <CoursePaymentSection
            value={p}
            onChange={setField}
            onUpload={handleUpload}
            status={sectionStatus.payment}
            verifiedBy={verified?.by}
            verifiedAt={verified?.at}
          />
        )}
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
        <strong>Your assigned CDL Class:</strong>{' '}
        <span>{getWalkthroughLabel?.(p.cdlClass) || <i>Not set by admin</i>}</span>
      </div>
    </Shell>
  )
}
