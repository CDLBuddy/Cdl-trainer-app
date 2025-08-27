//src/admin/walkthroughs/Editor/components/EditorTabs.jsx
import React, { memo } from 'react'
import cls from '../WalkthroughEditor.module.css'

export default memo(function EditorTabs({ active, onChange }) {
  const tabs = ['visual', 'markdown', 'csv', 'upload', 'json']
  return (
    <div className={cls.tabs} role="tablist" aria-label="Editor modes">
      {tabs.map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={active === t}
          className={`${cls.tab} ${active === t ? cls.tabActive : ''}`}
          onClick={() => onChange(t)}
          type="button"
        >
          {t === 'visual' ? 'Visual' :
           t === 'markdown' ? 'Markdown' :
           t === 'csv' ? 'CSV' :
           t === 'upload' ? 'XLSX Upload' : 'JSON'}
        </button>
      ))}
    </div>
  )
})