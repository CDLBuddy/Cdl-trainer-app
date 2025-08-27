//src/admin/walkthroughs/Upload/components/MarkdownPanel.jsx
import React from 'react'
import cls from '../WalkthroughUpload.module.css'

export default function MarkdownPanel({ value, onChange, onParse }) {
  return (
    <div className={cls.card}>
      <p className={cls.help}>
        Paste <b>Markdown</b> (<code>## Section</code> headings, <code>-</code> steps).
        Flags: <code>[must]</code> <code>[required]</code> <code>[pf]</code> <code>[skip]</code>.
      </p>
      <textarea
        className={cls.bigInput}
        rows={14}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'## Engine Compartment\n- **Oil Level:** Check dipstick… [must] [required] [pf]'}
      />
      <div className={cls.toolbar}>
        <button type="button" className={cls.btn} onClick={onParse}>Parse Markdown</button>
      </div>
    </div>
  )
}