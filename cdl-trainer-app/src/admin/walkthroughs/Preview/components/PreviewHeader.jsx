//src/admin/walkthroughs/Preview/components/PreviewHeader.jsx
import React from 'react'

import cls from '../WalkthroughPreview.module.css'

export default function PreviewHeader({
  item,
  updatedDate,
  onClose,
  onSubmit,
}) {
  const status = String(item?.status || 'draft')
  const statusClass =
    status === 'published'
      ? cls.badgeOk
      : status === 'in-review'
        ? cls.badgeDark
        : cls.badgeNeutral

  return (
    <div className={cls.header}>
      <h2 className={cls.title}>{item?.label || 'Walkthrough Preview'}</h2>
      <span className={`${cls.badge} ${statusClass}`}>
        {status.replace('-', ' ')}
      </span>
      <span className={`${cls.badge} ${cls.badgePill}`}>
        {item?.classCode || '—'}
      </span>
      <span className={cls.meta}>
        v{Number(item?.version || 1)} •{' '}
        {updatedDate ? updatedDate.toLocaleString() : '—'}
      </span>
      <div className={cls.toolbar}>
        {onSubmit && (
          <button
            type="button"
            className={cls.btnWarn}
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
