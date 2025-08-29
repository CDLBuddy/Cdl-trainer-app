//src/admin/walkthroughs/Preview/components/StatsBar.jsx
import React from 'react'

import cls from '../WalkthroughPreview.module.css'

export default function StatsBar({ stats, validation }) {
  return (
    <div className={`${cls.card} ${cls.statsBar}`}>
      <div className={cls.stat}>
        <b>{stats.sections}</b>
        <span>sections</span>
      </div>
      <div className={cls.stat}>
        <b>{stats.steps}</b>
        <span>steps</span>
      </div>
      <div className={cls.stat}>
        <b>{stats.required}</b>
        <span>required</span>
      </div>
      <div className={cls.stat}>
        <b>{stats.passFail}</b>
        <span>pass/fail</span>
      </div>
      <div className={cls.flex} />
      <span
        className={`${cls.badge} ${validation.ok ? cls.badgeGood : cls.badgeBad}`}
        aria-live="polite"
      >
        {validation.ok ? 'Looks good' : `${validation.problems.length} issues`}
      </span>
    </div>
  )
}
