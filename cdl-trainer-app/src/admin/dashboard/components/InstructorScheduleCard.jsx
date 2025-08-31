// Path: src/admin/dashboard/components/InstructorScheduleCard.jsx
import PropTypes from 'prop-types'
import React, { memo, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import useInstructorsList from '@admin/companies/add-student/hooks/useInstructorList.js'

import CalendarWidget from './calendar/CalendarWidget.jsx'

/**
 * InstructorScheduleCard
 * - Dashboard widget version of the calendar (compact)
 * - Provides a full-screen modal "Expand" with the same CalendarWidget (non-compact)
 * - No external CSS; inline styles ensure correct height behavior inside grid/flex parents
 */
function InstructorScheduleCard({ schoolId, onExpand }) {
  const { instructors = [] } = useInstructorsList({
    withUnassigned: false,
    activeOnly: true,
    max: 500,
  })

  const [expanded, setExpanded] = useState(false)
  const [instructorId, setInstructorId] = useState('')
  const closeBtnRef = useRef(null)

  const selectedLabel = useMemo(
    () => instructors.find(i => i?.value === instructorId)?.label || '(All instructors)',
    [instructorId, instructors]
  )
  // Prevent body scroll while modal is open
  useEffect(() => {
    if (!expanded) return
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    // Focus the close button for accessibility
    closeBtnRef.current?.focus()
    return () => {
      document.documentElement.style.overflow = prev
    }
  }, [expanded])

  const openExpanded = () => {
    onExpand?.() // optional: notify parent if they care
    setExpanded(true)
  }

  const closeExpanded = () => setExpanded(false)

  return (
    <div
      // Allow child to stretch inside dashboard grid/flex
      style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, height: '100%' }}
      role="region"
      aria-label="Instructor schedule calendar"
    >
      {/* Compact widget on dashboard */}
      <CalendarWidget
        schoolId={schoolId}
        mode="admin"
        instructors={instructors}
        compact
        onRequestExpand={openExpanded}   // <- enables the "Expand" button in the widget header
      />

      {/* Full-screen modal overlay (same widget, non-compact + filter) */}
      {expanded &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Expanded instructor schedule"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'color-mix(in oklab, #000, transparent 25%)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal chrome */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: 12,
                borderBottom: '1px solid rgba(255,255,255,.12)',
                background: 'var(--card-bg, rgba(11,15,20,.92))',
                color: 'var(--text-light, #fff)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <strong style={{ fontSize: '1.05rem' }}>Instructor Schedule</strong>
                <label htmlFor="inst-filter" style={{ fontWeight: 600 }}>Instructor:</label>
                <select
                  id="inst-filter"
                  value={instructorId}
                  onChange={(e) => setInstructorId(e.target.value)}
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
                  {instructors.map(i => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
                <span aria-live="polite" style={{ opacity: .85 }}>{selectedLabel}</span>
                <button
                  type="button"
                  ref={closeBtnRef}
                  onClick={closeExpanded}
                  onKeyDown={(e) => e.key === 'Escape' && closeExpanded()}
                  style={{
                    appearance: 'none',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'transparent',
                    color: 'inherit',
                    border: '1px solid rgba(255,255,255,.25)',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Calendar container — must stretch */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <CalendarWidget
                  key={instructorId || 'all'}   // reflow cleanly when filter changes
                  schoolId={schoolId}
                  mode="admin"
                  instructors={instructors}
                  instructorId={instructorId || undefined}
                  compact={false}               // full calendar in expanded view
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

InstructorScheduleCard.propTypes = {
  schoolId: PropTypes.string.isRequired,
  onExpand: PropTypes.func, // optional notification hook; not required
}

export default memo(InstructorScheduleCard)
