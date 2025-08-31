// Path: src/admin/dashboard/components/InstructorScheduleCard.jsx
import PropTypes from 'prop-types'
import React, { memo } from 'react'

import useInstructorsList from '@admin/companies/add-student/hooks/useInstructorList.js'

import CalendarWidget from './calendar/CalendarWidget.jsx'

/**
 * InstructorScheduleCard
 * Thin wrapper around CalendarWidget that ensures the calendar
 * can occupy the full area of its grid cell without being clipped.
 *
 * Notes:
 * - We do NOT add our own "card" chrome here; CalendarWidget already
 *   renders a card with header/actions. Double-wrapping can cause
 *   stacking/overflow issues.
 * - The wrapper uses flex + minHeight:0 so FullCalendar (height="100%")
 *   can measure correctly inside CSS grid/flex parents.
 */
function InstructorScheduleCard({ schoolId, onExpand }) {
  const { instructors = [] } = useInstructorsList({
    withUnassigned: false,
    activeOnly: true,
    max: 500,
  })

  return (
    <div
      // Let the child stretch and avoid overflow clipping in grid/flex ancestors
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        height: '100%',
      }}
      role="region"
      aria-label="Instructor schedule calendar"
    >
      <CalendarWidget
        schoolId={schoolId}
        mode="admin"
        instructors={instructors}
        // Use full calendar (timeGridWeek) instead of compact month, to match dashboard layout
        // and avoid odd vertical sizing of "auto" month grid inside constrained cards.
        onRequestExpand={onExpand}
      />
    </div>
  )
}

InstructorScheduleCard.propTypes = {
  schoolId: PropTypes.string.isRequired,
  onExpand: PropTypes.func,
}

export default memo(InstructorScheduleCard)
