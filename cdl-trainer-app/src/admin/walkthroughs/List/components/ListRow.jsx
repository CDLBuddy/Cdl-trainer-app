//src/admin/walkthroughs/List/components/ListRow.jsx
import React from 'react'

import { getWalkthroughLabel } from '@walkthrough-data'

import { fmtDate, statusTone, sourceFrom } from '../services/listUtils.js'
import cls from '../WalkthroughList.module.css'

import Chip from './Chip.jsx'

export default function ListRow({
  item,
  onRowKey,
  onPreview,
  onEdit,
  onSubmit,
  onDuplicate,
  onExport,
  onDelete,
}) {
  const classCode = (item.classCode || '').toUpperCase()
  const classLabel = getWalkthroughLabel?.(classCode) || classCode || '—'
  const st = item.status || 'draft'
  const src = sourceFrom(item)

  return (
    <div
      role="row"
      tabIndex={0}
      onKeyDown={e => onRowKey(e, item.id)}
      onDoubleClick={() => onPreview?.(item.id)}
      title="Double-click to preview. Press Enter to preview or E to edit."
      className={cls.row}
    >
      {/* Label + token */}
      <div title={item.id} className={cls.cellTrunc}>
        <div className={cls.label}>{item.label || '—'}</div>
        <div className={cls.subtle} aria-label="token">
          {item.token || item.id}
        </div>
      </div>

      {/* Class */}
      <div title={classCode} className={cls.cell}>
        {classLabel}
      </div>

      {/* Version */}
      <div className={cls.cell}>{item.version ?? '—'}</div>

      {/* Status + Source */}
      <div className={cls.cellChips}>
        <Chip
          text={st.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          tone={statusTone(st)}
        />
        <Chip text={(src || '').replace(/\b\w/g, c => c.toUpperCase())} />
        {item.isDefault ? <Chip text="Default" /> : null}
      </div>

      {/* Updated */}
      <div className={`${cls.cell} ${cls.subtle}`}>
        {fmtDate(item.updatedAt)}
      </div>

      {/* Actions */}
      <div className={cls.actions}>
        <button
          type="button"
          data-action="preview"
          onClick={() => onPreview?.(item.id)}
          title="Preview walkthrough"
        >
          Preview
        </button>
        <button
          type="button"
          data-action="edit"
          onClick={() => onEdit?.(item.id)}
          title="Edit walkthrough"
        >
          Edit
        </button>
        {st !== 'published' && (
          <button
            type="button"
            onClick={() => onSubmit?.(item.id)}
            title="Submit for review"
          >
            Submit
          </button>
        )}
        <button
          type="button"
          onClick={() => onDuplicate?.(item.id)}
          title="Duplicate"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => onExport?.(item.id)}
          title="Export data"
        >
          Export
        </button>
        {!item.isDefault && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Delete this walkthrough? This cannot be undone.'))
                onDelete?.(item.id)
            }}
            className={cls.danger}
            title="Delete walkthrough"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
