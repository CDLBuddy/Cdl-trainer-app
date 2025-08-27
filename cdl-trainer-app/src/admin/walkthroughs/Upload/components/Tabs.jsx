//src/admin/walkthroughs/Upload/components/Tabs.jsx
import React from 'react'
import cls from '../WalkthroughUpload.module.css'

const items = ['markdown', 'csv', 'xlsx', 'json']

export default function Tabs({ value, onChange }) {
  return (
    <div className={cls.tabs}>
      {items.map((t) => (
        <button
          key={t}
          type="button"
          className={`${cls.tab} ${value === t ? cls.tabActive : ''}`}
          aria-pressed={value === t}
          onClick={() => onChange(t)}
        >
          {t.toUpperCase()}
        </button>
      ))}
    </div>
  )
}