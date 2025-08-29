//src/admin/walkthroughs/Preview/components/SectionCard.jsx
import React from 'react'

import cls from '../WalkthroughPreview.module.css'

import StepRow from './StepRow.jsx'

export default function SectionCard({ index, section }) {
  const hasSteps = Array.isArray(section?.steps) && section.steps.length > 0
  return (
    <section className={cls.card} aria-labelledby={`sec-${index}`}>
      <div className={cls.sectionHeader}>
        <h3 id={`sec-${index}`} className={cls.sectionTitle}>
          {section?.section || `Section ${index + 1}`}
        </h3>
        <div className={cls.flags}>
          {section?.critical && (
            <span className={`${cls.badge} ${cls.badgeCrit}`}>Critical</span>
          )}
          {section?.passFail && (
            <span className={`${cls.badge} ${cls.badgeInfo}`}>Pass / Fail</span>
          )}
        </div>
      </div>

      {!hasSteps ? (
        <div className={cls.subtle}>No steps in this section.</div>
      ) : (
        <ul className={cls.list}>
          {section.steps.map((st, j) => (
            <StepRow key={j} index={j} step={st} />
          ))}
        </ul>
      )}
    </section>
  )
}
