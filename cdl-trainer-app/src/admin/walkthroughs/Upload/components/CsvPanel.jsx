//src/admin/walkthroughs/Upload/components/CsvPanel.jsx
import React from 'react'
import cls from '../WalkthroughUpload.module.css'

export default function CsvPanel({ value, onChange, onParse }) {
  return (
    <div className={cls.card}>
      <p className={cls.help}>
        Paste <b>CSV</b> with headers: <code>section, stepLabel, script, mustSay, required, passFail, skip</code>.
      </p>
      <textarea
        className={cls.bigInput}
        rows={14}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'section,stepLabel,script,mustSay,required,passFail,skip\nEngine Compartment,Oil Level,Check dipstick…,true,true,true,false'}
      />
      <div className={cls.toolbar}>
        <button type="button" className={cls.btn} onClick={onParse}>Parse CSV</button>
      </div>
    </div>
  )
}