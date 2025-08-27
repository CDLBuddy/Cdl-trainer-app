//src/admin/walkthroughs/Upload/components/JsonPanel.jsx
import React from 'react'
import cls from '../WalkthroughUpload.module.css'

export default function JsonPanel({ value, onChange, onParse }) {
  return (
    <div className={cls.card}>
      <p className={cls.help}>
        Paste <b>JSON</b>: dataset object (<code>{`{label, classCode, version, sections[]}`}</code>)
        or a bare <code>sections[]</code>.
      </p>
      <textarea
        className={cls.bigInput}
        rows={14}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'{"label":"Class A – School","classCode":"A","version":1,"sections":[{"section":"Engine Compartment","steps":[{"label":"Oil Level","script":"Check dipstick…"}]}]}'}
      />
      <div className={cls.toolbar}>
        <button type="button" className={cls.btn} onClick={onParse}>Parse JSON</button>
      </div>
    </div>
  )
}