// Path: src/admin/schedule/AdminSchedule.jsx
// ======================================================================
// Admin • Schedule (full screen)
// - Uses the same CalendarWidget, non-compact
// - Lets admins filter by instructor or view all
// - Layout hardened so FullCalendar can fill available height
// ======================================================================

import React, { Suspense, useMemo, useState } from 'react'

import Shell from '@components/Shell.jsx'

import { useInstructorOptions } from '@admin/companies/add-student/hooks'
import { useAuthSchoolGuard } from '@admin/dashboard/hooks'

const CalendarWidget = React.lazy(() =>
  import('@admin/dashboard/components/calendar/CalendarWidget.jsx')
)

export default function AdminSchedule() {
  const { schoolId } = useAuthSchoolGuard()
  const { options: instructors = [], loading } = useInstructorOptions({
    schoolId,
    activeOnly: true,
    withUnassigned: true,
    max: 400,
  })
  const [instructorId, setInstructorId] = useState('')

  const selectedLabel = useMemo(
    () =>
      instructors.find((i) => i.value === instructorId)?.label ||
      '(All instructors)',
    [instructorId, instructors]
  )

  return (
    <Shell title="Schedule">
      {/* Outer container must allow children to grow: flex + minHeight:0 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          gap: 12,
        }}
      >
        {/* Filters (non-flexing header) */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label htmlFor="instructor-filter" style={{ fontWeight: 600 }}>
              Instructor:
            </label>
            <select
              id="instructor-filter"
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
              disabled={loading}
              style={{
                minWidth: 220,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--card-bg,#0b0f14)',
                color: 'inherit',
                border: '1px solid rgba(255,255,255,.18)',
              }}
            >
              <option value="">(All)</option>
              {instructors.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
            <span className="u-muted" aria-live="polite">
              {selectedLabel}
            </span>
          </div>
        </div>

        {/* Calendar region: the element that must stretch */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <Suspense
            fallback={
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                Loading calendar…
              </div>
            }
          >
            {/* Wrapper ensures the lazy child gets a 100% height box */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <CalendarWidget
                key={instructorId || 'all'} // reflow cleanly when filter changes
                schoolId={schoolId}
                mode="admin"
                instructors={instructors}
                instructorId={instructorId || undefined}
                compact={false}
              />
            </div>
          </Suspense>
        </div>
      </div>
    </Shell>
  )
}
