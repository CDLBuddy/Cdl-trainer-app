// Path: src/student/profile/Profile.jsx
// ============================================================================
// Student Profile (Schema-driven)
// - Dual readiness (Enrollment & BTW) using pure calculators
// - Debounced autosave (diff-only) + best-effort flush on unload
// - Uploads with field-aware MIME policy (PDF only allowed for payment proof)
// - Visibility rules (payment hidden for employer billing, CDL read-only)
// - Section status plumbing for headers
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import Shell from '@components/Shell.jsx'
import { useToast } from '@components/useToast.js'
import { auth, storage } from '@utils/firebase.js'
import {
  markStudentPermitUploaded,
  markStudentProfileComplete,
  markStudentVehicleUploaded,
} from '@utils/ui-helpers.js'
import { getWalkthroughLabel } from '@walkthrough-data'

// 🔁 Use the barrel under src/lib/user-profile + the DATA-level subscriber
import {
  onUserProfileSnapshot,
  updateUserProfileFields,
} from '@/lib/user-profile'

import styles from './Profile.module.css'
import {
  getBTWReadiness,
  getEnrollmentReadiness,
  getSectionStatus,
} from './schema/calculators.js'
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
const MAX_UPLOAD_MB = 8

// Fields that must be images (schema has validate.image: true for these)
const IMAGE_ONLY_FIELDS = new Set([
  'profilePicUrl',
  'permitPhotoUrl',
  'driverLicenseUrl',
  'medicalCardUrl',
  'truckPlateUrl',
  'trailerPlateUrl',
])

// Only this field can be PDF (images still allowed)
const PDF_OK_FIELDS = new Set(['paymentProofUrl'])

