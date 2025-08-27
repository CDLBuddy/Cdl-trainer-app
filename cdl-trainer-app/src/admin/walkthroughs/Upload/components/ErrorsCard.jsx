//src/admin/walkthroughs/Upload/components/ErrorsCard.jsx
import React from 'react'
import cls from '../WalkthroughUpload.module.css'

export default function ErrorsCard({ errors = [] }) {
  if (!errors.length) return null
  return (
    <div className={`${cls.card} ${cls.errorCard}`} role="alert" aria-live="polite">
      <strong>Issues:</strong>
      <ul className={cls.errorList}>
        {errors.map((e, i) => <li key={i}>{e}</li>)}
      </ul>
    </div>
  )
}