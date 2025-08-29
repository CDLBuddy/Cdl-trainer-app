// Path: /src/admin/walkthroughs/Preview/WalkthroughPreview.jsx

import React from 'react'

import {
  PreviewHeader,
  ProblemsList,
  SectionCard,
  StatsBar,
} from './components'
import { usePreview } from './hooks'
import cls from './WalkthroughPreview.module.css'

export default function WalkthroughPreview({ item, onClose, onSubmit }) {
  const { script, stats, validation, updatedDate } = usePreview(item)

  if (!item) {
    return (
      <div className={cls.container}>
        <div className={`${cls.card} ${cls.subtle}`} role="status">
          No walkthrough selected.
          <div style={{ marginTop: 12 }}>
            <button type="button" className={cls.btn} onClick={onClose}>
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cls.container}>
      <PreviewHeader
        item={item}
        updatedDate={updatedDate}
        onClose={onClose}
        onSubmit={onSubmit}
      />

      <StatsBar stats={stats} validation={validation} />

      {!validation.ok && <ProblemsList problems={validation.problems} />}

      {script.map((sec, i) => (
        <SectionCard
          key={`${sec.section || 'section'}-${i}`}
          index={i}
          section={sec}
        />
      ))}

      <div className={cls.footer}>
        {onSubmit && (
          <button
            type="button"
            className={cls.btnPrimary}
            onClick={() => onSubmit(item.id)}
          >
            Submit For Review
          </button>
        )}
        <button type="button" className={cls.btn} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
