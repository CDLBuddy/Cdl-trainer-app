//src/admin/walkthroughs/List/components/ListHeader.jsx
import React from 'react'

import cls from '../WalkthroughList.module.css'

export default function ListHeader({ sortKey, sortDir, setSort }) {
  const arrow = k => (sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '')
  return (
    <div role="row" className={cls.headerRow}>
      <button
        type="button"
        onClick={() => setSort('label')}
        className={cls.hcellBtn}
        title="Sort by label"
      >
        Label {arrow('label')}
      </button>
      <button
        type="button"
        onClick={() => setSort('classCode')}
        className={cls.hcellBtn}
        title="Sort by class"
      >
        Class {arrow('classCode')}
      </button>
      <button
        type="button"
        onClick={() => setSort('version')}
        className={cls.hcellBtn}
        title="Sort by version"
      >
        Version {arrow('version')}
      </button>
      <span className={cls.hcellStatic}>Status / Source</span>
      <button
        type="button"
        onClick={() => setSort('updatedAt')}
        className={cls.hcellBtn}
        title="Sort by last update"
      >
        Updated {arrow('updatedAt')}
      </button>
      <span className={cls.hcellStatic}>Actions</span>
    </div>
  )
}
