import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore'
import {
  uploadBytes,
  getDownloadURL,
  ref as storageRef,
} from 'firebase/storage'
import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { db, storage } from '@utils/firebase.js'
import { getCurrentSchoolBranding } from '@utils/school-branding.js'
// import { showToast } from '@utils/ui-helpers.js'
import { useToast } from '@utils/ui-helpers.js'

export default function InstructorProfile() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [brand, setBrand] = useState({})
  const [profile, setProfile] = useState({})
  const [loading, setLoading] = useState(true)
  const [profilePicPreview, setProfilePicPreview] = useState('')
  const fileInputRef = useRef()

  // Get current instructor email (auth context in real app)
  const currentUserEmail =
    window.currentUserEmail || localStorage.getItem('currentUserEmail') || null

  // Fetch branding and profile data
  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const _brand = (await getCurrentSchoolBranding?.()) || {}
      setBrand(_brand)

      if (!currentUserEmail) {
        showToast('No user found. Please log in again.')
        navigate('/login')
        return
      }
      let userData = {}
      try {
        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('email', '==', currentUserEmail))
        const snap = await getDocs(q)
        if (!snap.empty) userData = snap.docs[0].data()
      } catch (_e) {
        userData = {}
      }
      setProfile(userData)
      setProfilePicPreview(userData.profilePicUrl || '')
      setLoading(false)
    }
    fetchAll()
    // eslint-disable-next-line
  }, [currentUserEmail])

  // Save handler
  async function handleSubmit(e) {
    e.preventDefault()
    const form = e.target
    const fd = new FormData(form)

    const name = fd.get('name')?.trim() || ''
    const experience = fd.get('experience') || ''
    const phone = fd.get('phone')?.trim() || ''
    const availability = fd.get('availability')?.trim() || ''
    const licenseClass = fd.get('licenseClass') || ''
    const licenseNumber = fd.get('licenseNumber')?.trim() || ''
    const licenseExp = fd.get('licenseExp') || ''
    const preferredContact = fd.get('preferredContact') || ''
    const feedback = fd.get('feedback')?.trim() || ''

    try {
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('email', '==', currentUserEmail))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const userDocRef = snap.docs[0].ref
        await updateDoc(userDocRef, {
          name,
          experience,
          phone,
          availability,
          licenseClass,
          licenseNumber,
          licenseExp,
          preferredContact,
          feedback,
        })
        localStorage.setItem('fullName', name)
        showToast('✅ Profile saved!')
        window.location.reload() // Force fresh compliance check & fields
      } else {
        throw new Error('User document not found')
      }
    } catch (err) {
      showToast('❌ Error saving profile: ' + err.message)
    }
  }

  // Profile picture upload
  async function handlePicUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const storagePath = `profilePics/${currentUserEmail}`
      const refPic = storageRef(storage, storagePath)
      await uploadBytes(refPic, file)
      const downloadURL = await getDownloadURL(refPic)
      // Save to Firestore
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('email', '==', currentUserEmail))
      const snap = await getDocs(q)
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, {
          profilePicUrl: downloadURL,
        })
      }
      setProfilePicPreview(downloadURL)
      showToast('Profile picture uploaded!')
    } catch (err) {
      showToast('Failed to upload profile picture: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <div className="spinner" />
        <p>Loading instructor profile…</p>
      </div>
    )
  }

  const {
    name = '',
    email = currentUserEmail,
    experience = '',
    phone = '',
    availability = '',
    licenseClass = '',
    licenseNumber = '',
    licenseExp = '',
    preferredContact = '',
    sessionLog = [],
    feedback = '',
    adminNotes = '',
    active = true,
    assignedStudents = [],
  } = profile

  const accent = brand.primaryColor || '#b48aff'
  const complianceMissing = !licenseClass || !licenseNumber || !licenseExp
  const complianceAlert = complianceMissing ? (
    <div className="alert warning" style={{ marginBottom: '1em' }}>
      ⚠️ Please complete your instructor license info below.
    </div>
  ) : (
    <div className="alert success" style={{ marginBottom: '1em' }}>
      ✅ All required compliance info current!
    </div>
  )

  // Assigned students (read only)
  const assignedStudentsHtml =
    Array.isArray(assignedStudents) && assignedStudents.length ? (
      assignedStudents.map((s, i) => (
        <div key={s.email || i}>
          #{i + 1}: {s.name || s.email}
        </div>
      ))
    ) : (
      <i>No students assigned yet.</i>
    )

  // Session log (read only)
  const sessionLogHtml =
    Array.isArray(sessionLog) && sessionLog.length ? (
      sessionLog.map((s, i) => (
        <div key={i}>
          #{i + 1}: {s.date || '--'} &mdash; {s.type || 'Session'} &mdash;{' '}
          {s.student || ''}
        </div>
      ))
    ) : (
      <i>No sessions logged yet.</i>
    )

  return (
    <div
      className="screen-wrapper fade-in profile-page"
      style={{ maxWidth: 540, margin: '0 auto' }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.2rem',
        }}
      >
        <span style={{ fontSize: '1.25em', fontWeight: 500, color: accent }}>
          {brand.schoolName || 'CDL Trainer'}
        </span>
        {brand.logoUrl && (
          <img
            src={brand.logoUrl}
            alt="School Logo"
            className="dashboard-logo"
            style={{ maxWidth: 75, verticalAlign: 'middle' }}
          />
        )}
      </header>
      <h2 style={{ color: accent }}>
        👤 Instructor Profile{' '}
        <span
          className="role-badge instructor"
          style={{ background: accent, color: '#fff' }}
        >
          Instructor
        </span>
      </h2>
      {complianceAlert}
      <form
        id="instructor-profile-form"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        <label>
          Name:
          <input type="text" name="name" defaultValue={name} required />
        </label>
        <label>
          Email:
          <span style={{ userSelect: 'all' }}>{email}</span>
        </label>
        <label>
          Profile Picture:
          <input
            type="file"
            name="profilePic"
            accept="image/*"
            onChange={handlePicUpload}
            ref={fileInputRef}
          />
          {profilePicPreview && (
            <img
              src={profilePicPreview}
              alt={name ? `${name}'s profile` : 'Profile'}
              style={{
                maxWidth: 90,
                borderRadius: 12,
                display: 'block',
                marginTop: 7,
              }}
            />
          )}
        </label>
        <label>
          Phone:
          <input
            type="tel"
            name="phone"
            defaultValue={phone}
            placeholder="(Optional)"
          />
        </label>
        <label>
          Experience:
          <select name="experience" defaultValue={experience} required>
            <option value="">Select</option>
            <option value="none">No experience</option>
            <option value="1-2">1-2 years</option>
            <option value="3-5">3-5 years</option>
            <option value="6-10">6-10 years</option>
            <option value="10+">10+ years</option>
          </select>
        </label>
        <details>
          <summary>
            <strong>Availability &amp; Schedule</strong>
          </summary>
          <label>
            Days/Times Available:
            <br />
            <input
              type="text"
              name="availability"
              defaultValue={availability}
              placeholder="e.g. Mon-Fri, 8am-4pm"
            />
          </label>
        </details>
        <details>
          <summary>
            <strong>Instructor License Info</strong>{' '}
            {complianceMissing && (
              <span style={{ color: '#e67c7c' }}>(Required)</span>
            )}
          </summary>
          <label>
            CDL Class:
            <select name="licenseClass" defaultValue={licenseClass}>
              <option value="">Select</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </label>
          <label>
            CDL License #:
            <input
              type="text"
              name="licenseNumber"
              defaultValue={licenseNumber}
            />
          </label>
          <label>
            License Expiration:
            <input type="date" name="licenseExp" defaultValue={licenseExp} />
          </label>
        </details>
        <label>
          Preferred Contact Method:
          <select name="preferredContact" defaultValue={preferredContact}>
            <option value="">Select</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="sms">SMS/Text</option>
          </select>
        </label>
        <details>
          <summary>
            <strong>Session Log</strong> (Auto-generated, read-only)
          </summary>
          <div style={{ fontSize: '0.96em' }}>{sessionLogHtml}</div>
        </details>
        <details>
          <summary>
            <strong>Feedback (optional)</strong>
          </summary>
          <textarea
            name="feedback"
            rows={3}
            defaultValue={feedback}
            placeholder="Feedback, notes, or suggestions..."
          />
        </details>
        <details>
          <summary>
            <strong>Assigned Students</strong> (readonly)
          </summary>
          <div style={{ fontSize: '0.96em' }}>{assignedStudentsHtml}</div>
        </details>
        <details>
          <summary>
            <strong>Admin Notes</strong> (staff only)
          </summary>
          <textarea
            name="adminNotes"
            rows={2}
            defaultValue={adminNotes}
            disabled
            placeholder="Visible to staff/admin only"
          />
        </details>
        <label>
          <input type="checkbox" name="active" checked={!!active} disabled />
          Active Instructor{' '}
          <span style={{ fontSize: '0.98em', color: '#888' }}>
            (Set by admin)
          </span>
        </label>
        <button
          className="btn primary wide"
          type="submit"
          style={{ background: accent, border: 'none' }}
        >
          Save Profile
        </button>
        <button
          className="btn outline"
          type="button"
          style={{ marginTop: '0.5rem' }}
          onClick={() => navigate('/instructor-dashboard')}
        >
          ⬅ Dashboard
        </button>
      </form>
    </div>
  )
}
