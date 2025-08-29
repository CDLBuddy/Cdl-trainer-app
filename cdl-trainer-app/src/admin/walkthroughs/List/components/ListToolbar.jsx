//src/admin/walkthroughs/List/components/ListToolbar.jsx
import React from 'react'

import cls from '../WalkthroughList.module.css'

export default function ListToolbar({
  q,
  setQ,
  status,
  setStatus,
  klass,
  setKlass,
  source,
  setSource,
  classes = [],
}) {
  return (
    <div className={cls.controls}>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search by label, class, token, or id…"
        aria-label="Search walkthroughs"
        className={cls.input}
      />

      <select
        aria-label="Filter by status"
        value={status}
        onChange={e => setStatus(e.target.value)}
        className={cls.select}
      >
        <option value="all">All statuses</option>
        <option value="draft">Draft</option>
        <option value="in-review">In Review</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>

      <select
        aria-label="Filter by class"
        value={klass}
        onChange={e => setKlass(e.target.value)}
        className={cls.select}
      >
        {classes.map(c => (
          <option value={c} key={c}>
            {c === 'all' ? 'All classes' : c}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by source"
        value={source}
        onChange={e => setSource(e.target.value)}
        className={cls.select}
      >
        <option value="all">All sources</option>
        <option value="default">Default</option>
        <option value="school">School</option>
        <option value="custom">Custom</option>
      </select>
    </div>
  )
}
