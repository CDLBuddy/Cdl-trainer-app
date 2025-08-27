//src/admin/walkthroughs/Upload/components/XlsxPanel.jsx
import React from 'react'
import cls from '../WalkthroughUpload.module.css'

export default function XlsxPanel({ busy, name, onChoose }) {
  return (
    <div className={cls.card}>
      <p className={cls.help}>
        Upload <b>.xlsx</b>. First sheet should match the CSV headers. Works with a <code>rows[]</code> result or <code>{'{'}sections{'}'}</code>.
      </p>
      <div className={cls.fileRow}>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => onChoose(e.target.files?.[0] || null)}
        />
        {name && <span className={cls.subtle}>{name}</span>}
        {busy && <span className={cls.subtle}>Parsing…</span>}
      </div>
    </div>
  )
}