const getCurrentUserEmail = () =>
  auth?.currentUser?.email ||
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

  // Unified profile state (safe initial shape)
  const [p, setP] = useState({
    // basic
    name: '',
    dob: '',
    profilePicUrl: '',
    // cdl / admin-owned
    cdlClass: '',
    overlays: [],
    // assignments
    assignedCompany: '',
    assignedInstructor: '',
    // permit
    cdlPermit: '',
    permitPhotoUrl: '',
    permitExpiry: '',
    // license
    driverLicenseUrl: '',
    licenseExpiry: '',
    // medical
    medicalCardUrl: '',
    medCardExpiry: '',
    // vehicle
    vehicleQualified: '',
    truckPlateUrl: '',
    trailerPlateUrl: '',
    // emergency
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    // waiver
    waiverSigned: false,
    waiverSignature: '',
    // course / billing (admin)
    course: '',
    billing: { mode: '' },
    // payment (student only when individual)
    paymentStatus: '',
    paymentProofUrl: '',
    // meta
    status: 'active',
    role: 'student',
    verified: {},
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Refs for live-sync/autosave behavior
  const mountedRef = useRef(true)
  const serverRef = useRef(/** @type {null|object} */ (null))
  const dirtyRef = useRef(false)
  const autosaveTimer = useRef(/** @type {any} */ (null))
  const unsubRef = useRef(/** @type {null|(() => void)} */ (null))

  /* ----------------------------- Derived flags --------------------------- */
  const isEmployerPaid =
    (byPath(p, 'billing.mode') || '').toLowerCase() === 'employer'
  const verified = useMemo(() => p?.verified || {}, [p?.verified])

  // Dual readiness (0–100)
  const enrollmentPct = useMemo(() => getEnrollmentReadiness(p), [p])
  const btwPct = useMemo(() => getBTWReadiness(p), [p])

  // Per-section status for SectionHeader chips
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
    mountedRef.current = true
    if (!email) {
      showToast('You must be logged in to view your profile.', 'error')
      navigate('/login', { replace: true })
      return
    }

    // ✅ Use the data-level subscriber (gives plain object or null)
    unsubRef.current = onUserProfileSnapshot(email, (incoming) => {
      if (!mountedRef.current) return
      const role = incoming?.role || localStorage.getItem('userRole') || 'student'
      if (role !== 'student') {
        showToast('Access denied: Student profile only.', 'error')
        navigate('/student/dashboard', { replace: true })
        return
      }

      serverRef.current = incoming || {}
      setP((prev) => ({ ...prev, ...(incoming || {}) }))
      dirtyRef.current = false
      setLoading(false)
    })

    return () => {
      mountedRef.current = false
      try {
        unsubRef.current?.()
      } catch {
        // no-op
      }
    }
  }, [email, navigate, showToast])

  /* ------------------------------- Mutators ------------------------------- */
  const setField = useCallback((key, val) => {
    dirtyRef.current = true
    setP((prev) => ({ ...prev, [key]: val }))
  }, [])

  const toggleInArray = useCallback((key, val) => {
    dirtyRef.current = true
    setP((prev) => {
      const set = new Set(prev[key] || [])
      set.has(val) ? set.delete(val) : set.add(val)
      return { ...prev, [key]: Array.from(set) }
    })
  }, [])

  /* -------------------------------- Uploads ------------------------------- */
  const handleUpload = useCallback(
    async (file, path, field, checklistFn) => {
      if (!file || !email) return

      if (!storage) {
        showToast('Uploads are not configured for this environment.', 'error')
        return
      }

      // Size guard
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        showToast(`File too large (>${MAX_UPLOAD_MB}MB).`, 'error')
        return
      }

      // MIME guard based on field
      const isImg = /^image\//.test(file.type || '')
      const isPdf = file.type === 'application/pdf'

      const mustBeImage = IMAGE_ONLY_FIELDS.has(field)
      const pdfAllowed = PDF_OK_FIELDS.has(field)

      const mimeOk =
        (mustBeImage && isImg) ||
        (!mustBeImage && (isImg || (pdfAllowed && isPdf)))

      if (!mimeOk) {
        showToast(
          mustBeImage
            ? 'Please upload an image (JPG/PNG/WEBP).'
            : pdfAllowed
              ? 'Please upload an image or PDF.'
              : 'Unsupported file type.',
          'error'
        )
        return
      }

      try {
        const storageRef = ref(
          storage,
          `${path}/${email}-${Date.now()}-${file.name}`
        )
        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)
        setField(field, url)
        showToast('Upload successful.', 'success')
        if (typeof checklistFn === 'function') {
          checklistFn(email).catch(() => {})
        }
      } catch (e) {
        console.error(e)
        showToast(`Failed to upload file.`, 'error')
      }
    },
    [email, setField, showToast]
  )

  // Reactive checklist marks (vehicle + permit)
  useEffect(() => {
    if (p.truckPlateUrl && p.trailerPlateUrl && email) {
      markStudentVehicleUploaded(email).catch(() => {})
    }
  }, [p.truckPlateUrl, p.trailerPlateUrl, email])

  useEffect(() => {
    if (p.cdlPermit === 'yes' && p.permitPhotoUrl && email) {
      markStudentPermitUploaded(email).catch(() => {})
    }
  }, [p.cdlPermit, p.permitPhotoUrl, email])

  /* ---------------------------- Debounced Save ---------------------------- */
  const computeDiff = useCallback((prevObj, nextObj) => {
    const diff = {}
    const keys = new Set([
      ...Object.keys(prevObj || {}),
      ...Object.keys(nextObj || {}),
    ])
    keys.forEach((k) => {
      const pv = prevObj ? prevObj[k] : undefined
      const nv = nextObj ? nextObj[k] : undefined
      if (pv !== nv) diff[k] = nv
    })
    return diff
  }, [])

  const flushAutosave = useCallback(async () => {
    if (!email || !dirtyRef.current || saving) return
    setSaving(true)
    try {
      const diff = computeDiff(serverRef.current || {}, p)
      if (Object.keys(diff).length) {
        const res = await updateUserProfileFields(email, diff, email)
        if (res?.success) {
          // Sync local server snapshot to the version we just saved
          serverRef.current = { ...(serverRef.current || {}), ...diff }
          markStudentProfileComplete(email).catch(() => {})
          dirtyRef.current = false
        }
      } else {
        dirtyRef.current = false
      }
    } catch (e) {
      console.error(e)
      showToast('Auto-save failed. Check your connection.', 'error')
    } finally {
      if (mountedRef.current) setSaving(false)
    }
  }, [email, p, saving, showToast, computeDiff])

  const requestAutosave = useCallback(() => {
    if (!email || !dirtyRef.current) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(flushAutosave, AUTOSAVE_DEBOUNCE_MS)
  }, [email, flushAutosave])

  useEffect(() => {
    requestAutosave()
  }, [p, requestAutosave])

  // Flush on tab close / route unload
  useEffect(() => {
    const beforeUnload = (e) => {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushAutosave().catch(() => {})
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [flushAutosave])

  /* -------------------------------- States -------------------------------- */
  if (loading) {
    return (
      <Shell title="Student Profile">
        <div className={styles.loading}>
          <div className="spinner" aria-hidden="true" />
          <p role="status" aria-live="polite">
            Loading profile…
          </p>
        </div>
      </Shell>
    )
  }

  if (p.status && p.status !== 'active') {
    return (
      <Shell title="Student Profile">
        <div className={styles.inactive}>
          <h2>Profile inactive</h2>
          <p>Please contact your instructor or school admin.</p>
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
          <div
            className={styles.progressFill}
            style={{ width: `${enrollmentPct}%` }}
          />
          <span className={styles.progressLabel}>
            Enrollment: {enrollmentPct}%
          </span>
        </div>

        <div
          className={`${styles.progressBar} ${styles.progressBarSecondary}`}
          role="progressbar"
          aria-label="Behind-the-wheel readiness"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={btwPct}
        >
          <div
            className={styles.progressFill}
            style={{ width: `${btwPct}%` }}
          />
          <span className={styles.progressLabel}>BTW: {btwPct}%</span>
        </div>
      </div>

      <form
        className={styles.form}
        onSubmit={(e) => e.preventDefault()}
        autoComplete="off"
      >
        {/* Each section renders its own SectionHeader using status + verified */}
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
        <div className={styles.saveState} aria-live="polite">
          {saving ? 'Saving…' : 'All changes saved'}
        </div>
      </div>

      <div className={styles.afterNote}>
        <strong>Your assigned CDL Class:</strong>{' '}
        <span>
          {getWalkthroughLabel?.(p.cdlClass) || <i>Not set by admin</i>}
        </span>
      </div>
    </Shell>
  )
}