import {
  db,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import ChecklistReviewModal from '@components/ChecklistReviewModal.jsx' // Assume you move modal logic here
import {
  verifyStudentProfile,
  verifyStudentPermit,
  verifyStudentVehicle,
  reviewStudentWalkthrough,
} from '@utils/ui-helpers.js'

import { useToast } from '@/components/ToastContext.js'

export default function InstructorStudentProfile() {
  const { showToast } = useToast()
  const { studentEmail } = useParams()
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)
  const [eldtProgress, setEldtProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const currentInstructorEmail =
    window.currentUserEmail || localStorage.getItem('currentUserEmail') || ''

  // --- Load student data and ELDT progress ---
  useEffect(() => {
    async function fetchData() {
      if (!studentEmail) {
        showToast('No student selected.', 3000, 'error')
        navigate('/instructor-dashboard')
        return
      }
      setLoading(true)
      // Fetch profile
      let user = {}
      try {
        const userRef = doc(db, 'users', studentEmail)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) user = userSnap.data()
        else {
          showToast('Student profile not found.', 4000, 'error')
          navigate('/instructor-dashboard')
          return
        }
      } catch (_e) {
        showToast('Error loading profile.', 4000, 'error')
        navigate('/instructor-dashboard')
        return
      }
      setUserData(user)

      // Fetch ELDT progress
      try {
        const progressRef = doc(db, 'eldtProgress', studentEmail)
        const progressSnap = await getDoc(progressRef)
        if (progressSnap.exists()) setEldtProgress(progressSnap.data())
        else setEldtProgress({})
      } catch (_e) {
        setEldtProgress({})
      }
      setLoading(false)
    }
    fetchData()
    // eslint-disable-next-line
  }, [studentEmail])

  // Approve actions with button disable and instant UI feedback
  const [actions, setActions] = useState({
    profile: false,
    permit: false,
    vehicle: false,
    walkthrough: false,
  })

  useEffect(() => {
    setActions({
      profile: !!eldtProgress?.profileVerified,
      permit: !!eldtProgress?.permitVerified,
      vehicle: !!eldtProgress?.vehicleVerified,
      walkthrough: !!eldtProgress?.walkthroughReviewed,
    })
  }, [eldtProgress])

  if (loading || !userData) {
    return (
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading student profile…</p>
      </div>
    )
  }

  const {
    name = '',
    dob = '',
    profilePicUrl = '',
    cdlClass = '',
    endorsements = [],
    restrictions = [],
    experience = '',
    cdlPermit = '',
    permitPhotoUrl = '',
    permitExpiry = '',
    driverLicenseUrl = '',
    licenseExpiry = '',
    medicalCardUrl = '',
    medCardExpiry = '',
    vehicleQualified = '',
    truckPlateUrl = '',
    trailerPlateUrl = '',
    emergencyName = '',
    emergencyPhone = '',
    emergencyRelation = '',
    waiverSigned = false,
    waiverSignature = '',
    profileProgress = 0,
    studentNotes = '',
  } = userData

  // --- Save instructor note handler ---
  async function handleSaveNote() {
    const note = document.getElementById('instructor-note')?.value.trim()
    if (!note) {
      showToast('Note is empty.', 1700, 'error')
      return
    }
    try {
      const notesRef = collection(
        doc(db, 'users', studentEmail),
        'instructorNotes'
      )
      await addDoc(notesRef, {
        note,
        by: currentInstructorEmail,
        at: serverTimestamp(),
      })
      showToast('Note saved.', 1800, 'success')
      document.getElementById('instructor-note').value = ''
    } catch (_e) {
      showToast('Failed to save note.', 2500, 'error')
    }
  }

  return (
    <div
      className="screen-wrapper fade-in"
      style={{ maxWidth: 540, margin: '0 auto' }}
    >
      <h2>
        👤 Student Profile <span className="role-badge student">Student</span>
        <span
          className="role-badge instructor-view"
          title="You are viewing as an instructor"
        >
          Instructor View
        </span>
      </h2>
      <div
        className="profile-meta"
        style={{
          display: 'flex',
          gap: '1.4rem',
          alignItems: 'center',
          marginBottom: '1.4rem',
        }}
      >
        {profilePicUrl ? (
          <img
            src={profilePicUrl}
            alt="Profile"
            style={{
              width: 64,
              height: 64,
              borderRadius: 13,
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 13,
              background: '#292b49',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2em',
              color: '#b48aff',
            }}
          >
            {(name || '?').charAt(0)}
          </div>
        )}
        <div>
          <div style={{ fontSize: '1.18em', fontWeight: 600 }}>{name}</div>
          <div style={{ color: '#979ad1' }}>
            {cdlClass ? (
              <>
                CDL Class: <b>{cdlClass.toUpperCase()}</b>
              </>
            ) : (
              'No class set'
            )}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.96em' }}>
            {studentEmail}
          </div>
        </div>
      </div>
      <div className="progress-bar" style={{ marginBottom: '1.2rem' }}>
        <div
          className="progress"
          style={{ width: `${profileProgress || 0}%` }}
        ></div>
        <span className="progress-label">{profileProgress || 0}% Complete</span>
      </div>
      <div className="profile-details glass-card" style={{ padding: '1.2rem' }}>
        <div>
          <strong>DOB:</strong> {dob || '-'}
        </div>
        <div>
          <strong>Experience:</strong> {experience || '-'}
        </div>
        <div>
          <strong>Endorsements:</strong>{' '}
          {endorsements.length ? endorsements.join(', ') : '-'}
        </div>
        <div>
          <strong>Restrictions:</strong>{' '}
          {restrictions.length ? restrictions.join(', ') : '-'}
        </div>
        <div>
          <strong>CDL Permit:</strong>{' '}
          {cdlPermit === 'yes' ? '✔️ Yes' : cdlPermit === 'no' ? '❌ No' : '-'}
        </div>
        <div>
          <strong>Permit Photo:</strong>{' '}
          {permitPhotoUrl ? (
            <a
              href={permitPhotoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#b48aff', textDecoration: 'underline' }}
            >
              View
            </a>
          ) : (
            '-'
          )}
        </div>
        <div>
          <strong>Permit Expiry:</strong> {permitExpiry || '-'}
        </div>
        <div>
          <strong>License Upload:</strong>{' '}
          {driverLicenseUrl ? (
            <a
              href={driverLicenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#b48aff', textDecoration: 'underline' }}
            >
              View
            </a>
          ) : (
            '-'
          )}
        </div>
        <div>
          <strong>License Expiry:</strong> {licenseExpiry || '-'}
        </div>
        <div>
          <strong>Medical Card:</strong>{' '}
          {medicalCardUrl ? (
            <a
              href={medicalCardUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#b48aff', textDecoration: 'underline' }}
            >
              View
            </a>
          ) : (
            '-'
          )}
        </div>
        <div>
          <strong>Medical Card Expiry:</strong> {medCardExpiry || '-'}
        </div>
        <div>
          <strong>Vehicle Qualified:</strong>{' '}
          {vehicleQualified === 'yes'
            ? '✔️ Yes'
            : vehicleQualified === 'no'
              ? '❌ No'
              : '-'}
        </div>
        <div>
          <strong>Truck Plate:</strong>{' '}
          {truckPlateUrl ? (
            <a
              href={truckPlateUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#b48aff', textDecoration: 'underline' }}
            >
              View
            </a>
          ) : (
            '-'
          )}
        </div>
        <div>
          <strong>Trailer Plate:</strong>{' '}
          {trailerPlateUrl ? (
            <a
              href={trailerPlateUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#b48aff', textDecoration: 'underline' }}
            >
              View
            </a>
          ) : (
            '-'
          )}
        </div>
        <div>
          <strong>Emergency Contact:</strong> {emergencyName || '-'} (
          {emergencyRelation || ''})<br />
          <span style={{ color: '#b48aff' }}>{emergencyPhone || ''}</span>
        </div>
        <div>
          <strong>Waiver Signed:</strong> {waiverSigned ? '✔️' : '❌'} (
          {waiverSignature || '-'})
        </div>
        <div>
          <strong>Notes:</strong> {studentNotes || '-'}
        </div>
      </div>
      <div
        className="glass-card"
        style={{ marginTop: '1.2rem', padding: '1.2rem' }}
      >
        <strong>Instructor Actions</strong>
        <div
          style={{
            margin: '0.5em 0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.8em',
          }}
        >
          <button
            className="btn outline"
            disabled={actions.profile}
            aria-disabled={actions.profile}
            aria-label="Approve Profile"
            onClick={async _ => {
              if (actions.profile) return
              setActions(prev => ({ ...prev, profile: true }))
              await verifyStudentProfile(studentEmail, currentInstructorEmail)
              showToast('Profile verified!', 2300, 'success')
            }}
          >
            ✔️ Approve Profile{' '}
            {actions.profile && (
              <span style={{ color: '#3ecf8e', marginLeft: 7 }}>✅</span>
            )}
          </button>
          <button
            className="btn outline"
            disabled={actions.permit}
            aria-disabled={actions.permit}
            aria-label="Approve Permit"
            onClick={async _ => {
              if (actions.permit) return
              setActions(prev => ({ ...prev, permit: true }))
              await verifyStudentPermit(studentEmail, currentInstructorEmail)
              showToast('Permit verified!', 2300, 'success')
            }}
          >
            ✔️ Approve Permit{' '}
            {actions.permit && (
              <span style={{ color: '#3ecf8e', marginLeft: 7 }}>✅</span>
            )}
          </button>
          <button
            className="btn outline"
            disabled={actions.vehicle}
            aria-disabled={actions.vehicle}
            aria-label="Approve Vehicle"
            onClick={async _ => {
              if (actions.vehicle) return
              setActions(prev => ({ ...prev, vehicle: true }))
              await verifyStudentVehicle(studentEmail, currentInstructorEmail)
              showToast('Vehicle verified!', 2300, 'success')
            }}
          >
            ✔️ Approve Vehicle{' '}
            {actions.vehicle && (
              <span style={{ color: '#3ecf8e', marginLeft: 7 }}>✅</span>
            )}
          </button>
          <button
            className="btn outline"
            disabled={actions.walkthrough}
            aria-disabled={actions.walkthrough}
            aria-label="Review Walkthrough"
            onClick={async _ => {
              if (actions.walkthrough) return
              setActions(prev => ({ ...prev, walkthrough: true }))
              await reviewStudentWalkthrough(
                studentEmail,
                currentInstructorEmail
              )
              showToast('Walkthrough reviewed!', 2300, 'success')
            }}
          >
            👀 Review Walkthrough{' '}
            {actions.walkthrough && (
              <span style={{ color: '#3ecf8e', marginLeft: 7 }}>✅</span>
            )}
          </button>
        </div>
        <div style={{ margin: '0.7em 0 0.2em 0' }}>
          <textarea
            id="instructor-note"
            style={{ width: '100%', minHeight: 50 }}
            placeholder="Add a note for this student..."
          ></textarea>
          <button
            className="btn"
            style={{ marginTop: 6 }}
            onClick={handleSaveNote}
          >
            💾 Save Note
          </button>
        </div>
        <div>
          <button
            className="btn"
            style={{ marginTop: 14 }}
            onClick={() => navigate('/instructor-dashboard')}
          >
            ⬅ Back to Dashboard
          </button>
        </div>
      </div>
      <div className="glass-card" style={{ marginTop: '1.1rem' }}>
        <button
          className="btn outline"
          onClick={() => setShowChecklistModal(true)}
        >
          📋 Review Full Checklist
        </button>
      </div>
      {showChecklistModal && (
        <ChecklistReviewModal
          studentEmail={studentEmail}
          onClose={() => setShowChecklistModal(false)}
        />
      )}
    </div>
  )
}
