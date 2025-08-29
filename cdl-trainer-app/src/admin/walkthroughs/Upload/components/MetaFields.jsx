//src/admin/walkthroughs/Upload/components/MetaFields.jsx
import React from 'react'

import { normalizeClassCode } from '../services'
import cls from '../WalkthroughUpload.module.css'

export default function MetaFields({
  label,
  classCode,
  version,
  onLabel,
  onClassCode,
  onVersion,
}) {
  return (
    <div className={cls.metaGrid}>
      <label className={cls.metaField}>
        <span className={cls.metaLabel}>Label</span>
        <input
          className={cls.input}
          value={label}
          onChange={e => onLabel(e.target.value)}
          placeholder="Optional label (e.g., “East Campus – Class A”)"
        />
      </label>
      <label className={cls.metaField}>
        <span className={cls.metaLabel}>Class</span>
        <select
          className={cls.input}
          value={classCode}
          onChange={e => onClassCode(normalizeClassCode(e.target.value))}
        >
          <option value="A">Class A</option>
          <option value="B">Class B</option>
          <option value="PASSENGER-BUS">Passenger Bus</option>
        </select>
      </label>
      <label className={cls.metaField}>
        <span className={cls.metaLabel}>Version</span>
        <input
          className={cls.input}
          type="number"
          min={1}
          value={version}
          onChange={e => onVersion(Number(e.target.value || 1))}
        />
      </label>
    </div>
  )
}
