// src/student/StudentChecklists.jsx
// ======================================================================
// Student Checklists
// - Pulls profile snapshot and computes progress
// - Uses correct routes (/student/...) and alias imports
// - Toast messaging via ToastContext
// - A11y: roles, aria-expanded, aria-live, keyboard toggle
// ======================================================================

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'

import { db, auth } from '@utils/firebase.js'
import { useToast } from '@components/ToastContext.js'

// Template describing sections/items we compute statuses for
const studentChecklistSectionsTemplate = [
  {
    header: 'Personal Info',
    items: [
      {
        label: 'Profile Complete',
        key: 'profileComplete',
        link: '/student/profile',
        details: 'Complete all required fields in your student profile.',
        readonly: false,
      },
    ],
  },
  {
    header: 'Permit & Docs',
    items: [
      {
        label: 'Permit Uploaded',
        key: 'permitUploaded',
        link: '/student/profile',
        details: 'Upload a clear photo of your CDL permit.',
        readonly: false,
      },
      {
        label: 'Vehicle Data Plates Uploaded',
        key: 'vehicleUploaded',
        link: '/student/profile',
        details: 'Upload photos of both your truck and trailer data plates.',
        readonly: false,
        substeps: [
          { label: 'Truck Plate', key: 'truckPlateUrl' },
          { label: 'Trailer Plate', key: 'trailerPlateUrl' },
        ],
      },
    ],
  },
  {
    header: 'Testing & Study',
    items: [
      {
        label: 'Practice Test Passed',
        key: 'practiceTestPassed',
        link: '/student/practice-tests',
        details: 'Score at least 80% on any practice test to unlock the next step.',
        readonly: false,
      },
      {
        label: 'Walkthrough Progress',
        key: 'walkthroughComplete',
        link: '/student/walkthrough',
        details: 'Start and complete your CDL vehicle inspection walkthrough.',
        readonly: false,
      },
    ],
  },
  {
    header: 'Final Certification',
    items: [
      {
        label: 'Complete in-person walkthrough and driving portion',
        key: 'finalInstructorSignoff',
        link: '',
        details: 'This final step must be marked complete by your instructor.',
        readonly: true,
      },
    ],
  },
]

// Robust email lookup
function getCurrentUserEmail() {
  try {
    return (
      window.currentUserEmail ||
      localStorage.getItem('currentUserEmail') ||
      auth.currentUser?.email ||
      null
    )
  } catch {
    return null
  }
}

