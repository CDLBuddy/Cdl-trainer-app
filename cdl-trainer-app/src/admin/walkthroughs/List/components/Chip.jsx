//src/admin/walkthroughs/List/components/Chip.jsx
import React from 'react'

export default function Chip({ text, tone = 'neutral' }) {
  const bg =
    tone === 'ok'   ? 'rgba(16,185,129,0.12)' :
    tone === 'warn' ? 'rgba(245,158,11,0.12)' :
    tone === 'err'  ? 'rgba(239,68,68,0.12)' :
                      'rgba(107,114,128,0.12)'
  const fg =
    tone === 'ok'   ? '#065f46' :
    tone === 'warn' ? '#92400e' :
    tone === 'err'  ? '#7f1d1d' :
                      '#1f2937'
  return (
    <span style={{
      display:'inline-block', padding:'2px 8px', borderRadius:999,
      fontSize:12, lineHeight:'18px', background:bg, color:fg, whiteSpace:'nowrap'
    }}>
      {text}
    </span>
  )
}