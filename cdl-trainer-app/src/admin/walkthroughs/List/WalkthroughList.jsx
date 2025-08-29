// Path: /src/admin/walkthroughs/List/WalkthroughList.jsx
// WalkthroughList (admin) — composition shell
import React from 'react'

import { ListHeader, ListRow, ListToolbar } from './components'
import { useWalkthroughList } from './hooks'
import cls from './WalkthroughList.module.css'

export default function WalkthroughList({
  items = [],
  loading = false,
  onPreview,
  onEdit,
  onSubmit,
  onDuplicate,
  onExport,
  onDelete,
}) {
  const {
    q,
    setQ,
    status,
    setStatus,
    klass,
    setKlass,
    source,
    setSource,
    classes,
    sortKey,
    sortDir,
    setSort,
    filtered,
    onRowKey,
  } = useWalkthroughList(items)

  return (
    <div className={cls.container}>
      <h2 className={cls.title}>Walkthroughs</h2>

      <ListToolbar
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        klass={klass}
        setKlass={setKlass}
        source={source}
        setSource={setSource}
        classes={classes}
      />

      <div role="table" aria-label="Walkthroughs table" className={cls.table}>
        <ListHeader sortKey={sortKey} sortDir={sortDir} setSort={setSort} />

        {loading ? (
          <div className={cls.loading}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className={cls.empty}>No walkthroughs match your filters.</div>
        ) : (
          filtered.map(it => (
            <ListRow
              key={it.id}
              item={it}
              onRowKey={onRowKey}
              onPreview={onPreview}
              onEdit={onEdit}
              onSubmit={onSubmit}
              onDuplicate={onDuplicate}
              onExport={onExport}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