export default function StudentChecklists() {
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState([])
  const [notifyItems, setNotifyItems] = useState([])
  const navigate = useNavigate()
  const { showToast } = useToast()

  // Derived % complete
  const percent = useMemo(() => {
    const flat = sections.flatMap(s => s.items)
    if (!flat.length) return 0
    const complete = flat.filter(i => i.done).length
    return Math.round((complete / flat.length) * 100)
  }, [sections])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const email = getCurrentUserEmail()
      if (!email) {
        showToast('You must be logged in to view this page.', 'error')
        navigate('/login', { replace: true })
        return
      }

      // Fetch the profile by email
      let profile = {}
      let userRole = 'student'
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)))
        if (!snap.empty) {
          profile = snap.docs[0].data()
          userRole = String(profile.role || 'student').toLowerCase()
          try { localStorage.setItem('userRole', userRole) } catch {}
        }
      } catch {
        // non-fatal
      }

      if (userRole !== 'student') {
        showToast('This checklist is only available for students.', 'error')
        navigate('/login', { replace: true })
        return
      }

      // Pull fields we care about
      const {
        cdlClass = '',
        cdlPermit = '',
        permitPhotoUrl = '',
        vehicleQualified = '',
        truckPlateUrl = '',
        trailerPlateUrl = '',
        experience = '',
        lastTestScore = 0,
        walkthroughProgress = 0,
        walkthroughComplete = false,
        finalInstructorSignoff = false,
      } = profile

      // Deep clone template so we can annotate
      const checklistSections = JSON.parse(JSON.stringify(studentChecklistSectionsTemplate))

      // Personal Info
      const profItem = checklistSections[0].items[0]
      profItem.done = !!(cdlClass && cdlPermit && experience)
      profItem.notify = !profItem.done

      // Permit & Docs
      const permitItem = checklistSections[1].items[0]
      permitItem.done = cdlPermit === 'yes' && !!permitPhotoUrl
      permitItem.notify = cdlPermit === 'yes' && !permitPhotoUrl

      const vehicleItem = checklistSections[1].items[1]
      vehicleItem.done = vehicleQualified === 'yes' && !!truckPlateUrl && !!trailerPlateUrl
      vehicleItem.notify = vehicleQualified === 'yes' && (!truckPlateUrl || !trailerPlateUrl)
      if (vehicleItem.substeps) {
        vehicleItem.substeps[0].done = !!truckPlateUrl
        vehicleItem.substeps[1].done = !!trailerPlateUrl
      }

      // Testing & Study
      const testItem = checklistSections[2].items[0]
      testItem.done = Number(lastTestScore) >= 80
      testItem.notify = !testItem.done

      const walkthroughItem = checklistSections[2].items[1]
      walkthroughItem.done = Number(walkthroughProgress) >= 1
      walkthroughItem.notify = !walkthroughItem.done

      // Final Certification
      const finalItem = checklistSections[3].items[0]
      finalItem.done = !!(walkthroughComplete || finalInstructorSignoff)
      finalItem.notify = !finalItem.done

      if (!alive) return
      setSections(checklistSections)
      setNotifyItems(checklistSections.flatMap(s => s.items).filter(i => i.notify))
      setLoading(false)
    })()

    return () => { alive = false }
  }, [navigate, showToast])

  if (loading) {
    return (
      <div className="loading-container" role="status" aria-live="polite">
        <div className="spinner" />
        <p>Loading your checklist…</p>
      </div>
    )
  }

  return (
    <div className="checklist-page container fade-in">
      <h2 className="dash-head">
        📋 Student Checklist <span className="role-badge student">Student</span>
      </h2>

      {notifyItems.length > 0 && (
        <div className="checklist-alert-banner" role="alert" aria-live="polite">
          ⚠️ You have steps that need attention before you can complete your training.
        </div>
      )}

      <div className="progress-track" aria-label="Completion progress">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
        <span className="progress-label" aria-live="polite">
          {percent}% Complete
        </span>
      </div>

      {percent === 100 && (
        <div className="completion-badge" aria-live="polite">
          🎉 All steps complete! Ready for certification.
        </div>
      )}

      {sections.map((section, i) => (
        <div className="checklist-section" key={section.header}>
          <h3 className="checklist-section-header">{section.header}</h3>
          <ul className="checklist-list">
            {section.items.map((item, idx) => (
              <ChecklistItem
                key={item.key}
                item={item}
                sectionIdx={i}
                itemIdx={idx}
                onAction={() => item.link && navigate(item.link)}
              />
            ))}
          </ul>
        </div>
      ))}

      <button className="btn wide" onClick={() => navigate('/student/dashboard')}>
        ⬅ Back to Dashboard
      </button>
    </div>
  )
}

function ChecklistItem({ item, onAction, sectionIdx, itemIdx }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <li
      className={`checklist-item${item.done ? ' done' : ''}${item.readonly ? ' readonly' : ''}${expanded ? ' expanded' : ''}`}
      aria-current={item.notify && !item.done && !item.readonly ? 'step' : undefined}
    >
      {item.notify && !item.done && !item.readonly && (
        <span className="notify-bubble" title="This step needs attention">!</span>
      )}

      <div
        className="checklist-item-main"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`details-${sectionIdx}-${itemIdx}`}
        onClick={() => setExpanded(ex => !ex)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded(ex => !ex)
          }
        }}
      >
        <span className="checklist-label">{item.label}</span>
        <span className="chevron">{expanded ? '▾' : '▸'}</span>

        {item.done ? (
          <span className="badge badge-success" aria-label="Complete">✔</span>
        ) : item.readonly ? (
          <span className="badge badge-waiting" title="Instructor must complete">🔒</span>
        ) : (
          <button
            className="btn outline btn-sm"
            onClick={e => {
              e.stopPropagation()
              onAction?.()
            }}
          >
            Complete
          </button>
        )}
      </div>

      <div id={`details-${sectionIdx}-${itemIdx}`} className="checklist-details" aria-hidden={!expanded}>
        {item.details}
        {item.substeps && (
          <ul className="substeps">
            {item.substeps.map(ss => (
              <li key={ss.key} className={ss.done ? 'done' : ''}>
                {ss.done ? '✅' : '❗'} {ss.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}