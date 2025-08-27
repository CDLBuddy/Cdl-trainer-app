//src/admin/walkthroughs/Preview/components/StepRow.jsx
import React from 'react'
import cls from '../WalkthroughPreview.module.css'

export default function StepRow({ index, step }) {
  return (
    <li className={cls.item}>
      <div className={cls.row}>
        <div className={cls.n}>{index + 1}.</div>
        <div className={cls.stepBody}>
          {step?.label && <div className={cls.stepLabel}>{step.label}</div>}
          <div className={cls.stepScript}>{step?.script}</div>
          <div className={cls.flags}>
            {step?.mustSay  && <span className={`${cls.badge} ${cls.badgePill}`}>Must Say</span>}
            {step?.required && <span className={`${cls.badge} ${cls.badgeGood}`}>Required</span>}
            {step?.passFail && <span className={`${cls.badge} ${cls.badgeInfo}`}>Pass/Fail</span>}
            {step?.skip     && <span className={`${cls.badge} ${cls.badgeWarn}`}>Skip</span>}
          </div>
        </div>
      </div>
    </li>
  )
}