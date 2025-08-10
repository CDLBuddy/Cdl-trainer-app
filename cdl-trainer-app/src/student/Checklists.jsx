// src/student/StudentChecklists.jsx
import { collection, query, where, getDocs } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { db, auth } from '@utils/firebase.js'
import { showToast } from '@utils/ui-helpers.js'

const studentChecklistSectionsTemplate = [
  {
    header: 'Personal Info',
    items: [
      {
        label: 'Profile Complete',
        key: 'profileComplete',
        link: '/student-profile',
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
        link: '/student-profile',
        details: 'Upload a clear photo of your CDL permit.',
        readonly: false,
      },
      {
        label: 'Vehicle Data Plates Uploaded',
        key: 'vehicleUploaded',
        link: '/student-profile',
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
        link: '/student-practice-tests',
        details:
          'Score at least 80% on any practice test to unlock the next step.',
        readonly: false,
      },
      {
        label: 'Walkthrough Progress',
        key: 'walkthroughComplete',
        link: '/student-walkthrough',
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

export default function StudentChecklists() {
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState([])
  const [percent, setPercent] = useState(0)
  const [notifyItems, setNotifyItems] = useState([])
  const navigate = useNavigate()

  function getCurrentUserEmail() {
    return (
      window.currentUserEmail ||
      localStorage.getItem('currentUserEmail') ||
      (auth.currentUser && auth.currentUser.email) ||
      null
    )
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const email = getCurrentUserEmail()
      if (!email) {
        showToast('You must be logged in to view this page.', 2800, 'error')
        navigate('/login')
        return
      }

      // Get profile
      let profile = {}
      let userRole = 'student'
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), where('email', '==', email))
        )
        if (!snap.empty) {
          profile = snap.docs[0].data()
          userRole = profile.role || 'student'
          localStorage.setItem('userRole', userRole)
        }
      } catch {}
      if (userRole !== 'student') {
        showToast(
          'This checklist is only available for students.',
          2600,
          'error'
        )
        navigate('/login')
        return
      }

      // Compute checklist
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

      const checklistSections = JSON.parse(
        JSON.stringify(studentChecklistSectionsTemplate)
      )

      checklistSections[0].items[0].done = !!(
        cdlClass &&
        cdlPermit &&
        experience
      )
      checklistSections[0].items[0].notify = !checklistSections[0].items[0].done

      checklistSections[1].items[0].done =
        cdlPermit === 'yes' && !!permitPhotoUrl
      checklistSections[1].items[0].notify =
        cdlPermit === 'yes' && !permitPhotoUrl

      checklistSections[1].items[1].done =
        vehicleQualified === 'yes' && !!truckPlateUrl && !!trailerPlateUrl
      checklistSections[1].items[1].notify =
        vehicleQualified === 'yes' && (!truckPlateUrl || !trailerPlateUrl)

      if (checklistSections[1].items[1].substeps) {
        checklistSections[1].items[1].substeps[0].done = !!truckPlateUrl
        checklistSections[1].items[1].substeps[1].done = !!trailerPlateUrl
      }

      checklistSections[2].items[0].done = lastTestScore >= 80
      checklistSections[2].items[0].notify = lastTestScore < 80

      checklistSections[2].items[1].done = walkthroughProgress >= 1
      checklistSections[2].items[1].notify = walkthroughProgress < 1

      checklistSections[3].items[0].done =
        walkthroughComplete || finalInstructorSignoff
      checklistSections[3].items[0].notify = !checklistSections[3].items[0].done

      const flat = checklistSections.flatMap(sec => sec.items)
      const complete = flat.filter(x => x.done).length
      const pct = Math.round((complete / flat.length) * 100)

      setSections(checklistSections)
      setPercent(pct)
      setNotifyItems(flat.filter(x => x.notify))
      setLoading(false)
    }

    fetchData()
    // eslint-disable-next-line
  }, [])

  if (loading) {
    return (
      <div className="loading-container">
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
          ⚠️ You have steps that need attention before you can complete your
          training.
        </div>
      )}

      <div className="progress-track">
        <div className="progress-fill" style={{ width: percent + '%' }}></div>
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

      <button
        className="btn wide"
        onClick={() => navigate('/student-dashboard')}
      >
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
      aria-current={
        item.notify && !item.done && !item.readonly ? 'step' : undefined
      }
      tabIndex={0}
      onKeyUp={e =>
        (e.key === 'Enter' || e.key === ' ') && setExpanded(ex => !ex)
      }
    >
      {item.notify && !item.done && !item.readonly && (
        <span className="notify-bubble" title="This step needs attention">
          !
        </span>
      )}
      <div
        className="checklist-item-main"
        role="button"
        aria-expanded={expanded}
        aria-controls={`details-${sectionIdx}-${itemIdx}`}
        onClick={() => setExpanded(ex => !ex)}
      >
        <span className="checklist-label">{item.label}</span>
        <span className="chevron">{expanded ? '▾' : '▸'}</span>
        {item.done ? (
          <span className="badge badge-success" aria-label="Complete">
            ✔
          </span>
        ) : item.readonly ? (
          <span
            className="badge badge-waiting"
            title="Instructor must complete"
          >
            🔒
          </span>
        ) : (
          <button
            className="btn outline btn-sm"
            onClick={e => {
              e.stopPropagation()
              onAction()
            }}
          >
            Complete
          </button>
        )}
      </div>
      <div
        id={`details-${sectionIdx}-${itemIdx}`}
        className="checklist-details"
        aria-hidden={!expanded}
      >
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
