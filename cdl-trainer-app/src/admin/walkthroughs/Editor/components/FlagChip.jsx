//src/admin/walkthroughs/Editor/components/FlagChip.jsx
import React from 'react'

import cls from '../WalkthroughEditor.module.css'

export default function FlagChip({ label, checked, onChange }) {
  return (
    <label className={cls.chip}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        aria-label={label}
      />
      <span>{label}</span>
    </label>
  )
}
