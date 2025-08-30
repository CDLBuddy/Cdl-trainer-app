// Path: src/admin/dashboard/components/calendar/CalendarWidget.jsx
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import PropTypes from 'prop-types'
import React, { useMemo, useState } from 'react'

import { useToast } from '@components/useToast.js'

import styles from './CalendarWidget.module.css'
import EventEditor from './EventEditor.jsx'
import useCalendarEvents from './useCalendarEvents.js'

// Map our domain event -> FullCalendar EventInput
const mapToFC = (e) => ({
  id: e.id,
  title: e.title || '(Untitled)',
  start: e.start,
  end: e.end,
  allDay: !!e.allDay,
  extendedProps: e,
  // Fallbacks (FC props ensure color even if CSS var/attr is missed)
  backgroundColor: e.color,
  borderColor: e.color,
  textColor: '#fff',
})

export default function CalendarWidget({
  schoolId,
  mode = 'admin',
  instructorId,
  instructors = [],
  compact = false,
  onRequestExpand,
}) {
  const toast = useToast()
  const { events, loading, error, upsert, remove } = useCalendarEvents({
    schoolId,
    mode,
    instructorId,
  })
  const [editor, setEditor] = useState({ open: false, value: null })

  const fcEvents = useMemo(() => events.map(mapToFC), [events])

  const findInstructorLabel = (id) =>
    (instructors || []).find((i) => i?.value === id)?.label || ''

  const openCreateAt = (date) => {
    // dayGrid click provides a Date; default to 1h duration
    const startISO = date.toISOString()
    const endISO = new Date(date.getTime() + 60 * 60 * 1000).toISOString()
    setEditor({
      open: true,
      value: {
        title: '',
        start: startISO,
        end: endISO,
        allDay: false,
        instructorId: instructorId || '',
        instructorName: findInstructorLabel(instructorId),
        schoolId,
        status: 'confirmed',
        color: undefined, // let theme/defaults kick in unless user picks
      },
    })
  }

  return (
    <div className={styles.card} aria-busy={loading ? 'true' : 'false'}>
      <header className={styles.header}>
        <h3 className={styles.title}>
          {mode === 'admin' ? 'Instructor Schedule' : 'My Schedule'}
        </h3>
        <div className={styles.actions}>
          {error && (
            <span className={styles.err} role="status" aria-live="polite">
              {String(error)}
            </span>
          )}
          {onRequestExpand && (
            <button
              className={styles.btn}
              onClick={onRequestExpand}
              aria-label="Open full calendar"
              type="button"
            >
              Expand
            </button>
          )}
        </div>
      </header>

      <div className={compact ? styles.compact : styles.body}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={compact ? 'dayGridMonth' : 'timeGridWeek'}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          height="auto"
          stickyHeaderDates
          dayMaxEvents
          nowIndicator
          selectable={mode === 'admin'}
          selectMirror={mode === 'admin'}
          editable={mode === 'admin'}
          events={fcEvents}
          eventTimeFormat={{ hour: 'numeric', minute: '2-digit' }}
          // Create via drag/select
          select={(sel) => {
            if (mode !== 'admin') return
            setEditor({
              open: true,
              value: {
                title: '',
                start: sel.startStr,
                end: sel.endStr,
                allDay: !!sel.allDay,
                instructorId: instructorId || '',
                instructorName: findInstructorLabel(instructorId),
                schoolId,
                status: 'confirmed',
              },
            })
          }}
          // Click to view/edit
          eventClick={(info) =>
            setEditor({ open: true, value: info.event.extendedProps })
          }
          // Drag/resize save
          eventResize={(chg) => {
            if (mode !== 'admin') return
            const e = chg.event
            const ex = e.extendedProps
            upsert({
              ...ex,
              start: e.start?.toISOString(),
              end: e.end?.toISOString(),
              allDay: e.allDay,
            })
          }}
          eventDrop={(chg) => {
            if (mode !== 'admin') return
            const e = chg.event
            const ex = e.extendedProps
            upsert({
              ...ex,
              start: e.start?.toISOString(),
              end: e.end?.toISOString(),
              allDay: e.allDay,
            })
          }}
          // Quick create on empty cell
          dateClick={(arg) => {
            if (mode === 'admin') openCreateAt(arg.date)
          }}
          // Per-event color theming (works with our vendor/fullcalendar.css rules)
          eventDidMount={(info) => {
            const color = info.event.extendedProps?.color
            if (color && info.el) {
              info.el.setAttribute('data-color', color) // CSS attr() path
              info.el.style.setProperty('--evt', color) // CSS var fallback
            }
          }}
          loading={loading}
        />
      </div>

      <EventEditor
        open={editor.open}
        initial={editor.value}
        instructors={instructors}
        onClose={() => setEditor({ open: false, value: null })}
        onDelete={async (id) => {
          await remove(id)
          setEditor({ open: false, value: null })
        }}
        onSave={async (val) => {
          if (!val.title?.trim()) {
            toast.warn?.('Title is required.')
            return
          }
          if (!val.start || !val.end) {
            toast.warn?.('Start and End required.')
            return
          }
          await upsert(val)
          setEditor({ open: false, value: null })
        }}
      />
    </div>
  )
}

CalendarWidget.propTypes = {
  schoolId: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(['admin', 'instructor']),
  instructorId: PropTypes.string,
  instructors: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })
  ),
  compact: PropTypes.bool,
  onRequestExpand: PropTypes.func,
}
