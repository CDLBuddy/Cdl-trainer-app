// src/admin/dashboard/components/InstructorScheduleCard.jsx
import React from 'react'
import CalendarWidget from './calendar/CalendarWidget.jsx'
import useInstructorsList from '@admin/companies/add-student/hooks/useInstructorList.js'
import { auth } from '@utils/firebase.js'

export default function InstructorScheduleCard({ schoolId, onExpand }) {
  const { instructors = [] } = useInstructorsList({ withUnassigned: false, activeOnly: true, max: 500 })
  return (
    <CalendarWidget
      schoolId={schoolId}
      mode="admin"
      instructors={instructors}
      compact
      onRequestExpand={onExpand}
    />
  )
}