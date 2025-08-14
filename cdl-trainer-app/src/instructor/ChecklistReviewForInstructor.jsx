//src/instructor/ChecklistReviewForInstructor.jsx

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore'
import React, { useEffect, useRef, useState } from 'react'

import { useToast } from '@/components/ToastContext.js'
import { db } from '@/utils/firebase.js'
import { formatDate } from '@/utils/ui-helpers.js'

// === FIELD CONFIG (expandable for admin/superadmin) ===
const checklistFields = [
  { key: 'profileVerified', label: 'Profile Approved' },
  { key: 'permitVerified', label: 'Permit Verified' },
  { key: 'vehicleVerified', label: 'Vehicle Verified' },
  { key: 'walkthroughReviewed', label: 'Walkthrough Reviewed' },
  {
    key: 'finalStepCompleted',
    label: 'Final Step: In-person walkthrough & driving portion completed',
  },
]
export default function ChecklistReviewModal({
  studentEmail,
  role = 'instructor',
  open,
  onClose,
}) {
  const { showToast } = useToast()
  const modalRef = useRef()
  const [studentData, setStudentData] = useState({})
  const [auditTrail, setAuditTrail] = useState([])
  const [loading, setLoading] = useState(true)
  const [formState, setFormState] = useState({})
  const [notes, setNotes] = useState('')

  // Fetch student & ELDT progress data
  useEffect(() => {
    if (!open || !studentEmail) return
    const fetchData = async () => {
      setLoading(true)
      let _studentData = {},
        _eldtData = {},
        _auditTrail = []
      try {
        // Profile
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('email', '==', studentEmail))
        const snap = await getDocs(q)
        if (!snap.empty) _studentData = snap.docs[0].data()
        // Progress
        const progressRef = doc(db, 'eldtProgress', studentEmail)
        const progressSnap = await getDoc(progressRef)
        if (progressSnap.exists()) {
          _eldtData = progressSnap.data()
          // Audit history
          const histSnap = await getDocs(collection(progressRef, 'history'))
          _auditTrail = histSnap.docs
            .map(doc => doc.data())
            .sort(
              (a, b) =>
                (b.updatedAt?.toDate?.() || new Date(b.updatedAt)) -
                (a.updatedAt?.toDate?.() || new Date(a.updatedAt))
            )
        }
      } catch (_e) {
        showToast('Checklist fetch error.', 3200, 'error')
      }
      setStudentData(_studentData)
      setStudentData(_studentData)
      setFormState(
        checklistFields.reduce(
          (acc, f) => ({
            ...acc,
            [f.key]: _eldtData[f.key] || false,
          }),
          {}
        )
      )
      setNotes(_eldtData.instructorNotes || '')
      setAuditTrail(_auditTrail)
      setLoading(false)
    }
    fetchData()
  }, [studentEmail, open, showToast])

  // Close on escape, focus trap
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
      // Focus trap: keep focus in modal
      if (
        modalRef.current &&
        !modalRef.current.contains(document.activeElement)
      ) {
        modalRef.current.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    setTimeout(() => modalRef.current?.focus(), 80)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  if (!studentEmail) return null

  // Handlers
  const handleChange = key => e => {
    setFormState(prev => ({ ...prev, [key]: e.target.checked }))
  }
  const handleNotesChange = e => setNotes(e.target.value)

  const handleSubmit = async e => {
    e.preventDefault()
    const updateObj = {}
    checklistFields.forEach(f => {
      updateObj[f.key] = !!formState[f.key]
    })
    updateObj.instructorNotes = notes || ''
    updateObj.updatedAt = serverTimestamp()
    updateObj.updatedBy = localStorage.getItem('currentUserEmail') || ''
    updateObj.role = role

    try {
      const progressRef = doc(db, 'eldtProgress', studentEmail)
      const progressSnap = await getDoc(progressRef)
      if (!progressSnap.exists()) {
        await setDoc(progressRef, { studentEmail })
      }
      await updateDoc(progressRef, updateObj)
      await setDoc(doc(collection(progressRef, 'history')), updateObj)
      showToast('Checklist review saved.', 2200, 'success')
      onClose()
    } catch (err) {
      showToast(
        'Failed to save checklist: ' + (err.message || err),
        4400,
        'error'
      )
    }
  }

  return (
    <div className="modal-overlay fade-in" tabIndex={-1}>
      <div
        className="modal-card checklist-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Checklist Review"
        style={{ maxWidth: 460 }}
      >
        <button
          className="modal-close"
          aria-label="Close"
          onClick={onClose}
          type="button"
        >
          &times;
        </button>
        <h2>Review Student Checklist</h2>
        <div className="profile-row">
          <strong>Name:</strong> {studentData.name || 'Unknown'}
        </div>
        <div className="profile-row">
          <strong>Email:</strong> {studentData.email || studentEmail}
        </div>
        {loading ? (
          <div style={{ margin: '20px 0', textAlign: 'center' }}>
            <div className="spinner" />
            Loading...
          </div>
        ) : (
          <form
            id="checklist-review-form"
            style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}
            onSubmit={handleSubmit}
          >
            {checklistFields.map(f => (
              <label key={f.key}>
                <input
                  type="checkbox"
                  name={f.key}
                  checked={!!formState[f.key]}
                  onChange={handleChange(f.key)}
                />{' '}
                {f.label}
              </label>
            ))}
            <label>
              Instructor Notes:
              <textarea
                name="instructorNotes"
                rows={2}
                maxLength={300}
                style={{ resize: 'vertical' }}
                value={notes}
                onChange={handleNotesChange}
              />
            </label>
            <button type="submit" className="btn primary wide">
              Save Checklist Review
            </button>
            <button
              type="button"
              className="btn outline"
              onClick={onClose}
              id="close-checklist-modal"
            >
              Close
            </button>
          </form>
        )}
        {auditTrail.length > 0 && (
          <details style={{ marginTop: '1.2em' }}>
            <summary>
              <b>Audit Trail (History)</b>
            </summary>
            <div
              style={{
                maxHeight: 120,
                overflow: 'auto',
                fontSize: '0.97em',
                paddingTop: 8,
              }}
            >
              {auditTrail.map((entry, idx) => (
                <div key={idx}>
                  <span style={{ color: '#888' }}>
                    {formatDate(entry.updatedAt)}
                  </span>
                  {' -- '}
                  <b>{entry.role || 'instructor'}</b>
                  {entry.updatedBy
                    ? ' by ' + entry.updatedBy.split('@')[0]
                    : ''}
                  {Object.entries(entry)
                    .filter(
                      ([k]) =>
                        k !== 'updatedAt' && k !== 'role' && k !== 'updatedBy'
                    )
                    .map(([k, v]) => (
                      <span style={{ marginLeft: 7 }} key={k}>
                        {k}:{' '}
                        <b>
                          {v && typeof v === 'boolean' ? (v ? '✔' : '--') : v}
                        </b>
                      </span>
                    ))}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
