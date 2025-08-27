//src/admin/walkthroughs/Upload/components/StatsBar.jsx
import React from 'react'
import cls from '../WalkthroughUpload.module.css'

export default function StatsBar({ stats }) {
  return (
    <div className={`${cls.card} ${cls.statsBar}`}>
      <div className={cls.stat}><b>{stats.sections}</b><span>sections</span></div>
      <div className={cls.stat}><b>{stats.steps}</b><span>steps</span></div>
      <div className={cls.stat}><b>{stats.required}</b><span>required</span></div>
      <div className={cls.stat}><b>{stats.passFail}</b><span>pass/fail</span></div>
      <div className={cls.flex} />
      <span className={cls.subtle}>Parsed preview only — use “Import” to create a draft.</span>
    </div>
  )
}