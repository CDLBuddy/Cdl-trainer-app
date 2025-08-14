// src/student/profile/sections/CdlSection.jsx
import React, { useMemo, useCallback } from 'react'
import Field from '../ui/Field.jsx'
import Select from '../ui/Select.jsx'
import CheckboxGroup from '../ui/CheckboxGroup.jsx'
import styles from './sections.module.css'

const ENDORSEMENT_OPTIONS = [
  { value: 'H',        label: 'Hazmat (H)' },
  { value: 'N',        label: 'Tanker (N)' },
  { value: 'T',        label: 'Double/Triple (T)' },
  { value: 'P',        label: 'Passenger (P)' },
  { value: 'S',        label: 'School Bus (S)' },
  { value: 'AirBrakes',label: 'Air Brakes' },
  { value: 'Other',    label: 'Other' },
]

const RESTRICTION_OPTIONS = [
  { value: 'auto',      label: 'Remove Automatic Restriction' },
  { value: 'airbrake',  label: 'Remove Air Brake Restriction' },
  { value: 'refresher', label: 'One-day Refresher' },
  { value: 'roadtest',  label: 'Road Test Prep' },
]

const CDL_OPTIONS = [
  { value: '',               label: 'Select class…' },
  { value: 'A',              label: 'Class A' },
  { value: 'A-WO-AIR-ELEC',  label: 'Class A w/o Air/Electric' },
  { value: 'A-WO-HYD-ELEC',  label: 'Class A w/o Hydraulic/Electric' },
  { value: 'B',              label: 'Class B' },
  { value: 'PASSENGER-BUS',  label: 'Passenger Bus' },
]

export default function CdlSection({ value, onChange, onToggle }) {
  const v = value ?? {}

  const endorsements = useMemo(
    () => (Array.isArray(v.endorsements) ? v.endorsements : []),
    [v.endorsements]
  )
  const restrictions = useMemo(
    () => (Array.isArray(v.restrictions) ? v.restrictions : []),
    [v.restrictions]
  )

  const endoCount = endorsements.length
  const restCount = restrictions.length

  // Safe wrappers so we don’t explode if a handler is missing
  const setField = useCallback(
    (key, val) => onChange?.(key, val),
    [onChange]
  )
  const toggleInArray = useCallback(
    (key, val) => onToggle?.(key, val),
    [onToggle]
  )

  // Small, context-aware hint for CDL class
  const classHint = useMemo(() => {
    if (!v.cdlClass) return 'Choose the CDL class you are pursuing.'
    if (v.cdlClass === 'A') return 'Class A covers combination vehicles (tractor-trailer).'
    if (v.cdlClass === 'B') return 'Class B covers single vehicles (e.g., buses, box trucks).'
    return 'Make sure this matches what your instructor/school expects.'
  }, [v.cdlClass])

  return (
    <section className={styles.section} aria-labelledby="cdl-h3">
      <header className={styles.header}>
        <h3 id="cdl-h3" className={styles.title}>🚚 CDL Details</h3>
        <div className={styles.sub}>Class, endorsements & experience</div>
      </header>

      <div className={styles.grid2}>
        <Select
          label="CDL Class"
          required
          value={v.cdlClass || ''}
          onChange={val => setField('cdlClass', val)}
          options={CDL_OPTIONS}
          hint={classHint}
        />

        <Select
          label="Experience"
          required
          value={v.experience || ''}
          onChange={val => setField('experience', val)}
          options={[
            { value: '',    label: 'Select…' },
            { value: 'none',label: 'No Experience' },
            { value: '1-2', label: '1–2 Years' },
            { value: '3-5', label: '3–5 Years' },
            { value: '6-10',label: '6–10 Years' },
            { value: '10+', label: '10+ Years' },
          ]}
          hint="Rough estimate is fine—this helps tailor your study flow."
        />
      </div>

      <div className={styles.grid}>
        <CheckboxGroup
          label={`Endorsements${endoCount ? ` • ${endoCount}` : ''}`}
          values={endorsements}
          options={ENDORSEMENT_OPTIONS}
          onToggle={val => toggleInArray('endorsements', val)}
          hint="Select any endorsements you plan to pursue."
        />
        <CheckboxGroup
          label={`Restrictions / Programs${restCount ? ` • ${restCount}` : ''}`}
          values={restrictions}
          options={RESTRICTION_OPTIONS}
          onToggle={val => toggleInArray('restrictions', val)}
          hint="Pick any add-ons or programs that apply to you."
        />
      </div>
    </section>
  )
}