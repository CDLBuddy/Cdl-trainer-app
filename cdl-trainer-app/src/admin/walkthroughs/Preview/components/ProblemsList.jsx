//src/admin/walkthroughs/Preview/components/ProblemsList.jsx
import React from 'react'
import cls from '../WalkthroughPreview.module.css'

export default function ProblemsList({ problems = [] }) {
  if (!problems.length) return null
  return (
    <div className={`${cls.card} ${cls.problemCard}`}>
      <div className={cls.problemTitle}>Issues to review</div>
      <ul className={cls.problemList}>
        {problems.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
  )
}